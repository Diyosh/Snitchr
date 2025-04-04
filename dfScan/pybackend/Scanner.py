from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import numpy as np
import pytesseract
import cv2
import tensorflow as tf
from PIL import Image
from io import BytesIO
import re
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
from tensorflow.keras.preprocessing.image import ImageDataGenerator
import joblib
from fuzzywuzzy import fuzz
import pandas as pd
import random

os.environ['TF_DETERMINISTIC_OPS'] = '1'

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

pytesseract.pytesseract.tesseract_cmd = r'C:\\Program Files\\Tesseract-OCR\\tesseract.exe'

cnn_model = None
CNN_MODEL_PATH = "cnn_model/CatchEd_CNN_Balanced.keras"

text_model = None
vectorizer = None
TEXT_MODEL_PATH = "dataset_text/CatchEd_LogReg_Model.pkl"
VECTORIZER_PATH = "dataset_text/CatchEd_Tfidf_Vectorizer.pkl"

EDU_KEYWORDS = [
    "ched", "deped", "education", "school", "class suspension", "students",
    "semester", "tuition", "graduation", "k-12", "teacher", "elementary", "high school",
    "college", "senior high", "philippine education", "scholarship", "enrollment", 
    "university", "academic", "advisory", "deped order", "online class", "announcement",
    "modules", "exam", "board exam", "DepEd Philippines", "CHED Philippines", "walang pasok",
    "classes"
]

SUSPICIOUS_WORDS = [
    "breaking", "update", "trending", "urgent", "announcement", 
    "confirmed", "free", "official", "legit", "viral", "share", 
    "campaign", "election", "rally","spotted"
]

INFORMAL_WORDS = [
    "grabe", "besh", "lodi", "bakit", "hoy", "tol", "omg", "hehe", "huhu", 
    "lmao", "lol", "di ako sure", "haha", "diba", "ayoko", "char", "sana all", 
    "angas", "kulit", "kaloka", "amp", "sus", "hala", "awit"
]

MALICIOUS_WORDS = [
    "scam", "hacked", "fake", "hoax", "mislead", "fraud", 
    "beware", "clickbait", "phishing", "leak", "stolen", 
    "deceptive", "false", "break-up", "april fools", "ISCP",
    "hahaha"
]

def set_deterministic_seed(seed=42):
    os.environ['PYTHONHASHSEED'] = str(seed)
    np.random.seed(seed)
    random.seed(seed)
    tf.random.set_seed(seed)

def load_models():
    global cnn_model, text_model, vectorizer
    if os.path.exists(CNN_MODEL_PATH):
        cnn_model = tf.keras.models.load_model(CNN_MODEL_PATH)
        print("✅ CNN model loaded.")
    else:
        print("❌ CNN model not found.")

    if os.path.exists(TEXT_MODEL_PATH) and os.path.exists(VECTORIZER_PATH):
        text_model = joblib.load(TEXT_MODEL_PATH)
        vectorizer = joblib.load(VECTORIZER_PATH)
        print("✅ Logistic Regression model and vectorizer loaded.")
    else:
        print("❌ Text model or vectorizer not found.")

load_models()

