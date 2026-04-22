# Pothole Detection App - Visual Guide

## How It Works

### Image Upload Flow
```
┌─────────────────────────────────────────────────────────┐
│ User opens /upload page                                 │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│ Drag & drop image or click to select                    │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│ Shows image preview                                      │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│ User clicks "Detect Potholes"                           │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
        ┌─────────────────────────┐
        │ POST /predict-image      │
        │ (FastAPI Backend)        │
        └─────────┬───────────────┘
                  │
                  ▼
        ┌─────────────────────────┐
        │ YOLOv9+CBAM Inference   │
        │ (2-5 seconds first time)│
        └─────────┬───────────────┘
                  │
                  ▼
        ┌─────────────────────────┐
        │ Draw bounding boxes     │
        │ Encode as base64 JPEG   │
        └─────────┬───────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│ Display annotated image                                 │
│ Show detection statistics                               │
│ List all potholes with confidence                       │
└─────────────────────────────────────────────────────────┘
```

### Live Camera Flow
```
┌──────────────────────────────────────────────────────────┐
│ User opens /camera page                                  │
└──────────────────┬───────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────┐
│ Browser requests camera access                           │
│ User grants permission                                   │
└──────────────────┬───────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────┐
│ Video stream captures frames                             │
│ Frames drawn to HTML5 Canvas                             │
└──────────────────┬───────────────────────────────────────┘
                   │
                   ▼ (Every ~67ms at 15 FPS)
         ┌─────────────────────────┐
         │ Convert frame to JPEG    │
         │ Encode as base64        │
         └────────┬────────────────┘
                  │
                  ▼
        ┌──────────────────────────┐
        │ WebSocket Send            │
        │ {"type":"frame","image":} │
        └────────┬─────────────────┘
                 │
                 ▼
       ┌───────────────────────────┐
       │ FastAPI /ws/camera        │
       │ YOLOv9+CBAM Inference     │
       │ (200-500ms per frame)     │
       └────────┬──────────────────┘
                │
                ▼
       ┌───────────────────────────┐
       │ Extract bounding boxes    │
       │ Calculate confidence      │
       └────────┬──────────────────┘
                │
                ▼
     ┌─────────────────────────────┐
     │ WebSocket Response           │
     │ {"type":"detections",...}    │
     └────────┬────────────────────┘
              │
              ▼
┌──────────────────────────────────────────────────────────┐
│ Draw SVG boxes on video stream                           │
│ Color code by confidence                                 │
│ Update FPS counter                                       │
│ Update pothole count                                     │
└──────────────────────────────────────────────────────────┘
              │
              ▼ (Every 67ms - continuous loop)
     ┌─────────────────────────────┐
     │ Repeat for next frame       │
     └─────────────────────────────┘
```

## Page Layout

### Home Page (/)
```
┌─────────────────────────────────────────────────────────┐
│  POTHOLE DETECTION                                      │
│  AI-powered road damage detection                       │
├─────────────────────────────────────────────────────────┤
│ ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│ │     0.86     │  │  YOLOv9+     │  │  1 Class     │   │
│ │   mAP@0.50   │  │    CBAM      │  │  Detection   │   │
│ └──────────────┘  └──────────────┘  └──────────────┘   │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────────┐    ┌──────────────────┐          │
│  │ 📷 UPLOAD IMAGE  │    │ 📹 LIVE CAMERA   │          │
│  │                  │    │                  │          │
│  │ Analyze photos   │    │ Real-time detect │          │
│  │                  │    │                  │          │
│  └──────────────────┘    └──────────────────┘          │
├─────────────────────────────────────────────────────────┤
│ Features:                                               │
│ • Real-time WebSocket streaming                        │
│ • Mobile-optimized interface                           │
│ • High-accuracy YOLOv9+CBAM model                      │
│ • Detailed confidence scores                           │
│ • GPU acceleration support                             │
└─────────────────────────────────────────────────────────┘
```

### Upload Page (/upload)
```
┌──────────────────────────────────────┬──────────────────┐
│         LEFT: UPLOAD SECTION         │ RIGHT: RESULTS   │
├──────────────────────────────────────┼──────────────────┤
│ [← BACK]                             │                  │
│                                      │ 🖼️ DETECTED IMG  │
│ SELECT IMAGE                         │ ┌──────────────┐ │
│ JPG, PNG up to 50MB                  │ │  Annotated   │ │
│                                      │ │  with boxes  │ │
│ ┌──────────────────────────────────┐ │ └──────────────┘ │
│ │ 📂 Drag & drop here              │ │                  │
│ │ or click to select                │ │ 📊 STATISTICS   │
│ │ [Browse Files]                    │ │ Potholes: 3     │
│ └──────────────────────────────────┘ │                  │
│                                      │ 📋 DETAILS       │
│ 👁️ PREVIEW                          │ ┌──────────────┐ │
│ ┌──────────────────────────────────┐ │ Pothole 1    │ │
│ │  [selected-image.jpg]            │ │ Conf: 87%    │ │
│ │                                   │ │              │ │
│ │                                   │ │ Pothole 2    │ │
│ └──────────────────────────────────┘ │ Conf: 92%    │ │
│                                      │ └──────────────┘ │
│ [Detect Potholes] (blue button)     │                  │
└──────────────────────────────────────┴──────────────────┘
```

