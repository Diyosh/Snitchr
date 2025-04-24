#!/bin/bash
apt-get update && apt-get install -y tesseract-ocr
exec gunicorn Scanner:app --bind 0.0.0.0:$PORT