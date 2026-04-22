'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Play, Square, AlertCircle } from 'lucide-react'

interface Detection {
  class: string
  confidence: number
  x1: number
  y1: number
  x2: number
  y2: number
}

export default function CameraPage() {
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string>('')
  const [detections, setDetections] = useState<Detection[]>([])
  const [frameCount, setFrameCount] = useState(0)
  const [fps, setFps] = useState(0)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const animationRef = useRef<number | null>(null)
  const fpsTimerRef = useRef<number | null>(null)
  const lastFrameTimeRef = useRef<number>(0)

  // Initialize camera and WebSocket
  const startCamera = async () => {
    try {
      setError('')

      // Get camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }

      // Connect to WebSocket
      connectWebSocket()

      setIsStreaming(true)
      lastFrameTimeRef.current = Date.now()

      // Start FPS counter
      fpsTimerRef.current = window.setInterval(() => {
        setFps(Math.round(frameCount / 1))
        setFrameCount(0)
      }, 1000)

      // Start processing frames
      processFrames()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(`Camera access denied: ${errorMessage}`)
      console.error('Camera error:', err)
    }
  }

  // Connect to WebSocket
  const connectWebSocket = () => {
    try {
      wsRef.current = new WebSocket('ws://localhost:8000/ws/camera')

      wsRef.current.onopen = () => {
        console.log('WebSocket connected')
      }

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'detections') {
            setDetections(data.detections || [])
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err)
        }
      }

      wsRef.current.onerror = (err) => {
        console.error('WebSocket error:', err)
        setError('WebSocket connection failed. Is the backend running?')
      }

      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(`WebSocket connection failed: ${errorMessage}`)
    }
  }

  // Process video frames and send to WebSocket
  const processFrames = () => {
    if (!videoRef.current || !canvasRef.current || !isStreaming) {
      return
    }

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size to match video
    if (canvas.width === 0) {
      canvas.width = videoRef.current.videoWidth
      canvas.height = videoRef.current.videoHeight
    }

    // Draw video frame to canvas
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)

    // Get frame as JPEG and send via WebSocket
    canvas.toBlob(
      (blob) => {
        if (blob && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          const reader = new FileReader()
          reader.onload = (e) => {
            const base64 = (e.target?.result as string).split(',')[1]
            wsRef.current?.send(
              JSON.stringify({
                type: 'frame',
                image: base64,
              })
            )
          }
          reader.readAsDataURL(blob)
        }
      },
      'image/jpeg',
      0.8
    )

    setFrameCount((prev) => prev + 1)

    // Request next frame (aim for ~15 FPS to reduce server load)
    const now = Date.now()
    const timeSinceLastFrame = now - lastFrameTimeRef.current
    const targetFrameTime = 1000 / 15 // 15 FPS

    if (timeSinceLastFrame < targetFrameTime) {
      setTimeout(() => {
        animationRef.current = requestAnimationFrame(processFrames)
      }, targetFrameTime - timeSinceLastFrame)
    } else {
      animationRef.current = requestAnimationFrame(processFrames)
    }

    lastFrameTimeRef.current = now
  }

  // Stop camera and close WebSocket
  const stopCamera = () => {
    setIsStreaming(false)

    // Stop animation frame
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }

    // Stop FPS timer
    if (fpsTimerRef.current) {
      clearInterval(fpsTimerRef.current)
    }

    // Stop video stream
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
      tracks.forEach((track) => track.stop())
    }

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close()
    }

    setDetections([])
    setFrameCount(0)
    setFps(0)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isStreaming) {
        stopCamera()
      }
    }
  }, [isStreaming])

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/">
            <Button variant="outline" className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Live Camera Detection
          </h1>
          <p className="text-slate-300">
            Real-time pothole detection using your camera
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <Card className="bg-red-900/20 border-red-700 mb-6">
            <CardContent className="pt-6">
              <div className="flex gap-3 items-start">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Camera Feed */}
        <Card className="bg-slate-800/50 border-slate-700 mb-6">
          <CardHeader>
            <CardTitle className="text-white">Camera Feed</CardTitle>
            <CardDescription className="text-slate-400">
              {isStreaming
                ? 'Streaming... Detections will appear below'
                : 'Click "Start Detection" to begin'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Video Element */}
            <div className="relative w-full bg-black rounded-lg overflow-hidden aspect-video">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Hidden Canvas for Frame Capture */}
              <canvas
                ref={canvasRef}
                className="hidden"
              />

              {/* Overlay for Detections */}
              {isStreaming && (
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  viewBox={`0 0 ${canvasRef.current?.width || 640} ${canvasRef.current?.height || 480}`}
                >
                  {detections.map((det, idx) => {
                    const scaleX = (canvasRef.current?.width || 640)
                    const scaleY = (canvasRef.current?.height || 480)
                    const width = det.x2 - det.x1
                    const height = det.y2 - det.y1

                    // Color based on confidence
                    const confidence = det.confidence
                    const color =
                      confidence > 0.8
                        ? '#22c55e' // green
                        : confidence > 0.6
                          ? '#eab308' // yellow
                          : '#ef4444' // red

                    return (
                      <g key={idx}>
                        {/* Bounding Box */}
                        <rect
                          x={det.x1}
                          y={det.y1}
                          width={width}
                          height={height}
                          fill="none"
                          stroke={color}
                          strokeWidth="3"
                        />

                        {/* Label Background */}
                        <rect
                          x={det.x1}
                          y={Math.max(0, det.y1 - 25)}
                          width="100"
                          height="24"
                          fill={color}
                          opacity="0.8"
                        />

                        {/* Label Text */}
                        <text
                          x={det.x1 + 5}
                          y={Math.max(20, det.y1 - 5)}
                          fill="white"
                          fontSize="14"
                          fontWeight="bold"
                          fontFamily="monospace"
                        >
                          {(det.confidence * 100).toFixed(0)}%
                        </text>
                      </g>
                    )
                  })}
                </svg>
              )}

              {/* No Detections Message */}
              {isStreaming && detections.length === 0 && (
                <div className="absolute inset-0 flex items-end justify-center pb-4">
                  <p className="text-white text-sm bg-black/50 px-3 py-1 rounded">
                    No potholes detected
                  </p>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex gap-2">
              {!isStreaming ? (
                <Button
                  onClick={startCamera}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start Detection
                </Button>
              ) : (
                <Button
                  onClick={stopCamera}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                >
                  <Square className="w-4 h-4 mr-2" />
                  Stop Detection
                </Button>
              )}
            </div>

            {/* Stats */}
            {isStreaming && (
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-600">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-400">{detections.length}</p>
                  <p className="text-xs text-slate-400">Potholes</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-400">{fps}</p>
                  <p className="text-xs text-slate-400">FPS</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-400">
                    {detections.length > 0
                      ? (
                          (detections.reduce((sum, d) => sum + d.confidence, 0) /
                            detections.length) *
                          100
                        ).toFixed(0)
                      : '-'}
                  </p>
                  <p className="text-xs text-slate-400">Avg Conf</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-sm">Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-300">
            <p>1. Allow camera access when prompted</p>
            <p>2. Click "Start Detection" to begin real-time analysis</p>
            <p>3. Point camera at roads to detect potholes</p>
            <p>4. Green boxes = high confidence, Yellow = medium, Red = low</p>
            <p>5. Make sure the FastAPI backend is running on localhost:8000</p>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
