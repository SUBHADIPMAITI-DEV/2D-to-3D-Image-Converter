# image_converter/forms.py

from django import forms

class ImageUploadForm(forms.Form):
    image = forms.ImageField()
