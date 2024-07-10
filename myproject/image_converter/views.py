# image_converter/views.py

from django.shortcuts import render
from django.http import HttpResponse
from .forms import ImageUploadForm
import os
import torch
import numpy as np
import trimesh
from PIL import Image
from torchvision import transforms

def load_midas_model():
    model = torch.hub.load("isl-org/MiDaS", "MiDaS")
    model.eval()
    return model

def preprocess_image(image_path):
    image = Image.open(image_path).convert("RGB")
    transform = transforms.Compose([
        transforms.Resize(384),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    return transform(image).unsqueeze(0)

def estimate_depth(model, image_tensor):
    with torch.no_grad():
        depth = model(image_tensor)
    depth = depth.squeeze().cpu().numpy()
    return depth

def create_3d_model(depth_map):
    h, w = depth_map.shape
    x, y = np.meshgrid(np.arange(w), np.arange(h))
    z = depth_map
    vertices = np.stack((x, y, z), axis=-1).reshape(-1, 3)
    mesh = trimesh.Trimesh(vertices)
    return mesh

def save_3d_model(mesh, output_path):
    mesh.export(output_path)

def convert_to_3d(image_path, output_path):
    model = load_midas_model()
    image_tensor = preprocess_image(image_path)
    depth_map = estimate_depth(model, image_tensor)
    mesh = create_3d_model(depth_map)
    save_3d_model(mesh, output_path)

def index(request):
    form = ImageUploadForm()
    return render(request, 'index.html', {'form': form})

def upload_image(request):
    # if request.method == 'POST':
    #     form = ImageUploadForm(request.POST, request.FILES)
    #     if form.is_valid():
    #         image = form.cleaned_data['image']
    #         image_path = os.path.join('media/uploads', image.name)
    #         with open(image_path, 'wb+') as destination:
    #             for chunk in image.chunks():
    #                 destination.write(chunk)

    #         output_path = image_path.replace('.jpg', '.obj').replace('.png', '.obj')
    #         convert_to_3d(image_path, output_path)

    #         response = HttpResponse(open(output_path, 'rb').read())
    #         response['Content-Disposition'] = f'attachment; filename="{os.path.basename(output_path)}"'
    #         response['Content-Type'] = 'application/octet-stream'
    #         return response
    # return HttpResponse("Invalid request", status=400)

    if request.method == 'POST':
        form = ImageUploadForm(request.POST, request.FILES)
        if form.is_valid():
            image = form.cleaned_data['image']
            image_path = os.path.join('media/uploads', image.name)
            # Ensure the directory exists
            os.makedirs(os.path.dirname(image_path), exist_ok=True)
            # Save the uploaded file
            with open(image_path, 'wb+') as destination:
                for chunk in image.chunks():
                    destination.write(chunk)
            return HttpResponse(f'File uploaded to: {image_path}')
    return HttpResponse('Failed to upload file')
