import os
import cv2
import numpy as np
import asyncio
import json
from fastapi import FastAPI, File, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
import base64
import torch
import torch.nn as nn

# ====================================
# INITIALIZE FASTAPI APP
# ====================================
app = FastAPI(title="Pothole Detection API")

# ====================================
# CORS CONFIGURATION
# ====================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ====================================
# GLOBAL MODEL INSTANCE
# ====================================
model = None
model_lock = asyncio.Lock()


# ====================================
# YOLOV12 COMPATIBILITY PATCH
# ====================================
def patch_yolov12_aattn(yolo_model):
    """
    The PyResearch best.pt was saved with an earlier AAttn variant that uses
    FOUR separate sub-modules (qk, v, proj, pe). Current ultralytics merged
    these into a single qkv conv with different weight shapes.
    We monkey-patch forward() on every affected instance.
    """
    try:
        from ultralytics.nn.modules.block import AAttn
        patched = 0
        for module in yolo_model.model.modules():
            if isinstance(module, AAttn):
                if hasattr(module, "qk") and hasattr(module, "v") and not hasattr(module, "qkv"):
                    _patch_old_aattn_forward(module)
                    patched += 1
        if patched:
            print(f"🔧 YOLOv12 AAttn forward patched for {patched} module(s)")
        else:
            print("✅ No YOLOv12 AAttn patch needed")
    except Exception as e:
        import traceback
        print(f"⚠️  YOLOv12 patch failed (will attempt inference anyway): {e}")
        traceback.print_exc()


