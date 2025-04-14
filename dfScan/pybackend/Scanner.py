from flask import Flask, request, jsonify  # type: ignore
from flask_cors import CORS  # type: ignore
from flask_sqlalchemy import SQLAlchemy  # type: ignore
import os
import numpy as np  # type: ignore
import pytesseract  # type: ignore
import cv2  # type: ignore
import tensorflow as tf  # type: ignore
from PIL import Image  # type: ignore
from io import BytesIO
import re
import joblib  # type: ignore
import random
import difflib
from datetime import datetime, date

os.environ['TF_DETERMINISTIC_OPS'] = '1'

app = Flask(__name__)
CORS(app)

# Neon PostgreSQL connection string
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://neondb_owner:npg_QSfIx6nTp9KO@ep-long-night-a584cdfz-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# Define the detection log model
class DetectionLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    final_prediction = db.Column(db.String(10))
    real_score = db.Column(db.Float)
    fake_score = db.Column(db.Float)

# Create tables on startup
with app.app_context():
    try:
        db.create_all()
        print("✅ Database tables ensured.")
    except Exception as e:
        print("❌ Error creating DB tables:", e)

pytesseract.pytesseract.tesseract_cmd = r'C:\\Program Files\\Tesseract-OCR\\tesseract.exe'

CNN_MODEL_PATH = "cnn_model/CatchEd_CNN_Balanced.keras"
TEXT_MODEL_PATH = "dataset_text/CatchEd_LogReg_Model.pkl"
VECTORIZER_PATH = "dataset_text/CatchEd_Tfidf_Vectorizer.pkl"

# Debug loading models
if os.path.exists(CNN_MODEL_PATH):
    cnn_model = tf.keras.models.load_model(CNN_MODEL_PATH)
    print("✅ CNN model loaded.")
else:
    cnn_model = None
    print("❌ CNN model not found:", CNN_MODEL_PATH)

if os.path.exists(TEXT_MODEL_PATH):
    text_model = joblib.load(TEXT_MODEL_PATH)
    print("✅ Logistic Regression model loaded.")
else:
    text_model = None
    print("❌ Logistic Regression model not found:", TEXT_MODEL_PATH)

if os.path.exists(VECTORIZER_PATH):
    vectorizer = joblib.load(VECTORIZER_PATH)
    print("✅ TF-IDF vectorizer loaded.")
else:
    vectorizer = None
    print("❌ TF-IDF vectorizer not found:", VECTORIZER_PATH)

# Keywords and institution links
EDU_KEYWORDS = [
    "ched", "deped", "education", "school", "students", "academic", "university",
    "tuition", "exam", "modules", "k-12", "DepEd Philippines", "CHED Philippines",
    "walang pasok", "board exam", "college", "class suspension"
]

SUSPICIOUS_WORDS = [
    "breaking", "update", "trending", "urgent","free", 
    "official", "legit", "viral","campaign", "election", 
    "rally", "spotted",
]

INFORMAL_WORDS = [
    "grabe", "besh", "lodi", "bakit", "hoy", "tol", "omg", "hehe", "huhu",
    "lmao", "lol", "di ako sure", "haha", "diba", "ayoko", "char", "sana all",
    "angas", "kulit", "kaloka","hala", "awit", "sana all"
]

MALICIOUS_WORDS = [
    "scam", "hacked", "fake", "hoax", "mislead", "fraud",
    "beware", "clickbait", "phishing", "leak", "stolen",
    "deceptive", "false", "break-up", "april fools", "iscp", "hahaha"
]

INSTITUTION_LINKS = {
    "ched": "https://www.facebook.com/CHEDphilippines",
    "deped": "https://www.facebook.com/DepEd.Philippines",
    "naga college foundation": "https://www.facebook.com/ncfph",
    "unc": "https://www.facebook.com/UNCPhOfficial",
    "usi": "https://www.facebook.com/usi.naga",
    "up": "https://www.facebook.com/UPSystemOfficial",
    "ateneo": "https://www.facebook.com/ateneodemanila",
    "bicol university": "https://www.facebook.com/BicolUniversityPH",
    "pup": "https://www.facebook.com/ThePUPOfficial",
    "ust": "https://www.facebook.com/UST1611official",
    "dlsu": "https://www.facebook.com/DLSU.Manila.Official",
    "ue": "https://www.facebook.com/UniversityoftheEastUE",
    "feu": "https://www.facebook.com/theFEU"
}

def clean_text(text):
    text = text.encode('ascii', errors='ignore').decode()
    return re.sub(r'\s+', ' ', re.sub(r'[^a-zA-Z0-9\s.,!?\-]', ' ', text)).strip()

