"use client"

import { useEffect, useRef, useState } from "react"
import { Canvas } from "@react-three/fiber"
import { OrbitControls, PerspectiveCamera, Center, Stage } from "@react-three/drei"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import * as THREE from "three"

interface ModelViewerProps {
  imageUrl: string | null
}

// Advanced depth estimation from 2D image
function estimateDepthMap(ctx: CanvasRenderingContext2D, width: number, height: number): ImageData {
  // Create a new canvas for the depth map
  const depthCanvas = document.createElement("canvas")
  const depthCtx = depthCanvas.getContext("2d")
  if (!depthCtx) throw new Error("Could not create depth map context")

  depthCanvas.width = width
  depthCanvas.height = height

  // Get the original image data
  const imageData = ctx.getImageData(0, 0, width, height)
  const data = imageData.data

  // Create depth map data
  const depthData = depthCtx.createImageData(width, height)
  const depthPixels = depthData.data

  // Simulate ML-based depth estimation
  // In a real implementation, this would use a trained model

  // 1. Edge detection (simple Sobel operator)
  const edgeMap = new Uint8Array(width * height)
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4

      // Get surrounding pixels
      const tl =
        (data[((y - 1) * width + (x - 1)) * 4] +
          data[((y - 1) * width + (x - 1)) * 4 + 1] +
          data[((y - 1) * width + (x - 1)) * 4 + 2]) /
        3
      const t =
        (data[((y - 1) * width + x) * 4] + data[((y - 1) * width + x) * 4 + 1] + data[((y - 1) * width + x) * 4 + 2]) /
        3
      const tr =
        (data[((y - 1) * width + (x + 1)) * 4] +
          data[((y - 1) * width + (x + 1)) * 4 + 1] +
          data[((y - 1) * width + (x + 1)) * 4 + 2]) /
        3
      const l =
        (data[(y * width + (x - 1)) * 4] + data[(y * width + (x - 1)) * 4 + 1] + data[(y * width + (x - 1)) * 4 + 2]) /
        3
      const r =
        (data[(y * width + (x + 1)) * 4] + data[(y * width + (x + 1)) * 4 + 1] + data[(y * width + (x + 1)) * 4 + 2]) /
        3
      const bl =
        (data[((y + 1) * width + (x - 1)) * 4] +
          data[((y + 1) * width + (x - 1)) * 4 + 1] +
          data[((y + 1) * width + (x - 1)) * 4 + 2]) /
        3
      const b =
        (data[((y + 1) * width + x) * 4] + data[((y + 1) * width + x) * 4 + 1] + data[((y + 1) * width + x) * 4 + 2]) /
        3
      const br =
        (data[((y + 1) * width + (x + 1)) * 4] +
          data[((y + 1) * width + (x + 1)) * 4 + 1] +
          data[((y + 1) * width + (x + 1)) * 4 + 2]) /
        3

      // Sobel X and Y
      const gx = -tl - 2 * l - bl + tr + 2 * r + br
      const gy = -tl - 2 * t - tr + bl + 2 * b + br

      // Edge magnitude
      const mag = Math.sqrt(gx * gx + gy * gy)
      edgeMap[y * width + x] = Math.min(255, mag)
    }
  }

  // 2. Brightness and contrast analysis
  const brightnessMap = new Uint8Array(width * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4
      const r = data[idx] / 255
      const g = data[idx + 1] / 255
      const b = data[idx + 2] / 255

      // Calculate brightness
      const brightness = (r + g + b) / 3
      brightnessMap[y * width + x] = brightness * 255
    }
  }

  // 3. Center-to-edge gradient (objects are often centered)
  const centerX = width / 2
  const centerY = height / 2
  const maxDist = Math.sqrt(centerX * centerX + centerY * centerY)

  // 4. Combine all factors to estimate depth
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4

      // Distance from center (normalized)
      const distX = x - centerX
      const distY = y - centerY
      const dist = Math.sqrt(distX * distX + distY * distY) / maxDist

      // Edge factor (edges often indicate depth changes)
      const edgeFactor = edgeMap[y * width + x] / 255

      // Brightness factor
      const brightnessFactor = brightnessMap[y * width + x] / 255

      // Combine factors to estimate depth
      // Objects in center are closer, brighter areas are closer, edges indicate depth changes
      let depth =
        0.5 +
        0.3 * (1 - dist) + // Center objects are closer
        0.3 * brightnessFactor + // Brighter areas are closer
        0.1 * edgeFactor // Edges affect depth

      // Normalize to 0-1 range
      depth = Math.max(0, Math.min(1, depth))

      // Store depth value (white = close, black = far)
      depthPixels[idx] = depthPixels[idx + 1] = depthPixels[idx + 2] = depth * 255
      depthPixels[idx + 3] = 255
    }
  }

  // Apply Gaussian blur to smooth the depth map
  depthCtx.putImageData(depthData, 0, 0)
  depthCtx.filter = "blur(4px)"
  depthCtx.drawImage(depthCanvas, 0, 0)

  return depthCtx.getImageData(0, 0, width, height)
}

