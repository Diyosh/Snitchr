from flask import Flask, request, jsonify # type: ignore
from flask_cors import CORS # type: ignore
import os
import numpy as np # type: ignore
import pytesseract # type: ignore
import cv2 # type: ignore
import tensorflow as tf # type: ignore
from PIL import Image # type: ignore
from io import BytesIO
import re
import joblib # type: ignore
import random
import difflib

os.environ['TF_DETERMINISTIC_OPS'] = '1'

app = Flask(__name__)
CORS(app)

pytesseract.pytesseract.tesseract_cmd = r'C:\\Program Files\\Tesseract-OCR\\tesseract.exe'

# Load paths
CNN_MODEL_PATH = "cnn_model/CatchEd_CNN_Balanced.keras"
TEXT_MODEL_PATH = "dataset_text/CatchEd_LogReg_Model.pkl"
VECTORIZER_PATH = "dataset_text/CatchEd_Tfidf_Vectorizer.pkl"

# Load models safely
cnn_model = tf.keras.models.load_model(CNN_MODEL_PATH) if os.path.exists(CNN_MODEL_PATH) else None
text_model = joblib.load(TEXT_MODEL_PATH) if os.path.exists(TEXT_MODEL_PATH) else None
vectorizer = joblib.load(VECTORIZER_PATH) if os.path.exists(VECTORIZER_PATH) else None

# Keywords and institution links
EDU_KEYWORDS = [
    "ched", "deped", "education", "school", "students", "academic", "university",
    "tuition", "exam", "modules", "k-12", "DepEd Philippines", "CHED Philippines",
    "walang pasok", "board exam", "college", "class suspension"
]

SUSPICIOUS_WORDS = [
    "breaking", "update", "trending", "urgent", "announcement", 
    "confirmed", "free", "official", "legit", "viral", "share", 
    "campaign", "election", "rally", "spotted"
]

INFORMAL_WORDS = [
    "grabe", "besh", "lodi", "bakit", "hoy", "tol", "omg", "hehe", "huhu", 
    "lmao", "lol", "di ako sure", "haha", "diba", "ayoko", "char", "sana all", 
    "angas", "kulit", "kaloka", "sus", "hala", "awit", "sana all"
]

MALICIOUS_WORDS = [
    "scam", "hacked", "fake", "hoax", "mislead", "fraud", 
    "beware", "clickbait", "phishing", "leak", "stolen", 
    "deceptive", "false", "break-up", "april fools", "iscp",
    "hahaha"
]

INSTITUTION_LINKS = {
    "ched": "https://ched.gov.ph",
    "deped": "https://www.deped.gov.ph",
    "naga college foundation": "https://www.facebook.com/ncfph",
    "unc": "https://www.facebook.com/UNCPhOfficial",
    "usi": "https://www.facebook.com/usi.naga",
    "up": "https://www.up.edu.ph",
    "ateneo": "https://www.adnu.edu.ph",
    "bicol university": "https://www.bicol-u.edu.ph",
    "pup": "https://www.pup.edu.ph",
    "ust": "https://www.ust.edu.ph",
    "dlsu": "https://www.dlsu.edu.ph",
    "ue": "https://www.ue.edu.ph",
    "feu": "https://www.feu.edu.ph"
}

def clean_text(text):
    text = text.encode('ascii', errors='ignore').decode()
    return re.sub(r'\s+', ' ', re.sub(r'[^a-zA-Z0-9\s.,!?\-]', ' ', text)).strip()

def extract_analytics(text):
    lowered = text.lower()
    detected_suspicious = [word for word in SUSPICIOUS_WORDS if word in lowered]
    detected_informal = [word for word in INFORMAL_WORDS if word in lowered]
    detected_malicious = [word for word in MALICIOUS_WORDS if word in lowered]
    return {
        "suspicious_words": len(detected_suspicious),
        "informal_words": len(detected_informal),
        "malicious_words": len(detected_malicious),
        "inconsistency_score": abs(len(detected_suspicious) - len(detected_informal)),
        "detected_suspicious_words": detected_suspicious,
        "detected_informal_words": detected_informal,
        "detected_malicious_words": detected_malicious
    }

def get_suggestions(text):
    suggestions = []
    text = text.lower()
    for keyword, url in INSTITUTION_LINKS.items():
        if keyword in text:
            suggestions.append({"institution": keyword.title(), "link": url})
    return suggestions

def is_education_related(text):
    lowered = text.lower()
    matches = []

    # Check for direct keyword presence
    for keyword in EDU_KEYWORDS:
        if keyword in lowered:
            return True

    # Fuzzy check: split text and compare chunks
    words = lowered.split()
    for keyword in EDU_KEYWORDS:
        for word in words:
            if difflib.SequenceMatcher(None, keyword, word).ratio() >= 0.7:
                matches.append(keyword)
    return len(matches) > 0


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

    # Scope limitation with fuzzy match
    if not is_education_related(cleaned):
        return jsonify({
            "error": "❌ Out of Scope: The uploaded news does not appear related to the Philippine education system.",
            "extractedText": cleaned or "No text detected.",
            "textBoxes": text_boxes
        }), 400

    analytics = extract_analytics(cleaned)
    suggestions = get_suggestions(cleaned)

    # Predictions
    text_fake = predict_text(cleaned)
    text_real = 1 - text_fake

    cnn_real, cnn_fake = 0.5, 0.5
    if cnn_model:
        prediction = cnn_model.predict(prepare_image(image_bytes))[0][0]
        cnn_fake = prediction
        cnn_real = 1 - prediction

    combined_real = ((text_real + cnn_real) / 2) * 100
    combined_fake = ((text_fake + cnn_fake) / 2) * 100

    # Adjust for word flags
    total_flags = analytics["suspicious_words"] + analytics["informal_words"] + analytics["malicious_words"]
    if total_flags >= 2:
        combined_real -= 40
        combined_fake += 40
    elif total_flags == 1:
        combined_real -= 30
        combined_fake += 30

    # Adjust for source credibility
    if suggestions:
        combined_real += 20
    else:
        combined_real -= 10
        combined_fake += 10

    # Clamp
    combined_real = max(0, min(100, combined_real))
    combined_fake = max(0, min(100, combined_fake))

    final_prediction = "Fake" if combined_fake > combined_real else "Real"
    verdict_comment = "❌ It's more likely fake!" if final_prediction == "Fake" else "✅ It seems to be real."

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

@app.route("/")
def home():
    return jsonify({"message": "CatchEd API is live"})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
