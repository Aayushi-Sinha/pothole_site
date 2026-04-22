# Pothole Detection Backend

FastAPI backend for YOLOv9+CBAM pothole detection model.

## Setup

1. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Place your trained model**:
   - Download `best.pt` from your Colab training (CELL 9 in the provided code)
   - Place it in the `models/` directory as `yolov9_cbam.pt`
   ```bash
   mkdir -p models
   cp /path/to/best.pt models/yolov9_cbam.pt
   ```

3. **Run the server**:
   ```bash
   python main.py
   ```
   Or with uvicorn:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```

4. **Check API is running**:
   - Visit `http://localhost:8000/` for API info
   - Visit `http://localhost:8000/docs` for Swagger UI (auto-generated docs)

## API Endpoints

### 1. Health Check
- **GET** `/health`
- Returns model status and GPU availability

### 2. Image Upload (REST)
- **POST** `/predict-image`
- Upload an image file
- Returns: detections list + base64 annotated image

**Example with curl**:
```bash
curl -X POST "http://localhost:8000/predict-image" \
  -F "file=@path/to/image.jpg"
```

**Response**:
```json
{
  "success": true,
  "num_potholes": 3,
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
    }
  ],
  "annotated_image": "base64_encoded_image..."
}
```

### 3. Live Camera (WebSocket)
- **WS** `/ws/camera`
- Real-time detection from camera frames

**Protocol**:
```json
// Client → Server
{"type": "frame", "image": "base64_encoded_jpeg"}

// Server → Client
{"type": "detections", "count": 2, "detections": [...]}
```

## Model Requirements

- **Input**: YOLOv9+CBAM trained model (`.pt` file)
- **Output Format**: Ultralytics YOLO format (xywh normalized)
- **Classes**: Single class detection (pothole)
- **Performance**: .86 mAP@0.50 (from your training)

## Troubleshooting

1. **Model not found**: Ensure `models/yolov9_cbam.pt` exists
2. **CUDA errors**: Model auto-falls back to CPU if GPU unavailable
3. **CORS issues**: CORS is enabled for all origins (`allow_origins=["*"]`)
4. **WebSocket connection failed**: Check firewall allows port 8000

## Local Development

The backend runs on `http://localhost:8000` and is configured to accept requests from the Next.js frontend on `http://localhost:3000`.