### Camera Page (/camera)
```
┌─────────────────────────────────────────────────────────┐
│ [← BACK]                                                │
│                                                         │
│ LIVE CAMERA DETECTION                                  │
│ Real-time pothole detection using your camera          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  📹 VIDEO FEED                                  │   │
│  │  ┌───────────────────────────────────────────┐ │   │
│  │  │ [Camera Stream]                           │ │   │
│  │  │   [Green Box] ← High confidence (>80%)    │ │   │
│  │  │   [Yellow Box] ← Medium (60-80%)          │ │   │
│  │  │   [Red Box] ← Low (<60%)                  │ │   │
│  │  │                                           │ │   │
│  │  │ "No potholes detected" ─────────────────  │ │   │
│  │  │                                           │ │   │
│  │  │ Or: "Detected pothole at center"          │ │   │
│  │  └───────────────────────────────────────────┘ │   │
│  │                                                 │   │
│  │ [▶ Start Detection]  or  [■ Stop Detection]    │   │
│  │                                                 │   │
│  │  Potholes: 3  │  FPS: 15  │  Avg Conf: 87%   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│ 📖 INSTRUCTIONS                                         │
│ 1. Allow camera access when prompted                   │
│ 2. Click "Start Detection" to begin                    │
│ 3. Point camera at roads                               │
│ 4. Green boxes = high conf, Yellow = medium, Red = low │
│ 5. Ensure backend is running on localhost:8000         │
└─────────────────────────────────────────────────────────┘
```

## API Response Examples

### POST /predict-image Response
```json
{
  "success": true,
  "num_potholes": 2,
  "detections": [
    {
      "class": "pothole",
      "confidence": 0.87,
      "x1": 100,
      "y1": 50,
      "x2": 200,
      "y2": 150,
      "width": 100,
      "height": 100,
      "center_x": 150,
      "center_y": 100
    },
    {
      "class": "pothole",
      "confidence": 0.92,
      "x1": 300,
      "y1": 200,
      "x2": 400,
      "y2": 350,
      "width": 100,
      "height": 150,
      "center_x": 350,
      "center_y": 275
    }
  ],
  "annotated_image": "iVBORw0KGgoAAAANSUhEUgAA....[base64 jpeg]"
}
```

### WS /ws/camera Messages

**Client → Server:**
```json
{
  "type": "frame",
  "image": "/9j/4AAQSkZJRgABAQAA....[base64 jpeg]"
}
```

**Server → Client:**
```json
{
  "type": "detections",
  "count": 1,
  "detections": [
    {
      "class": "pothole",
      "confidence": 0.85,
      "x1": 150,
      "y1": 100,
      "x2": 250,
      "y2": 200
    }
  ]
}
```

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                       CLIENT SIDE                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Browser (Chrome, Firefox, Safari, Edge)            │   │
│  │  ┌──────────────┐  ┌──────────────┐               │   │
│  │  │ Home Page    │  │ Upload Page  │               │   │
│  │  │ /            │  │ /upload      │               │   │
│  │  └──────────────┘  └──────────────┘               │   │
│  │  ┌──────────────────────────────────┐             │   │
│  │  │     Camera Page /camera          │             │   │
│  │  │ • getUserMedia() → Camera        │             │   │
│  │  │ • Canvas → Frame Capture         │             │   │
│  │  │ • toBlob() → JPEG Encoding       │             │   │
│  │  │ • WebSocket → Server             │             │   │
│  │  └──────────────────────────────────┘             │   │
│  └─────────────────────────────────────────────────────┘   │
└──────────────────┬──────────────────────────────────────────┘
                   │
        HTTP POST + WebSocket Connection
                   │
