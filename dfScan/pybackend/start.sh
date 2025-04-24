#!/bin/bash

# Install Tesseract during container startup (runtime)
apt-get update && apt-get install -y tesseract-ocr

# Optional: print Tesseract version to confirm it's installed
tesseract --version

echo "✅ Checking Tesseract..."
tesseract --version || echo "❌ Still not found"

# Start Flask app with Gunicorn
exec gunicorn Scanner:app --bind 0.0.0.0:$PORT