// Create a 3D mesh from depth map
function createMeshFromDepthMap(
  depthData: ImageData,
  width: number,
  height: number,
  segmentsX = 128,
  segmentsY = 128,
): THREE.BufferGeometry {
  // Create a plane geometry
  const geometry = new THREE.PlaneGeometry(2, 2 * (height / width), segmentsX, segmentsY)
  const positionAttribute = geometry.getAttribute("position") as THREE.BufferAttribute
  const vertices = positionAttribute.array

  // Apply displacement based on depth map
  for (let i = 0; i < vertices.length / 3; i++) {
    const x = vertices[i * 3]
    const y = vertices[i * 3 + 1]

    // Map vertex position to depth map coordinates
    const u = Math.max(0, Math.min(1, x / 2 + 0.5))
    const v = Math.max(0, Math.min(1, y / 2 + 0.5))

    const pixelX = Math.floor(u * (width - 1))
    const pixelY = Math.floor((1 - v) * (height - 1))

    const pixelIndex = (pixelY * width + pixelX) * 4

    // Get depth value (normalized to 0-1)
    const depth = depthData.data[pixelIndex] / 255

    // Apply displacement along z-axis
    vertices[i * 3 + 2] = depth * 0.5
  }

  // Update geometry
  positionAttribute.needsUpdate = true
  geometry.computeVertexNormals()

  return geometry
}

// This creates a realistic 3D model from a 2D image
function RealisticModel({ imageUrl }: { imageUrl: string | null }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [texture, setTexture] = useState<THREE.Texture | null>(null)
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null)

  useEffect(() => {
    if (!imageUrl) return

    // Load the texture
    const textureLoader = new THREE.TextureLoader()
    textureLoader.crossOrigin = "anonymous"
    textureLoader.load(imageUrl, (loadedTexture) => {
      setTexture(loadedTexture)

      // Generate depth map and create 3D mesh
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.onload = () => {
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")
        if (!ctx) return

        canvas.width = img.width
        canvas.height = img.height
        ctx.drawImage(img, 0, 0)

        // Estimate depth map
        const depthMap = estimateDepthMap(ctx, canvas.width, canvas.height)

        // Create 3D mesh from depth map
        const mesh = createMeshFromDepthMap(depthMap, canvas.width, canvas.height)
        setGeometry(mesh)
      }

      img.src = imageUrl
    })
  }, [imageUrl])

  if (!texture || !geometry) return null

  return (
    <Center>
      <mesh ref={meshRef} geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial map={texture} side={THREE.DoubleSide} roughness={0.7} metalness={0.2} />
      </mesh>
    </Center>
  )
}

