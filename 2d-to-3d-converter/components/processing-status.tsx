"use client"

import { Loader2 } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { useState, useEffect } from "react"

interface ProcessingStatusProps {
  step: string
}

export default function ProcessingStatus({ step }: ProcessingStatusProps) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    // Reset progress when step changes
    setProgress(0)

    // Animate progress for each step
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          return 100
        }
        return prev + 2
      })
    }, 50)

    return () => clearInterval(interval)
  }, [step])

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
      <Loader2 className="h-12 w-12 text-blue-500 animate-spin mb-4" />
      <h3 className="text-lg font-medium mb-3">{step}</h3>
      <div className="w-full max-w-md mb-2">
        <Progress value={progress} className="h-2" />
      </div>
      <p className="text-sm text-gray-500">This may take a few moments...</p>
    </div>
  )
}