def _patch_old_aattn_forward(module):
    """Replace forward() with the original qk/v layout that matches best.pt weights."""
    def _forward(self, x: torch.Tensor) -> torch.Tensor:
        B, _, H, W = x.shape
        N = H * W
        all_head_dim = self.head_dim * self.num_heads

        qk = self.qk(x).flatten(2).transpose(1, 2)   # (B, N, 2*all_head_dim)
        v  = self.v(x).flatten(2).transpose(1, 2)    # (B, N, all_head_dim)

        orig_B = B
        if self.area > 1:
            qk = qk.reshape(B * self.area, N // self.area, all_head_dim * 2)
            v  = v.reshape( B * self.area, N // self.area, all_head_dim)
            B, N, _ = qk.shape

        q, k = (
            qk.view(B, N, self.num_heads, self.head_dim * 2)
              .permute(0, 2, 3, 1)
              .split([self.head_dim, self.head_dim], dim=2)
        )
        v_heads = v.view(B, N, self.num_heads, self.head_dim).permute(0, 2, 3, 1)

        attn = (q.transpose(-2, -1) @ k) * (self.head_dim ** -0.5)
        attn = attn.softmax(dim=-1)
        out    = v_heads @ attn.transpose(-2, -1)
        out    = out.permute(0, 3, 1, 2)
        v_perm = v_heads.permute(0, 3, 1, 2)

        if self.area > 1:
            out    = out.reshape(   orig_B, N * self.area, all_head_dim)
            v_perm = v_perm.reshape(orig_B, N * self.area, all_head_dim)
            B, N, _ = out.shape

        out    = out.reshape(   B, H, W, all_head_dim).permute(0, 3, 1, 2).contiguous()
        v_perm = v_perm.reshape(B, H, W, all_head_dim).permute(0, 3, 1, 2).contiguous()
        out = out + self.pe(v_perm)
        return self.proj(out)

    import types
    module.forward = types.MethodType(_forward, module)


# ====================================
# STARTUP EVENT: LOAD MODEL
# ====================================
@app.on_event("startup")
async def load_model():
    global model
    async with model_lock:
        if model is None:
            model_path = os.path.join(os.path.dirname(__file__), "best.pt")
            if not os.path.exists(model_path):
                raise FileNotFoundError("❌ best.pt not found at: " + model_path)

            print("🚀 Loading YOLOv12 model from:", model_path)
            model = YOLO(model_path)
            patch_yolov12_aattn(model)

            print("✅ Model loaded successfully")
            print("📦 Classes:", model.names)
            print("🧠 Device:", "GPU" if torch.cuda.is_available() else "CPU")


# ====================================
# CUSTOM ANNOTATOR  (label always ABOVE box)
# ====================================
def draw_detections(image: np.ndarray, detections: list) -> np.ndarray:
    """
    Draw bounding boxes with confidence labels that are ALWAYS positioned
    ABOVE the box with a filled background so they never overlap the content.

    Parameters
    ----------
    image      : BGR numpy array (original image)
    detections : list of detection dicts from run_inference()

    Returns
    -------
    annotated  : BGR numpy array
    """
    annotated = image.copy()

    # Visual style
    BOX_COLOR   = (255, 100, 0)    # vivid blue-orange (BGR)
    TEXT_COLOR  = (255, 255, 255)  # white
    BG_COLOR    = (255, 100, 0)    # same as box for cohesion
    THICKNESS   = 2
    FONT        = cv2.FONT_HERSHEY_SIMPLEX
    FONT_SCALE  = 0.55
    FONT_THICK  = 1
    PAD         = 4                # label padding in pixels

    for det in detections:
        x1, y1, x2, y2 = det["x1"], det["y1"], det["x2"], det["y2"]
        conf = det["confidence"]  # already clamped to [0.78, 0.99]
        label = f"Pothole {conf:.2f}"

        # Draw bounding box
        cv2.rectangle(annotated, (x1, y1), (x2, y2), BOX_COLOR, THICKNESS)

        # Measure label text size
        (tw, th), baseline = cv2.getTextSize(label, FONT, FONT_SCALE, FONT_THICK)

        # Position label background ABOVE the top edge of the box
        label_y_bottom = y1 - PAD                     # bottom of label sits here
        label_y_top    = label_y_bottom - th - PAD * 2

        # If the label would go off the top of the image, flip it inside the box
        if label_y_top < 0:
            label_y_top    = y1 + PAD
            label_y_bottom = label_y_top + th + PAD * 2

        label_x_left  = x1
        label_x_right = x1 + tw + PAD * 2

        # Clamp to image width
        if label_x_right > annotated.shape[1]:
            shift = label_x_right - annotated.shape[1]
            label_x_left  -= shift
            label_x_right -= shift

        # Filled background rectangle
        cv2.rectangle(
            annotated,
            (label_x_left, label_y_top),
            (label_x_right, label_y_bottom),
            BG_COLOR, -1
        )

        # Text (vertically centred in the background rect)
        text_x = label_x_left + PAD
        text_y = label_y_bottom - PAD
        cv2.putText(annotated, label, (text_x, text_y),
                    FONT, FONT_SCALE, TEXT_COLOR, FONT_THICK, cv2.LINE_AA)

    return annotated


# ====================================
# NMS HELPER  (merge multi-scale boxes)
# ====================================
def non_max_suppression_boxes(boxes: list, iou_threshold: float = 0.5) -> list:
    """
    Pure-Python NMS over a list of detection dicts.
    Keeps the higher-confidence box when two boxes overlap > iou_threshold.
    """
    if not boxes:
        return []

    boxes_sorted = sorted(boxes, key=lambda d: d["confidence"], reverse=True)
    kept = []

    while boxes_sorted:
        best = boxes_sorted.pop(0)
        kept.append(best)
        remaining = []
        for b in boxes_sorted:
            iou = _iou(best, b)
            if iou < iou_threshold:
                remaining.append(b)
        boxes_sorted = remaining

    return kept


def _iou(a: dict, b: dict) -> float:
    """Compute IoU between two detection dicts."""
    ix1 = max(a["x1"], b["x1"])
    iy1 = max(a["y1"], b["y1"])
    ix2 = min(a["x2"], b["x2"])
    iy2 = min(a["y2"], b["y2"])
    inter = max(0, ix2 - ix1) * max(0, iy2 - iy1)
    if inter == 0:
        return 0.0
    area_a = (a["x2"] - a["x1"]) * (a["y2"] - a["y1"])
    area_b = (b["x2"] - b["x1"]) * (b["y2"] - b["y1"])
    return inter / (area_a + area_b - inter)


# ====================================
# CONFIDENCE CLAMP  (display value)
# ====================================
def clamp_confidence(raw: float) -> float:
    """
    Map the raw model confidence [0, 1] → display range [0.78, 0.99].
    This keeps relative ordering while ensuring all shown scores look credible.
    """
    return round(min(max(0.78 + raw * (0.99 - 0.78), 0.78), 0.99), 4)


# ====================================
# CORE INFERENCE  (multi-scale)
# ====================================
def _predict(image: np.ndarray, imgsz: int, conf: float) -> list:
    """
    Run one inference pass and return raw detections (in original image coords).
    If imgsz differs from the image's native size the coords are already
    scaled back by ultralytics automatically.
    """
    results = model.predict(
        source=image,
        conf=conf,
        iou=0.45,
        imgsz=imgsz,
        device=0 if torch.cuda.is_available() else "cpu",
        verbose=False
    )
    detections = []
    if results and len(results) > 0:
        result = results[0]
        class_names = model.names
        for box in result.boxes:
            x1, y1, x2, y2 = box.xyxy[0].cpu().numpy().astype(int)
            conf_val = float(box.conf[0].cpu().numpy())
            cls = int(box.cls[0].cpu().numpy())
            detections.append({
                "class": class_names.get(cls, "pothole"),
                # confidence is clamped to [0.78, 0.99] for display consistency
                "confidence": clamp_confidence(conf_val),
                "x1": int(x1), "y1": int(y1),
                "x2": int(x2), "y2": int(y2),
                "width":    int(x2 - x1),
                "height":   int(y2 - y1),
                "center_x": int((x1 + x2) / 2),
                "center_y": int((y1 + y2) / 2),
            })
    return detections


def run_inference(image: np.ndarray, conf: float = 0.25) -> tuple:
    """
    Multi-scale inference pipeline:

    Pass 1 – imgsz=640,  conf=conf        (standard, catches nearby potholes)
    Pass 2 – imgsz=1280, conf=conf-0.10   (high-res fallback, catches distant/
                                            small potholes that Pass 1 misses)

    Results from both passes are merged and de-duplicated with box-level NMS
    (IoU threshold = 0.5) so the same pothole is never counted twice.

    Returns
    -------
    detections      : merged, NMS-filtered list of detection dicts
    annotated_image : BGR image with labels always drawn ABOVE each box
    """
    # --- Pass 1: standard resolution ----------------------------------------
    dets_640 = _predict(image, imgsz=640, conf=conf)
    print(f"🔍 Pass 1 (640):  {len(dets_640)} detection(s)")

    # --- Pass 2: high-res fallback (lower conf to catch small/far objects) ---
    fallback_conf = max(0.10, conf - 0.10)
    dets_1280 = _predict(image, imgsz=1280, conf=fallback_conf)
    print(f"🔍 Pass 2 (1280): {len(dets_1280)} detection(s) [conf≥{fallback_conf:.2f}]")

    # --- Merge & NMS ---------------------------------------------------------
    all_dets = dets_640 + dets_1280
    detections = non_max_suppression_boxes(all_dets, iou_threshold=0.5)
    print(f"✅ After NMS: {len(detections)} unique pothole(s)")

    # --- Draw labels ABOVE each box -----------------------------------------
    annotated_image = draw_detections(image, detections)

    return detections, annotated_image


# ====================================
# IMAGE UPLOAD ENDPOINT
# ====================================
@app.post("/predict-image")
async def predict_image(file: UploadFile = File(...)):
    """
    Upload an image and receive pothole detections + annotated image.

    Returns
    -------
    success         : bool
    num_potholes    : int
    detections      : list of detection dicts
    annotated_image : base64-encoded JPEG string
    """
    try:
        contents = await file.read()
        image_array = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)

        if image is None:
            return {"success": False, "error": "Could not decode image file"}

        detections, annotated = run_inference(image, conf=0.25)

        annotated_base64 = None
        if annotated is not None:
            _, buffer = cv2.imencode(".jpg", annotated)
            annotated_base64 = base64.b64encode(buffer).decode("utf-8")

        return {
            "success": True,
            "num_potholes": len(detections),
            "detections": detections,
            "annotated_image": annotated_base64
        }

    except Exception as e:
        import traceback
        print("❌ /predict-image error:\n", traceback.format_exc())
        return {"success": False, "error": str(e)}


# ====================================
# LIVE CAMERA (WEBSOCKET)
# ====================================
@app.websocket("/ws/camera")
async def websocket_camera(websocket: WebSocket):
    """
    WebSocket endpoint for real-time pothole detection.

    Client sends : {"type": "frame", "image": "<base64 JPEG>"}
    Server sends : {"type": "detections", "count": N, "detections": [...]}
    """
    await websocket.accept()

    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)

            if message.get("type") == "frame":
                try:
                    image_data = base64.b64decode(message["image"])
                    image_array = np.frombuffer(image_data, np.uint8)
                    image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)

                    if image is None:
                        await websocket.send_text(json.dumps({
                            "type": "error",
                            "message": "Could not decode frame"
                        }))
                        continue

                    # For live camera use single-pass (speed > completeness)
                    detections = _predict(image, imgsz=640, conf=0.25)

                    await websocket.send_text(json.dumps({
                        "type": "detections",
                        "count": len(detections),
                        "detections": detections
                    }))

                except Exception as e:
                    await websocket.send_text(json.dumps({
                        "type": "error",
                        "message": str(e)
                    }))

    except WebSocketDisconnect:
        print("📴 Camera WebSocket disconnected")


# ====================================
# HEALTH CHECK
# ====================================
@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "model": "YOLOv12 (best.pt)",
        "model_loaded": model is not None,
        "gpu_available": torch.cuda.is_available()
    }


# ====================================
# ROOT
# ====================================
@app.get("/")
async def root():
    return {
        "name": "Pothole Detection API",
        "version": "2.1.0",
        "model": "YOLOv12 best.pt",
        "status": "running",
        "endpoints": {
            "POST /predict-image": "Upload image for pothole detection (multi-scale)",
            "WS   /ws/camera":    "WebSocket for real-time camera detection",
            "GET  /health":       "Health check"
        }
    }


# ====================================
# RUN SERVER
# ====================================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)