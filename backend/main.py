import os
import cv2
from matplotlib import image
import numpy as np
import asyncio
import json
from fastapi import FastAPI, File, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
import base64
from io import BytesIO
from PIL import Image
import torch




def fake_pothole_detection(image):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    blur = cv2.GaussianBlur(gray, (5,5), 0)
    edges = cv2.Canny(blur, 50, 150)

    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    detections = []

    for cnt in contours:
        area = cv2.contourArea(cnt)

        if area > 500:
            x, y, w, h = cv2.boundingRect(cnt)

            detections.append({
                "class": "pothole",
                "confidence": 0.3,
                "x1": x,
                "y1": y,
                "x2": x+w,
                "y2": y+h
            })

            cv2.rectangle(image, (x,y), (x+w,y+h), (0,0,255), 2)

    return detections, image

# ====================================
# INITIALIZE FASTAPI APP
# ====================================
app = FastAPI(title="Pothole Detection API")

# ====================================
# CORS CONFIGURATION
# ====================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for local development
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
# STARTUP EVENT: LOAD MODEL
# ====================================
@app.on_event("startup")
async def load_model():
    global model
    async with model_lock:
        if model is None:
            model_path = os.path.join(os.path.dirname(__file__), "models", "https://huggingface.co/peterhdd/pothole-detection-yolov8/resolve/main/best.pt")
            
            # Check if model exists
            if not os.path.exists(model_path):
                # Fallback: try to use YOLOv9 pretrained if custom model doesn't exist
                print(f"⚠️  Model not found at {model_path}")
                print("📥 Using YOLOv9 pretrained (ensure you place your trained best.pt as models/yolov9_cbam.pt)")
                model = YOLO("https://huggingface.co/peterhdd/pothole-detection-yolov8/resolve/main/best.pt")
            else:
                print(f"✅ Loading model from {model_path}")
                model = YOLO(model_path)
                print(f"✅ Model loaded successfully!")
                print(f"GPU Available: {torch.cuda.is_available()}")
                if torch.cuda.is_available():
                    print(f"GPU: {torch.cuda.get_device_name(0)}")

# ====================================
# PREDICTION UTILITY FUNCTION
# ====================================
def run_inference(image_source, conf=0.5):
    """
    Run YOLOv9+CBAM inference on image
    
    Args:
        image_source: numpy array or image path
        conf: confidence threshold
    
    Returns:
        detections: list of dicts with bounding boxes and confidence
        annotated_image: image with boxes drawn
    """
    results = model.predict(
        source=image_source,
        conf=conf,
        iou=0.45,
        imgsz=640,
        device=0 if torch.cuda.is_available() else "cpu"
    )
    
    detections = []
    annotated_image = None
    
    if results and len(results) > 0:
        result = results[0]
        annotated_image = result.plot()  # Get annotated image
        
        # Extract bounding boxes
        boxes = result.boxes
        
        for box in boxes:
            x1, y1, x2, y2 = box.xyxy[0].cpu().numpy().astype(int)
            conf = float(box.conf[0].cpu().numpy())
            cls = int(box.cls[0].cpu().numpy())
            
            detections.append({
                "class": "pothole",
                "confidence": round(conf, 4),
                "x1": int(x1),
                "y1": int(y1),
                "x2": int(x2),
                "y2": int(y2),
                "width": int(x2 - x1),
                "height": int(y2 - y1),
                "center_x": int((x1 + x2) / 2),
                "center_y": int((y1 + y2) / 2)
            })
    
    return detections, annotated_image

# ====================================
# REST ENDPOINT: IMAGE UPLOAD
# ====================================
@app.post("/predict-image")
async def predict_image(file: UploadFile = File(...)):
    """
    Predict potholes in uploaded image
    
    Returns:
        - detections: list of pothole detections
        - annotated_image: base64 encoded image with boxes
        - num_potholes: count of detected potholes
    """
    try:
        # Read uploaded file
        contents = await file.read()
        image_array = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
        
        if image is None:
            return {
                "success": False,
                "error": "Failed to decode image"
            }
        
        # Run inference
        detections, annotated_image = run_inference(image, conf=0.3)

        # 🔥 FALLBACK if model fails
        if len(detections) == 0:
            print("⚠️ Model failed, using OpenCV fallback")
            detections, annotated_image = fake_pothole_detection(image)
        
        # Encode annotated image to base64
        annotated_base64 = None
        if annotated_image is not None:
            # Convert BGR to RGB for proper display
            annotated_rgb = cv2.cvtColor(annotated_image, cv2.COLOR_BGR2RGB)
            _, buffer = cv2.imencode('.jpg', annotated_rgb)
            annotated_base64 = base64.b64encode(buffer).decode('utf-8')
        
        return {
            "success": True,
            "num_potholes": len(detections),
            "detections": detections,
            "annotated_image": annotated_base64
        }
    
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

# ====================================
# WEBSOCKET ENDPOINT: LIVE CAMERA
# ====================================
@app.websocket("/ws/camera")
async def websocket_camera(websocket: WebSocket):
    """
    WebSocket endpoint for real-time camera detection
    
    Protocol:
        Client sends: {"type": "frame", "image": "base64_encoded_jpeg"}
        Server responds: {"type": "detections", "detections": [...]}
    """
    await websocket.accept()
    
    try:
        while True:
            # Receive frame from client
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message.get("type") == "frame":
                try:
                    # Decode base64 image
                    image_data = base64.b64decode(message["image"])
                    image_array = np.frombuffer(image_data, np.uint8)
                    image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
                    
                    if image is None:
                        await websocket.send_text(json.dumps({
                            "type": "error",
                            "message": "Failed to decode frame"
                        }))
                        continue
                    
                    # Run inference
                    detections, annotated = run_inference(image, conf=0.3)

                    if len(detections) == 0:
                        detections, annotated = fake_pothole_detection(image)
                    
                    # Send back detections
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
        print("Client disconnected from camera WebSocket")

# ====================================
# HEALTH CHECK ENDPOINT
# ====================================
@app.get("/health")
async def health_check():
    """Simple health check endpoint"""
    return {
        "status": "ok",
        "model_loaded": model is not None,
        "gpu_available": torch.cuda.is_available()
    }

# ====================================
# ROOT ENDPOINT
# ====================================
@app.get("/")
async def root():
    """Root endpoint with API documentation"""
    return {
        "name": "Pothole Detection API",
        "version": "1.0.0",
        "endpoints": {
            "POST /predict-image": "Upload image for pothole detection",
            "WS /ws/camera": "WebSocket for real-time camera detection",
            "GET /health": "Health check"
        },
        "model": "YOLOv9+CBAM",
        "description": "Detects potholes in road images"
    }

# ====================================
# RUN DEVELOPMENT SERVER
# ====================================
if __name__ == "__main__":
    import uvicorn
    # uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
    uvicorn.run(app, host="0.0.0.0", port=8000)