def extract_analytics(text):
    lowered = text.lower()
    return {
        "suspicious_words": sum(1 for word in SUSPICIOUS_WORDS if word in lowered),
        "informal_words": sum(1 for word in INFORMAL_WORDS if word in lowered),
        "malicious_words": sum(1 for word in MALICIOUS_WORDS if word in lowered),
        "inconsistency_score": abs(sum(1 for word in SUSPICIOUS_WORDS if word in lowered) - sum(1 for word in INFORMAL_WORDS if word in lowered)),
        "detected_suspicious_words": [word for word in SUSPICIOUS_WORDS if word in lowered],
        "detected_informal_words": [word for word in INFORMAL_WORDS if word in lowered],
        "detected_malicious_words": [word for word in MALICIOUS_WORDS if word in lowered]
    }

def get_suggestions(text):
    text = text.lower()
    return [{"institution": k.title(), "link": v} for k, v in INSTITUTION_LINKS.items() if k in text]

def is_education_related(text):
    lowered = text.lower()
    if any(keyword in lowered for keyword in EDU_KEYWORDS):
        return True
    words = lowered.split()
    return any(difflib.SequenceMatcher(None, keyword, word).ratio() >= 0.7 for keyword in EDU_KEYWORDS for word in words)

def predict_text(text):
    if not text_model or not vectorizer:
        return 0.5
    vec = vectorizer.transform([text])
    return text_model.predict_proba(vec)[0][1]

def prepare_image(image_bytes):
    image = Image.open(BytesIO(image_bytes)).convert("RGB").resize((128, 128))
    return np.expand_dims(np.array(image) / 255.0, axis=0)

@app.route("/predict/image", methods=["POST"])
def predict_image():
    if 'image' not in request.files:
        return jsonify({"error": "No image uploaded."}), 400

    image_bytes = request.files['image'].read()
    image = Image.open(BytesIO(image_bytes)).convert("RGB")
    gray = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2GRAY)
    denoised = cv2.bilateralFilter(gray, 9, 75, 75)

    ocr_data = pytesseract.image_to_data(denoised, output_type=pytesseract.Output.DICT)
    text_boxes, extracted_text = [], ""
    for i in range(len(ocr_data["text"])):
        word = ocr_data["text"][i].strip()
        if word:
            extracted_text += word + "\n"
            text_boxes.append({
                "text": word,
                "x": ocr_data["left"][i],
                "y": ocr_data["top"][i],
                "width": ocr_data["width"][i],
                "height": ocr_data["height"][i],
                "conf": ocr_data["conf"][i]
            })

    cleaned = clean_text(extracted_text)
    if not is_education_related(cleaned):
        return jsonify({
            "error": "❌ Out of Scope: The uploaded news does not appear related to the Philippine education system.",
            "extractedText": cleaned or "No text detected.",
            "textBoxes": text_boxes
        }), 400

    analytics = extract_analytics(cleaned)
    suggestions = get_suggestions(cleaned)

    text_fake = predict_text(cleaned)
    text_real = 1 - text_fake

    cnn_real, cnn_fake = 0.5, 0.5
    if cnn_model:
        prediction = cnn_model.predict(prepare_image(image_bytes))[0][0]
        cnn_fake = prediction
        cnn_real = 1 - prediction

    combined_real = ((text_real + cnn_real) / 2) * 100
    combined_fake = ((text_fake + cnn_fake) / 2) * 100

    total_flags = analytics["suspicious_words"] + analytics["informal_words"] + analytics["malicious_words"]
    if total_flags >= 2:
        combined_real -= 40
        combined_fake += 40
    elif total_flags == 1:
        combined_real -= 30
        combined_fake += 30

    if suggestions:
        combined_real += 20
    else:
        combined_real -= 10
        combined_fake += 10

    combined_real = max(0, min(100, combined_real))
    combined_fake = max(0, min(100, combined_fake))

    final_prediction = "Fake" if combined_fake > combined_real else "Real"
    verdict_comment = "❌ It's more likely fake!" if final_prediction == "Fake" else "✅ It seems to be real."

    db.session.add(DetectionLog(final_prediction=final_prediction, real_score=combined_real, fake_score=combined_fake))
    db.session.commit()

    return jsonify({
        "extractedText": cleaned or "No text detected.",
        "textBoxes": text_boxes,
        "real": round(combined_real, 2),
        "fake": round(combined_fake, 2),
        "final_prediction": final_prediction,
        "prediction_confidence": round(max(combined_real, combined_fake), 2),
        "analytics": analytics,
        "adjustment_reason": f"Adjusted based on {total_flags} flagged word(s) and credible link presence.",
        "suggested_links": suggestions,
        "verdict": verdict_comment
    })

@app.route("/analytics/today", methods=["GET"])
def analytics_today():
    logs = DetectionLog.query.filter(
        db.func.date(DetectionLog.timestamp) == date.today()
    ).all()
    real_count = sum(1 for log in logs if log.final_prediction.lower() == 'real')
    fake_count = sum(1 for log in logs if log.final_prediction.lower() == 'fake')
    return jsonify({
        "date": date.today().isoformat(),
        "total": real_count + fake_count,
        "real": real_count,
        "fake": fake_count
    })

@app.route("/")
def home():
    return jsonify({"message": "CatchEd API is live"})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True, use_reloader=False)

