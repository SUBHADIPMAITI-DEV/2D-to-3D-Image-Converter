"use client"

import { useState } from "react"
import { Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import ImageUploader from "@/components/image-uploader"
import ModelViewer from "@/components/model-viewer"
import ProcessingStatus from "@/components/processing-status"

export default function Home() {
  const [image, setImage] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [modelReady, setModelReady] = useState(false)
  const [processingStep, setProcessingStep] = useState<string>("")

  const handleImageUpload = (imageDataUrl: string) => {
    setImage(imageDataUrl)
    setModelReady(false)
  }

  const convertTo3D = async () => {
    if (!image) return

    setIsProcessing(true)
    setModelReady(false)

    // Simulate the processing steps that would happen on the backend
    setProcessingStep("Analyzing image structure...")
    await new Promise((resolve) => setTimeout(resolve, 1000))

    setProcessingStep("Generating depth map...")
    await new Promise((resolve) => setTimeout(resolve, 1500))

    setProcessingStep("Running 3D reconstruction model...")
    await new Promise((resolve) => setTimeout(resolve, 2000))

    setProcessingStep("Creating 3D mesh...")
    await new Promise((resolve) => setTimeout(resolve, 1500))

    setProcessingStep("Applying textures...")
    await new Promise((resolve) => setTimeout(resolve, 1000))

    setIsProcessing(false)
    setModelReady(true)
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-24 bg-gray-50">
      <h1 className="text-3xl font-bold mb-8 text-center">2D to 3D Image Converter</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-6xl">
        <div className="flex flex-col gap-4">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Upload 2D Image</h2>
            <ImageUploader onImageUpload={handleImageUpload} />

            {image && (
              <div className="mt-4">
                <h3 className="text-lg font-medium mb-2">Preview</h3>
                <div className="relative rounded-md overflow-hidden border border-gray-200 aspect-square">
                  <img
                    src={image || "/placeholder.svg"}
                    alt="Uploaded preview"
                    className="w-full h-full object-contain"
                  />
                </div>
                <Button className="w-full mt-4" onClick={convertTo3D} disabled={isProcessing}>
                  <Upload className="mr-2 h-4 w-4" />
                  Convert to 3D
                </Button>
              </div>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card className="p-6 h-full flex flex-col">
            <h2 className="text-xl font-semibold mb-4">3D Model Output</h2>

            {isProcessing ? (
              <ProcessingStatus step={processingStep} />
            ) : modelReady ? (
              <div className="flex-1 min-h-[400px]">
                <ModelViewer imageUrl={image} />
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center border border-dashed border-gray-300 rounded-md bg-gray-50 min-h-[400px]">
                <p className="text-gray-500 text-center">
                  {image ? "Click 'Convert to 3D' to generate model" : "Upload an image to get started"}
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </main>
  )
}
