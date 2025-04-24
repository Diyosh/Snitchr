#!/bin/bash

# Set Tesseract path (Linux Render)
export TESSDATA_PREFIX=/usr/share/tesseract-ocr/4.00/tessdata
export PATH=$PATH:/usr/bin
export TESSERACT_CMD=/usr/bin/tesseract

# Run the server
exec gunicorn Scanner:app --bind 0.0.0.0:$PORT
