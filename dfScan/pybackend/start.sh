#!/bin/bash

# Run your Flask app via Gunicorn
exec gunicorn Scanner:app --bind 0.0.0.0:$PORT
