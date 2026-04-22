'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Upload, Loader2 } from 'lucide-react'

interface Detection {
  class: string
  confidence: number
  x1: number
  y1: number
  x2: number
  y2: number
  width: number
  height: number
  center_x: number
  center_y: number
}

interface PredictionResponse {
  success: boolean
  num_potholes: number
  detections: Detection[]
  annotated_image: string
  error?: string
}

export default function UploadPage() {
  const [image, setImage] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<PredictionResponse | null>(null)
  const [error, setError] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImage(file)
      setError('')
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string)
        setResult(null) // Clear previous results
      }
      reader.readAsDataURL(file)
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.currentTarget.classList.add('bg-slate-700')
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.currentTarget.classList.remove('bg-slate-700')
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.currentTarget.classList.remove('bg-slate-700')
    const file = e.dataTransfer.files?.[0]
    if (file) {
      setImage(file)
      setError('')
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string)
        setResult(null)
      }
      reader.readAsDataURL(file)
    }
  }

  const handlePredict = async () => {
    if (!image) {
      setError('Please select an image first')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', image)

      const response = await fetch('http://localhost:8000/predict-image', {
        method: 'POST',
        body: formData,
      })

      const data: PredictionResponse = await response.json()

      if (!response.ok) {
        setError(data.error || 'Prediction failed')
      } else {
        setResult(data)
      }
    } catch (err) {
      setError(
        err instanceof Error 
          ? err.message 
          : 'Failed to connect to backend. Ensure FastAPI server is running on localhost:8000'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="max-w-4xl mx-auto">
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
            Upload Image
          </h1>
          <p className="text-slate-300">
            Upload a road image to detect potholes
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload Section */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Select Image</CardTitle>
              <CardDescription className="text-slate-400">
                JPG, PNG up to 50MB
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Drag and Drop Area */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center cursor-pointer transition-colors hover:border-blue-500"
              >
                <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                <p className="text-slate-300 mb-1">
                  Drag and drop your image here
                </p>
                <p className="text-sm text-slate-500">
                  or click to select a file
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  onClick={(e) => {
                    const target = e.target as HTMLInputElement
                    target.value = ''
                  }}
                />
                <div
                  className="mt-4"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Button
                    type="button"
                    variant="secondary"
                    className="bg-slate-700 hover:bg-slate-600"
                  >
                    Browse Files
                  </Button>
                </div>
              </div>

              {/* Preview */}
              {previewUrl && (
                <div className="space-y-2">
                  <p className="text-sm text-slate-400">Preview:</p>
                  <div className="relative w-full bg-slate-900 rounded-lg overflow-hidden">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full h-auto"
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    {image?.name}
                  </p>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-900/20 border border-red-700 rounded-lg">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              {/* Predict Button */}
              <Button
                onClick={handlePredict}
                disabled={!image || loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Detecting...
                  </>
                ) : (
                  'Detect Potholes'
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Results Section */}
          <div className="space-y-4">
            {result && (
              <>
                {/* Annotated Image */}
                {result.annotated_image && (
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-white">Detection Result</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="relative w-full bg-slate-900 rounded-lg overflow-hidden">
                        <img
                          src={`data:image/jpeg;base64,${result.annotated_image}`}
                          alt="Detection result"
                          className="w-full h-auto"
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Statistics */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white">Statistics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300">Potholes Detected:</span>
                        <span className="text-2xl font-bold text-blue-400">
                          {result.num_potholes}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Detections List */}
                {result.detections.length > 0 && (
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-white text-sm">
                        Detection Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {result.detections.map((detection, idx) => (
                          <div
                            key={idx}
                            className="p-2 bg-slate-700/50 rounded border border-slate-600"
                          >
                            <p className="text-sm text-slate-300">
                              <span className="font-semibold">Pothole {idx + 1}</span>
                              <br />
                              Confidence:{' '}
                              <span className="text-blue-400">
                                {(detection.confidence * 100).toFixed(2)}%
                              </span>
                              <br />
                              Size: {detection.width}×{detection.height}px
                            </p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {!result && previewUrl && (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="pt-6">
                  <p className="text-slate-400 text-center">
                    Click "Detect Potholes" to analyze the image
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
