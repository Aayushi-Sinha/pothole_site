# Quick Start Guide

Get your pothole detection app running in 5 minutes!

## Prerequisites Checklist

- ✓ Downloaded your trained `best.pt` from Colab
- ✓ Python 3.10+ installed
- ✓ Node.js 18+ installed
- ✓ You're in the project root directory

## 1. Prepare Model (1 minute)

```bash
# Create models directory
mkdir -p backend/models

# Copy your trained model
cp /path/to/best.pt backend/models/yolov9_cbam.pt

# Verify it exists
ls -la backend/models/yolov9_cbam.pt
```

## 2. Start Backend (2 minutes)

**Terminal 1:**
```bash
cd backend

# Option A: With virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
python main.py

# Option B: Without virtual environment
pip install -r requirements.txt
python main.py
```

Wait for this output:
```
✅ Model loaded successfully!
INFO: Uvicorn running on http://0.0.0.0:8000
```

## 3. Start Frontend (1 minute)

**Terminal 2** (keep Terminal 1 running):
```bash
# In project root
npm install  # or pnpm install
npm run dev  # or pnpm dev
```

Wait for:
```
> Local:        http://localhost:3000
```

## 4. Test It!

1. Open **http://localhost:3000** in browser
2. Choose:
   - **Upload Image** - Upload a road photo
   - **Live Camera** - Real-time detection from camera

That's it! Your pothole detector is running!

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Model not found" | Check `backend/models/yolov9_cbam.pt` exists |
| "Connection refused" | Is backend running? Check Terminal 1 |
| "WebSocket failed" | Same as above - backend must be running |
| "Camera denied" | Allow permissions in browser settings |
| "Out of memory" | Reduce imgsz in backend/main.py (try 416) |

## Next Steps

- See **SETUP.md** for detailed configuration
- See **backend/README.md** for API documentation
- Modify confidence threshold in backend/main.py line ~130
- Change FPS in app/camera/page.tsx line ~115

## Performance Notes

- **First inference**: ~2-5 seconds (model loading)
- **Subsequent frames**: ~200-500ms per frame
- **Live camera**: ~15 FPS (can adjust)
- Use GPU if available for best performance

## Files Changed

```
project/
├── app/page.tsx               # Home page
├── app/upload/page.tsx        # Upload detector
├── app/camera/page.tsx        # Live camera detector  
├── app/layout.tsx             # Updated with bg color
├── backend/main.py            # FastAPI server
├── backend/models/yolov9_cbam.pt  # Your model (add this!)
├── backend/requirements.txt    # Python deps
├── SETUP.md                    # Full guide
└── QUICKSTART.md              # This file
```

Ready? Start the app and detect some potholes! 🚗
