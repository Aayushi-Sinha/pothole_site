# Pothole Detection Web App

A modern, mobile-friendly web application for detecting potholes in road images using YOLOv9+CBAM deep learning model.

**Features:**
- 🖼️ Image Upload Detection - Upload photos for instant analysis
- 📱 Live Camera Detection - Real-time pothole detection from camera
- 🚀 WebSocket Streaming - Fast, low-latency live detection
- 📊 0.86 mAP@0.50 - Highly accurate YOLOv9+CBAM model
- 💻 Mobile Optimized - Works on desktop and mobile browsers
- 🔧 Configurable - Easy to adjust confidence, FPS, image size

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- Your trained `best.pt` model from Colab

### Setup (5 minutes)

1. **Place your model:**
   ```bash
   mkdir -p backend/models
   cp /path/to/best.pt backend/models/yolov9_cbam.pt
   ```

2. **Start backend (Terminal 1):**
   ```bash
   cd backend
   pip install -r requirements.txt
   python main.py
   ```

3. **Start frontend (Terminal 2):**
   ```bash
   npm install
   npm run dev
   ```

4. **Open browser:**
   - Navigate to `http://localhost:3000`
   - Try image upload or live camera detection

## Project Structure

```
pothole-detection/
├── app/                          # Next.js Pages
│   ├── page.tsx                 # Home page
│   ├── upload/page.tsx          # Image upload detector
│   ├── camera/page.tsx          # Live camera detector
│   └── layout.tsx               # Root layout
│
├── backend/                      # FastAPI Server
│   ├── main.py                  # FastAPI application
│   ├── models/
│   │   └── yolov9_cbam.pt      # Your trained model (add this)
│   ├── requirements.txt         # Python dependencies
│   └── README.md               # Backend documentation
│
├── components/                   # Reusable UI components
├── QUICKSTART.md               # Quick start guide
├── SETUP.md                    # Detailed setup guide
└── IMPLEMENTATION_SUMMARY.md   # Technical summary
```

## API Endpoints

### Backend (FastAPI)

**Running on:** `http://localhost:8000`

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/` | API info |
| GET | `/health` | Health check |
| POST | `/predict-image` | Upload image for detection |
| WS | `/ws/camera` | WebSocket for live camera |

### Health Check
```bash
curl http://localhost:8000/health
```

### Image Detection
```bash
curl -X POST http://localhost:8000/predict-image \
  -F "file=@image.jpg"
```

### Live Camera (WebSocket)
```javascript
const ws = new WebSocket('ws://localhost:8000/ws/camera');
ws.send(JSON.stringify({
  type: 'frame',
  image: 'base64_encoded_jpeg'
}));
```

## Usage

### Image Upload
1. Go to "Upload Image" page
2. Select or drag a road image
3. Click "Detect Potholes"
4. View results with bounding boxes and confidence scores

### Live Camera
1. Go to "Live Camera" page
2. Click "Start Detection"
3. Allow camera access
4. Real-time detections appear with color-coded boxes:
   - 🟢 Green: High confidence (>80%)
   - 🟡 Yellow: Medium confidence (60-80%)
   - 🔴 Red: Low confidence (<60%)

## Configuration

### Confidence Threshold
Edit `backend/main.py` line ~130:
```python
conf=0.5  # Change to 0.6, 0.7, etc.
```

### Camera FPS
Edit `app/camera/page.tsx` line ~115:
```javascript
const targetFrameTime = 1000 / 15  // Change 15 to desired FPS
```

### Input Image Size
Edit `backend/main.py` line ~128:
```python
imgsz=640  # Change to 416, 512 for faster inference
```

## Performance

| Metric | Value |
|--------|-------|
| Model Accuracy | 0.86 mAP@0.50 |
| First Inference | ~2-5s (model loading) |
| Subsequent Inference | ~200-500ms |
| Live Camera FPS | 15 FPS (configurable) |
| WebSocket Latency | <100ms |

## Troubleshooting

### Backend Issues

**"Model not found"**
- Ensure `backend/models/yolov9_cbam.pt` exists
- Verify file size > 100MB

**"CUDA out of memory"**
- Reduce `imgsz` to 416 or 512
- Use CPU: change `device=0` to `device="cpu"`

**"Port 8000 already in use"**
- Kill existing process or use different port

### Frontend Issues

**"WebSocket connection failed"**
- Ensure backend is running
- Check browser console for errors

**"Camera access denied"**
- Grant camera permissions in browser
- Use HTTPS for production

## Deployment

### Docker
```bash
docker-compose up
```

Services will be available at:
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8000`

### Manual Deployment

**Backend:**
```bash
cd backend
pip install -r requirements.txt
gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app
```

**Frontend:**
```bash
npm run build
npm start
```

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS |
| UI Components | shadcn/ui |
| Backend | FastAPI, Uvicorn |
| AI/ML | PyTorch, Ultralytics YOLOv9 |
| Real-time | WebSocket |
| Computer Vision | OpenCV, PIL |

## Documentation

- **QUICKSTART.md** - Get started in 5 minutes
- **SETUP.md** - Detailed configuration and setup
- **IMPLEMENTATION_SUMMARY.md** - Technical architecture
- **backend/README.md** - Backend API documentation

## Model Information

- **Architecture:** YOLOv9+CBAM (Your custom trained model)
- **Classes:** 1 (Pothole)
- **Training:** Your provided Colab notebook
- **Accuracy:** 0.86 mAP@0.50
- **Input:** 640×640 images
- **Output:** Bounding boxes with confidence scores

## Features

### Image Upload
- ✓ Drag & drop interface
- ✓ File browser
- ✓ Image preview
- ✓ Annotated results
- ✓ Detection statistics
- ✓ Detailed analysis

### Live Camera
- ✓ Real-time WebSocket streaming
- ✓ Mobile-friendly
- ✓ Color-coded confidence
- ✓ FPS counter
- ✓ Live statistics
- ✓ Automatic stream management

### Backend
- ✓ GPU acceleration
- ✓ CORS support
- ✓ Error handling
- ✓ Base64 image encoding
- ✓ Async processing
- ✓ Connection management

## Common Tasks

### Change Model
Replace `backend/models/yolov9_cbam.pt` with your new model

### Add CORS for Production
Edit `backend/main.py`:
```python
allow_origins=["https://yourdomain.com"]
```

### Enable HTTPS
Use reverse proxy (nginx, Caddy) or Vercel for frontend

### Add Authentication
Implement FastAPI security (docs in backend/README.md)

## Performance Tips

1. **For faster inference:**
   - Reduce `imgsz` to 416-512
   - Use GPU if available
   - Increase batch size for multiple images

2. **For live camera:**
   - Lower FPS (try 10 instead of 15)
   - Reduce JPEG quality
   - Close other tabs/applications

3. **General optimization:**
   - Use SSD for model storage
   - Monitor with `nvidia-smi` (GPU)
   - Profile with Python `cProfile`

## Support & Issues

- **Setup issues:** See SETUP.md
- **API issues:** See backend/README.md
- **Quick help:** See QUICKSTART.md
- **Technical details:** See IMPLEMENTATION_SUMMARY.md

## License

Your trained YOLOv9+CBAM model and code.

## Next Steps

1. ✅ Download `best.pt` from training
2. ✅ Place in `backend/models/yolov9_cbam.pt`
3. ✅ Follow QUICKSTART.md
4. ✅ Test both image upload and camera
5. ✅ Deploy to production (optional)

---

**Happy pothole detecting!** 🚗🕳️

For detailed setup instructions, see **QUICKSTART.md** or **SETUP.md**
