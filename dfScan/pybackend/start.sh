#!/bin/bash

# (optional) Log Tesseract version
tesseract --version || echo "❌ Tesseract not detected"

# Run Flask app with Gunicorn
exec gunicorn Scanner:app --bind 0.0.0.0:$PORT