┌──────────────────▼──────────────────────────────────────────┐
│                      SERVER SIDE                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │         FastAPI Application (main.py)              │    │
│  │  ┌───────────────────────────────────────────────┐ │    │
│  │  │ Endpoints:                                   │ │    │
│  │  │ • GET /health → Check status                 │ │    │
│  │  │ • POST /predict-image → REST API             │ │    │
│  │  │   └─ Receive file                            │ │    │
│  │  │   └─ Decode image                            │ │    │
│  │  │   └─ Run inference                           │ │    │
│  │  │   └─ Encode result                           │ │    │
│  │  │   └─ Return JSON                             │ │    │
│  │  │                                              │ │    │
│  │  │ • WS /ws/camera → WebSocket                  │ │    │
│  │  │   └─ Accept connection                       │ │    │
│  │  │   └─ Receive base64 frames (15 FPS)          │ │    │
│  │  │   └─ Decode JPEG                             │ │    │
│  │  │   └─ Run inference (200-500ms)               │ │    │
│  │  │   └─ Send detections back                    │ │    │
│  │  │   └─ Repeat until disconnect                 │ │    │
│  │  └───────────────────────────────────────────────┘ │    │
│  │  ┌───────────────────────────────────────────────┐ │    │
│  │  │  Model Loading & Inference                   │ │    │
│  │  │  ┌─────────────────────────────────────────┐ │ │    │
│  │  │  │ YOLOv9+CBAM Model                       │ │ │    │
│  │  │  │ • Load once on startup                  │ │ │    │
│  │  │  │ • Cache in memory                       │ │ │    │
│  │  │  │ • GPU acceleration (CUDA)               │ │ │    │
│  │  │  │ • CPU fallback                          │ │ │    │
│  │  │  │ • Confidence: 0.5 (configurable)        │ │ │    │
│  │  │  │ • Input: 640×640 images                 │ │ │    │
│  │  │  │ • Output: Bounding boxes + scores       │ │ │    │
│  │  │  └─────────────────────────────────────────┘ │ │    │
│  │  └───────────────────────────────────────────────┘ │    │
│  └────────────────────────────────────────────────────┘    │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Hardware                                            │    │
│  │ • GPU (Optional): NVIDIA CUDA 11.8+               │    │
│  │ • CPU (Fallback): Modern processor                │    │
│  │ • RAM: 4GB+ (8GB+ recommended)                     │    │
│  │ • Storage: Model ~200MB + dependencies            │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## File Organization

```
pothole-detection/
│
├── Frontend Components
│   ├── app/page.tsx              ← Home page (landing)
│   ├── app/upload/page.tsx       ← Image upload detector
│   ├── app/camera/page.tsx       ← Live camera detector
│   └── app/layout.tsx            ← Root layout
│
├── Backend Services
│   ├── backend/main.py           ← FastAPI app & endpoints
│   ├── backend/models/
│   │   └── yolov9_cbam.pt       ← Your trained model (add)
│   └── backend/requirements.txt  ← Dependencies
│
├── Documentation
│   ├── README_POTHOLE.md         ← Main readme
│   ├── QUICKSTART.md             ← 5-min setup
│   ├── SETUP.md                  ← Detailed setup
│   ├── IMPLEMENTATION_SUMMARY.md ← Technical details
│   ├── BUILD_SUMMARY.md          ← What was built
│   ├── VISUAL_GUIDE.md           ← This file
│   └── backend/README.md         ← Backend docs
│
├── Deployment
│   ├── Dockerfile.backend        ← Backend container
│   ├── Dockerfile.frontend       ← Frontend container
│   └── docker-compose.yml        ← Multi-container setup
│
├── Configuration
│   ├── .env.example              ← Environment template
│   ├── package.json              ← Frontend dependencies
│   ├── tailwind.config.ts        ← Styling config
│   └── tsconfig.json             ← TypeScript config
│
└── Other
    ├── components/ui/            ← shadcn/ui components
    └── public/                   ← Static assets
```

## Data Flow Visualization

### Upload Image Data Flow
```
User Image File
    │
    ▼
FormData {file}
    │
    ▼ [POST /predict-image]
HTTP Request (multipart)
    │
    ▼
FastAPI Endpoint
    │
    ├─ Decode image
    │
    ├─ Run YOLO inference
    │
    ├─ Get bounding boxes
    │
    ├─ Draw boxes on image
    │
    ├─ Encode to base64
    │
    └─ Generate JSON response
    │
    ▼
HTTP Response {
  detections: [],
  annotated_image: "base64..."
}
    │
    ▼
React Component
    │
    ├─ Display annotated image
    ├─ Show detection count
    └─ List detection details
```

### Live Camera Data Flow
```
Camera Stream (continuous)
    │
    ▼ (Every 67ms at 15 FPS)
Canvas Frame Capture
    │
    ▼
JPEG Encoding
    │
    ▼
Base64 Conversion
    │
    ▼ [WebSocket Send]
Transmission to Server
    │
    ▼
FastAPI WebSocket Handler
    │
    ├─ Decode base64
    │
    ├─ Decompress JPEG
    │
    ├─ Run YOLO inference
    │
    ├─ Extract coordinates
    │
    └─ Prepare JSON response
    │
    ▼ [WebSocket Receive]
Frontend Gets Response
    │
    ├─ Parse JSON
    │
    ├─ Draw SVG boxes
    │ ├─ Green if confidence > 80%
    │ ├─ Yellow if confidence 60-80%
    │ └─ Red if confidence < 60%
    │
    ├─ Update FPS counter
    │
    └─ Update pothole count
    │
    ▼ (Loop continues)
Next frame capture
```

---

This visual guide provides a complete overview of the application flow and structure. Use it alongside the setup guides for deployment and development.