// This creates a 3D model with normal mapping
function NormalMappedModel({ imageUrl }: { imageUrl: string | null }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [maps, setMaps] = useState<{
    map: THREE.Texture | null
    normalMap: THREE.Texture | null
    displacementMap: THREE.Texture | null
  }>({
    map: null,
    normalMap: null,
    displacementMap: null,
  })

  useEffect(() => {
    if (!imageUrl) return

    // Load the texture
    const textureLoader = new THREE.TextureLoader()
    textureLoader.crossOrigin = "anonymous"
    textureLoader.load(imageUrl, (loadedTexture) => {
      // Generate normal and displacement maps
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.onload = () => {
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")
        if (!ctx) return

        canvas.width = img.width
        canvas.height = img.height
        ctx.drawImage(img, 0, 0)

        // Estimate depth map
        const depthMap = estimateDepthMap(ctx, canvas.width, canvas.height)

        // Create displacement map
        const dispCanvas = document.createElement("canvas")
        const dispCtx = dispCanvas.getContext("2d")
        if (!dispCtx) return

        dispCanvas.width = canvas.width
        dispCanvas.height = canvas.height
        dispCtx.putImageData(depthMap, 0, 0)

        const dispTexture = new THREE.Texture(dispCanvas)
        dispTexture.needsUpdate = true

        // Create normal map from depth map
        const normalCanvas = document.createElement("canvas")
        const normalCtx = normalCanvas.getContext("2d")
        if (!normalCtx) return

        normalCanvas.width = canvas.width
        normalCanvas.height = canvas.height

        // Simple normal map generation from depth map
        const normalData = normalCtx.createImageData(canvas.width, canvas.height)
        const normalPixels = normalData.data
        const depthPixels = depthMap.data

        for (let y = 1; y < canvas.height - 1; y++) {
          for (let x = 1; x < canvas.width - 1; x++) {
            const idx = (y * canvas.width + x) * 4

            // Get depth values of neighboring pixels
            const left = depthPixels[(y * canvas.width + (x - 1)) * 4] / 255
            const right = depthPixels[(y * canvas.width + (x + 1)) * 4] / 255
            const top = depthPixels[((y - 1) * canvas.width + x) * 4] / 255
            const bottom = depthPixels[((y + 1) * canvas.width + x) * 4] / 255

            // Calculate normal vector using central differences
            const dx = (right - left) * 2.0
            const dy = (bottom - top) * 2.0
            const dz = 1.0

            // Normalize the vector
            const length = Math.sqrt(dx * dx + dy * dy + dz * dz)
            const nx = dx / length
            const ny = dy / length
            const nz = dz / length

            // Convert normal to RGB (range 0-255)
            // Normal map format: RGB = (normal.x * 0.5 + 0.5, normal.y * 0.5 + 0.5, normal.z)
            normalPixels[idx] = (nx * 0.5 + 0.5) * 255
            normalPixels[idx + 1] = (ny * 0.5 + 0.5) * 255
            normalPixels[idx + 2] = nz * 255
            normalPixels[idx + 3] = 255
          }
        }

        normalCtx.putImageData(normalData, 0, 0)

        const normalTexture = new THREE.Texture(normalCanvas)
        normalTexture.needsUpdate = true

        setMaps({
          map: loadedTexture,
          normalMap: normalTexture,
          displacementMap: dispTexture,
        })
      }

      img.src = imageUrl
    })
  }, [imageUrl])

  if (!maps.map || !maps.normalMap || !maps.displacementMap) return null

  return (
    <Center>
      <mesh ref={meshRef} castShadow receiveShadow>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial
          map={maps.map}
          normalMap={maps.normalMap}
          displacementMap={maps.displacementMap}
          displacementScale={0.2}
          normalScale={new THREE.Vector2(1, 1)}
          roughness={0.7}
          metalness={0.2}
        />
      </mesh>
    </Center>
  )
}

