"use client"

import { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
import { Upload } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ImageUploaderProps {
  onImageUpload: (imageDataUrl: string) => void
}

export default function ImageUploader({ onImageUpload }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      setIsDragging(false)

      const file = acceptedFiles[0]
      if (!file) return

      // Check if the file is an image
      if (!file.type.startsWith("image/")) {
        alert("Please upload an image file")
        return
      }

      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = reader.result as string
        onImageUpload(dataUrl)
      }
      reader.readAsDataURL(file)
    },
    [onImageUpload],
  )

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".webp"],
    },
    maxFiles: 1,
    onDragEnter: () => setIsDragging(true),
    onDragLeave: () => setIsDragging(false),
  })

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
        ${isDragging || isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"}`}
    >
      <input {...getInputProps()} />

      <div className="flex flex-col items-center justify-center gap-2">
        <div className="bg-gray-100 p-3 rounded-full">
          <Upload className="h-6 w-6 text-gray-500" />
        </div>
        <p className="text-sm font-medium">Drag & drop an image here, or click to select</p>
        <p className="text-xs text-gray-500">Supports JPG, PNG, WEBP</p>

        <Button
          variant="outline"
          size="sm"
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            open()
          }}
          className="mt-2"
        >
          Select File
        </Button>
      </div>
    </div>
  )
}
