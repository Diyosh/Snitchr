#!/bin/bash

echo "✅ Starting Gunicorn..."
exec gunicorn Scanner:app --bind 0.0.0.0:$PORT
