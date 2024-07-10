# image_converter/urls.py
from django.conf import settings
from django.conf.urls.static import static
from django.urls import path
from .views import index, upload_image

urlpatterns = [
    path('', index, name='index'),
    path('upload/', upload_image, name='upload_image'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)