#!/bin/bash
gunicorn Scanner:app --bind 0.0.0.0:$PORT
