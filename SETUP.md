# Pothole Detection App - Complete Setup Guide

This is a full-stack application combining a **Next.js frontend** with a **FastAPI backend** for real-time pothole detection using YOLOv9+CBAM.

## Project Structure

```
.
├── app/                          # Next.js frontend
│   ├── page.tsx                 # Home page
│   ├── upload/page.tsx          # Image upload detection page
│   ├── camera/page.tsx          # Live camera detection page
│   ├── layout.tsx               # Root layout
│   └── globals.css              # Global styles
│
├── backend/                      # FastAPI server
│   ├── main.py                  # FastAPI application with endpoints
│   ├── models/                  # Directory for trained models
│   │   └── yolov9_cbam.pt      # Your trained YOLOv9+CBAM model (user provided)
│   ├── requirements.txt          # Python dependencies
│   └── README.md                # Backend documentation
│
├── components/ui/               # shadcn/ui components
├── package.json                 # Frontend dependencies
└── README.md                     # This file
```

## Prerequisites

- **Python 3.10+** (for backend)
- **Node.js 18+** (for frontend)
- **GPU recommended** (CUDA 11.8+ for faster inference, optional)
- Your trained **YOLOv9+CBAM model** (`best.pt` from Colab training)

## Step-by-Step Setup

### 1. Prepare Your Trained Model

First, train your YOLOv9+CBAM model using the provided Colab code:

1. Open the provided training code in Google Colab
2. Run **CELL 1 through CELL 8** to train the model
3. Run **CELL 9** to download results
4. Download the **`best.pt`** file from the training outputs

Once downloaded, place it in the backend directory:

```bash
# Create models directory if it doesn't exist
mkdir -p backend/models

# Copy your best.pt file
cp /path/to/best.pt backend/models/yolov9_cbam.pt
```

### 2. Setup FastAPI Backend

Navigate to the backend directory and install dependencies:

```bash
# Navigate to backend
cd backend

# Create virtual environment (recommended)
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

Start the FastAPI server:

```bash
# Option 1: Using python
python main.py

# Option 2: Using uvicorn directly
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

You should see output like:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete
✅ Loading model from backend/models/yolov9_cbam.pt
✅ Model loaded successfully!
GPU Available: True
GPU: NVIDIA GeForce RTX 3090
```

### 3. Setup Next.js Frontend

In a **new terminal** (keep backend running), navigate to project root:

```bash
# Install frontend dependencies
npm install
# or
pnpm install

# Start Next.js development server
npm run dev
# or
pnpm dev
```

The frontend should be available at `http://localhost:3000`.

## Usage

### Image Upload Detection

1. Go to **http://localhost:3000**
2. Click **"Upload Image"**
3. Drag and drop (or select) a road image
4. Click **"Detect Potholes"**
5. View results with bounding boxes and confidence scores

### Live Camera Detection

1. Go to **http://localhost:3000**
2. Click **"Live Camera"**
3. Grant camera permissions when prompted
4. Click **"Start Detection"**
5. Point camera at roads - detections appear in real-time
6. Color-coded boxes:
   - **Green** (>80% confidence)
   - **Yellow** (60-80% confidence)
   - **Red** (<60% confidence)

## API Endpoints

### Health Check
```bash
GET http://localhost:8000/health
```

### Image Prediction
```bash
POST http://localhost:8000/predict-image
Content-Type: multipart/form-data

# Send image file as 'file' parameter
```

**Response:**
```json
{
  "success": true,
  "num_potholes": 3,
  "detections": [
    {
      "class": "pothole",
      "confidence": 0.87,
      "x1": 100, "y1": 50,
      "x2": 200, "y2": 150,
      "width": 100, "height": 100,
      "center_x": 150, "center_y": 100
    }
  ],
  "annotated_image": "base64_encoded_image..."
}
```

### Live Camera (WebSocket)
```
WS ws://localhost:8000/ws/camera
```

**Client → Server:**
```json
{
  "type": "frame",
  "image": "base64_encoded_jpeg"
}
```

