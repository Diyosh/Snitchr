#!/bin/bash

# Install Tesseract silently
apt-get update && apt-get install -y tesseract-ocr

# Run your app with Gunicorn
exec gunicorn Scanner:app --bind 0.0.0.0:$PORT
