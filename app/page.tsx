'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ImageIcon, Camera } from 'lucide-react'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12 pt-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
            Pothole Detection
          </h1>
          <p className="text-lg text-slate-300">
            AI-powered road damage detection using YOLOv9+CBAM
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-blue-400">0.86</p>
            <p className="text-sm text-slate-300">mAP@0.50</p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-blue-400">YOLOv9+</p>
            <p className="text-sm text-slate-300">CBAM Architecture</p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-blue-400">1 Class</p>
            <p className="text-sm text-slate-300">Single-class Detection</p>
          </div>
        </div>

        {/* Detection Methods */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {/* Image Upload */}
          <Link href="/upload">
            <Card className="h-full bg-slate-800/50 border-slate-700 hover:border-blue-500 hover:bg-slate-800/70 transition-all cursor-pointer">
              <CardHeader>
                <ImageIcon className="w-8 h-8 text-blue-400 mb-2" />
                <CardTitle className="text-white">Upload Image</CardTitle>
                <CardDescription className="text-slate-400">
                  Analyze a photo of a road
                </CardDescription>
              </CardHeader>
              <CardContent className="text-slate-400">
                <p>
                  Upload an image file to detect potholes. Get instant results with bounding boxes and confidence scores.
                </p>
              </CardContent>
            </Card>
          </Link>

          {/* Live Camera */}
          <Link href="/camera">
            <Card className="h-full bg-slate-800/50 border-slate-700 hover:border-green-500 hover:bg-slate-800/70 transition-all cursor-pointer">
              <CardHeader>
                <Camera className="w-8 h-8 text-green-400 mb-2" />
                <CardTitle className="text-white">Live Camera</CardTitle>
                <CardDescription className="text-slate-400">
                  Real-time detection on mobile
                </CardDescription>
              </CardHeader>
              <CardContent className="text-slate-400">
                <p>
                  Open your camera for real-time pothole detection. Perfect for on-the-go road inspections.
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Features */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Features</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-slate-300">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                Real-time pothole detection with WebSocket
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                Mobile-optimized interface
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                High-accuracy YOLOv9+CBAM model
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                Detailed confidence scores
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                GPU acceleration support
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Backend Status */}
        <div className="mt-8 p-4 bg-slate-800/50 border border-slate-700 rounded-lg text-center text-sm text-slate-400">
          <p>
            Backend running on <code className="bg-slate-900 px-2 py-1 rounded">localhost:8000</code>
          </p>
          <p className="mt-2">
            Make sure the FastAPI backend is running before using detection features.
          </p>
        </div>
      </div>
    </main>
  )
}
