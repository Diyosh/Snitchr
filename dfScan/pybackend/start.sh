#!/bin/bash

# Install tesseract if not yet available
apt-get update && apt-get install -y tesseract-ocr

# Explicitly tell Python where to find tesseract
export TESSDATA_PREFIX=/usr/share/tesseract-ocr/4.00/tessdata
export PATH=$PATH:/usr/bin
export TESSERACT_CMD=/usr/bin/tesseract

# Run app with Gunicorn
exec gunicorn Scanner:app --bind 0.0.0.0:$PORT
