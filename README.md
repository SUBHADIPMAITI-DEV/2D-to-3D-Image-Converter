# 2D to 3D Image Converter

A web application that converts 2D images to 3D models using advanced depth estimation techniques and machine learning.


## Features

- Upload 2D images via a simple drag-and-drop interface
- Convert images to 3D models with realistic depth
- Three visualization modes:
  - 3D Model: Detailed mesh with texture mapping
  - Textured 3D: Spherical model with normal and displacement mapping
  - Point Cloud: 3D point cloud representation with depth-based positioning
- Download generated 3D models in GLB/OBJ format
- Responsive design that works on desktop and mobile

## Tech Stack

### Frontend
- React.js with Next.js App Router
- Three.js and React Three Fiber for 3D rendering
- Tailwind CSS for styling
- TypeScript for type safety

### Backend
- Python with FastAPI
- PyTorch for ML models
- MiDaS for depth estimation
- OpenCV for image processing
- Trimesh for 3D mesh generation

## Installation

### Frontend

```bash
# Clone the repository
git clone https://github.com/SUBHADIPMAITI-DEV/2D-to-3D-Image-Converter.git
cd 2d-to-3d-converter

# Install dependencies
npm install

# Run the development server
npm run dev
```
# Demo Image : 
![image](https://github.com/user-attachments/assets/9ebd4285-8192-4bcb-9130-520d8eacf8c0)