// This creates a point cloud representation of the image with depth
function DepthPointCloudModel({ imageUrl }: { imageUrl: string | null }) {
  const pointsRef = useRef<THREE.Points>(null)
  const [points, setPoints] = useState<Float32Array | null>(null)
  const [colors, setColors] = useState<Float32Array | null>(null)

  useEffect(() => {
    if (!imageUrl) return

    // Create a canvas to analyze the image
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)

      // Estimate depth map
      const depthMap = estimateDepthMap(ctx, canvas.width, canvas.height)

      // Get image data for colors
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

      // Create points based on image pixels and depth
      const numPoints = 20000
      const pointsArray = new Float32Array(numPoints * 3)
      const colorsArray = new Float32Array(numPoints * 3)

      for (let i = 0; i < numPoints; i++) {
        // Sample a random pixel from the image
        const x = Math.floor(Math.random() * canvas.width)
        const y = Math.floor(Math.random() * canvas.height)
        const pixelIndex = (y * canvas.width + x) * 4

        // Get pixel color
        const r = imageData.data[pixelIndex] / 255
        const g = imageData.data[pixelIndex + 1] / 255
        const b = imageData.data[pixelIndex + 2] / 255
        const a = imageData.data[pixelIndex + 3] / 255

        // Skip transparent pixels
        if (a < 0.5) {
          i--
          continue
        }

        // Get depth value
        const depth = depthMap.data[pixelIndex] / 255

        // Map pixel coordinates to 3D space
        const xPos = (x / canvas.width) * 2 - 1
        const yPos = -((y / canvas.height) * 2 - 1)
        const zPos = depth * 0.5 - 0.25

        // Store position
        pointsArray[i * 3] = xPos
        pointsArray[i * 3 + 1] = yPos
        pointsArray[i * 3 + 2] = zPos

        // Store color
        colorsArray[i * 3] = r
        colorsArray[i * 3 + 1] = g
        colorsArray[i * 3 + 2] = b
      }

      setPoints(pointsArray)
      setColors(colorsArray)
    }

    img.src = imageUrl
  }, [imageUrl])

  if (!points || !colors) return null

  return (
    <Center>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={points.length / 3} array={points} itemSize={3} />
          <bufferAttribute attach="attributes-color" count={colors.length / 3} array={colors} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={0.01} vertexColors sizeAttenuation />
      </points>
    </Center>
  )
}

export default function ModelViewer({ imageUrl }: ModelViewerProps) {
  const [modelType, setModelType] = useState<"realistic" | "normal" | "pointcloud">("realistic")

  const handleDownload = () => {
    // In a real implementation, this would download the generated 3D model
    alert("In a real implementation, this would download the 3D model file (GLB/OBJ).")
  }

  return (
    <div className="relative h-full flex flex-col">
      <div className="absolute top-0 right-0 z-10 p-2">
        <Button variant="outline" size="sm" className="bg-white" onClick={handleDownload}>
          <Download className="h-4 w-4 mr-1" />
          Download Model
        </Button>
      </div>

      <div className="flex-1 min-h-[400px] bg-gray-100 rounded-md overflow-hidden">
        {imageUrl ? (
          <Canvas shadows camera={{ position: [0, 0, 2], fov: 50 }}>
            <PerspectiveCamera makeDefault position={[0, 0, 2]} />
            <ambientLight intensity={0.5} />
            <spotLight position={[5, 5, 5]} angle={0.15} penumbra={1} intensity={1} castShadow />
            <pointLight position={[-5, -5, -5]} intensity={0.5} />

            <Stage environment="studio" intensity={0.5} contactShadow shadows>
              {modelType === "realistic" && <RealisticModel imageUrl={imageUrl} />}
              {modelType === "normal" && <NormalMappedModel imageUrl={imageUrl} />}
              {modelType === "pointcloud" && <DepthPointCloudModel imageUrl={imageUrl} />}
            </Stage>

            <OrbitControls autoRotate autoRotateSpeed={0.5} />
          </Canvas>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <p className="text-gray-500">No image uploaded yet</p>
          </div>
        )}
      </div>

      <div className="mt-4 flex justify-center">
        <div className="flex bg-gray-100 p-1 rounded-md">
          <Button
            variant={modelType === "realistic" ? "default" : "ghost"}
            size="sm"
            onClick={() => setModelType("realistic")}
            className="rounded-r-none"
          >
            3D Model
          </Button>
          <Button
            variant={modelType === "normal" ? "default" : "ghost"}
            size="sm"
            onClick={() => setModelType("normal")}
            className="rounded-l-none rounded-r-none"
          >
            Textured 3D
          </Button>
          <Button
            variant={modelType === "pointcloud" ? "default" : "ghost"}
            size="sm"
            onClick={() => setModelType("pointcloud")}
            className="rounded-l-none"
          >
            Point Cloud
          </Button>
        </div>
      </div>
    </div>
  )
}