**Server → Client:**
```json
{
  "type": "detections",
  "count": 2,
  "detections": [
    {
      "class": "pothole",
      "confidence": 0.85,
      "x1": 150, "y1": 100,
      "x2": 250, "y2": 200
    }
  ]
}
```

## Configuration

### Backend (backend/main.py)

**CORS Configuration:**
```python
allow_origins=["*"]  # Allow all origins for local development
```

**Model Path:**
```python
model_path = os.path.join(os.path.dirname(__file__), "models", "yolov9_cbam.pt")
```

**Inference Parameters:**
```python
conf=0.5   # Confidence threshold
iou=0.45   # IOU threshold
imgsz=640  # Input image size
```

### Frontend (app/camera/page.tsx)

**WebSocket Server:**
```javascript
const wsRef = useRef<WebSocket | null>(null)
wsRef.current = new WebSocket('ws://localhost:8000/ws/camera')
```

**Camera Settings:**
```javascript
video: {
  facingMode: 'environment',      // Rear camera on mobile
  width: { ideal: 1280 },
  height: { ideal: 720 },
}
```

**Frame Rate:**
```javascript
const targetFrameTime = 1000 / 15  // 15 FPS (adjust for performance)
```

## Troubleshooting

### Backend Issues

**"Model not found at backend/models/yolov9_cbam.pt"**
- Ensure you've downloaded `best.pt` from Colab and placed it in `backend/models/`
- Rename to exactly `yolov9_cbam.pt`

**"CUDA out of memory"**
- Reduce `imgsz` in main.py (try 416 or 512 instead of 640)
- Reduce batch size if processing multiple images
- Use CPU: `device="cpu"` in inference

**"Connection refused on localhost:8000"**
- Check FastAPI server is running
- Ensure port 8000 is not used by another application
- Try: `lsof -i :8000` (macOS/Linux) or `netstat -ano | findstr :8000` (Windows)

### Frontend Issues

**"WebSocket connection failed"**
- Ensure FastAPI backend is running on localhost:8000
- Check CORS is enabled in backend
- Look for errors in browser console (F12 → Console)

**"Camera access denied"**
- Grant camera permissions in browser settings
- Use HTTPS (required for camera on production)
- Check firewall isn't blocking camera

**"No potholes detected / Low accuracy"**
- Ensure lighting is adequate
- Model is trained for specific road conditions
- Check confidence threshold (default 0.5)

## Performance Tips

1. **Backend Performance:**
   - Use GPU if available (auto-detected)
   - Reduce imgsz for faster inference
   - Increase batch processing for multiple images

2. **Camera Performance:**
   - Reduce FPS if needed (currently 15 FPS)
   - Lower frame quality (JPEG quality 0.8)
   - Reduce canvas resolution if processing is slow

3. **General:**
   - Keep models/ directory on fast storage (SSD preferred)
   - Use development mode for debugging (`--reload`)
   - Monitor GPU memory with `nvidia-smi`

## Deployment

For production deployment:

1. **Backend:**
   ```bash
   # Use production server
   gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app
   
   # Update CORS for specific origins
   allow_origins=["https://yourdomain.com"]
   ```

2. **Frontend:**
   ```bash
   npm run build
   npm start
   ```

3. **Environment:**
   - Use `.env.local` for backend URL configuration
   - Update WebSocket URL from `ws://localhost:8000` to production URL
   - Enable HTTPS (required for camera access)

## Technology Stack

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** FastAPI, Uvicorn, PyTorch, Ultralytics YOLO
- **Communication:** REST API + WebSocket
- **Model:** YOLOv9+CBAM (0.86 mAP@0.50)
- **Deployment:** Local development (can deploy to cloud)

## License

Your YOLOv9+CBAM model and code are yours to use.

## Support

For issues with:
- **YOLOv9 training:** Check Ultralytics documentation
- **FastAPI:** See backend/README.md
- **Next.js:** Check app-specific issues in each component

---

**Ready to detect potholes? Start the backend and frontend, then open http://localhost:3000!**