def clean_ocr_text(text):
    text = text.encode('ascii', errors='ignore').decode()
    text = re.sub(r'[^a-zA-Z0-9\s.,!?\-]', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def is_education_related(text):
    text = text.lower()
    for keyword in EDU_KEYWORDS:
        if keyword in text:
            return True, keyword
        elif fuzz.partial_ratio(keyword, text) > 85:
            return True, f"fuzzy match: {keyword}"
    return False, None

def preprocess_image_for_ocr(image_bytes):
    image = Image.open(BytesIO(image_bytes)).convert("RGB")
    img_cv = np.array(image)
    gray = cv2.cvtColor(img_cv, cv2.COLOR_RGB2GRAY)
    denoised = cv2.bilateralFilter(gray, 9, 75, 75)
    return denoised, img_cv

def prepare_for_cnn(image_bytes):
    image = Image.open(BytesIO(image_bytes)).convert("RGB").resize((128, 128))
    return np.expand_dims(np.array(image) / 255.0, axis=0)

def predict_text_fake_news(text):
    if not text_model or not vectorizer:
        return None
    text_vector = vectorizer.transform([text])
    prediction = text_model.predict_proba(text_vector)[0][1]
    return prediction

def extract_analytics(text):
    lowered = text.lower()
    suspicious_count = sum(1 for word in SUSPICIOUS_WORDS if word in lowered)
    informal_count = sum(1 for word in INFORMAL_WORDS if word in lowered)
    malicious_count = sum(1 for word in MALICIOUS_WORDS if word in lowered)
    return {
        "suspicious_words": suspicious_count,
        "informal_words": informal_count,
        "malicious_words": malicious_count,
        "inconsistency_score": abs(suspicious_count - informal_count)
    }

@app.route('/predict/image', methods=['POST'])
def predict_image():
    if 'image' not in request.files:
        return jsonify({'error': 'No image uploaded.'}), 400

    set_deterministic_seed()
    image_bytes = request.files['image'].read()
    gray_img, original_img = preprocess_image_for_ocr(image_bytes)

    ocr_data = pytesseract.image_to_data(
        gray_img,
        output_type=pytesseract.Output.DICT,
        config="--psm 3"
    )

    extracted_text = ""
    text_boxes = []
    for i in range(len(ocr_data["text"])):
        word = ocr_data["text"][i].strip()
        if word:
            x, y, w, h = ocr_data["left"][i], ocr_data["top"][i], ocr_data["width"][i], ocr_data["height"][i]
            extracted_text += word + "\n"
            text_boxes.append({
                "text": word,
                "x": x,
                "y": y,
                "width": w,
                "height": h,
                "conf": ocr_data["conf"][i]
            })

    cleaned_text = clean_ocr_text(extracted_text)
    is_related, keyword = is_education_related(cleaned_text)

    if not is_related:
        return jsonify({
            "error": "The uploaded image appears to be out of scope and not related to the Philippine education system.",
            "detected_keyword": keyword,
            "extractedText": cleaned_text or "No text detected.",
            "textBoxes": text_boxes
        }), 400

    analytics = extract_analytics(cleaned_text)
    adjustment_count = analytics['suspicious_words'] + analytics['informal_words'] + analytics['malicious_words']

    text_fake = predict_text_fake_news(cleaned_text) or 0.5
    text_real = 1 - text_fake

    cnn_real, cnn_fake = 0.5, 0.5
    if cnn_model:
        prediction = cnn_model.predict(prepare_for_cnn(image_bytes))[0][0]
        cnn_fake = prediction
        cnn_real = 1 - cnn_fake

    if max(cnn_real, cnn_fake) < 0.6:
        combined_real = text_real * 100
        combined_fake = text_fake * 100
    elif max(text_real, text_fake) < 0.6:
        combined_real = cnn_real * 100
        combined_fake = cnn_fake * 100
    else:
        combined_real = ((cnn_real + text_real) / 2) * 100
        combined_fake = ((cnn_fake + text_fake) / 2) * 100

    # Apply 1% penalty per suspicious/informal/malicious word
    penalty = adjustment_count * 1.0
    combined_real = max(0, combined_real - penalty)
    combined_fake = min(100, combined_fake + penalty)

    final_prediction = "Fake" if combined_fake > combined_real else "Real"
    explanation = []
    if analytics["suspicious_words"]:
        explanation.append(f"Contains {analytics['suspicious_words']} suspicious word(s).")
    if analytics["informal_words"]:
        explanation.append(f"Contains {analytics['informal_words']} informal word(s).")
    if analytics["malicious_words"]:
        explanation.append(f"Contains {analytics['malicious_words']} malicious word(s).")
    if analytics["inconsistency_score"] > 1:
        explanation.append("Content shows inconsistency between suspicious and informal tone.")
    if not explanation:
        explanation.append("No strong indicators found — result based on model.")

    return jsonify({
        "extractedText": cleaned_text or "No text detected.",
        "textBoxes": text_boxes,
        "real": round(combined_real, 2),
        "fake": round(combined_fake, 2),
        "final_prediction": final_prediction,
        "prediction_confidence": round(max(combined_real, combined_fake), 2),
        "analytics": analytics,
        "adjustment_reason": f"-{penalty:.0f}% authenticity due to suspicious/informal/malicious content." if penalty > 0 else None,
        "no_engagement_warning": None,
        "explanation": explanation
    })

@app.route('/')
def home():
    return jsonify({"message": "CatchEd API is live"})

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, debug=True)