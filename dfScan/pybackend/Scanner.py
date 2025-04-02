from flask import Flask, request, jsonify  # type: ignore
from flask_cors import CORS  # type: ignore
import os
import numpy as np  # type: ignore
import pytesseract  # type: ignore
import cv2  # type: ignore
import tensorflow as tf  # type: ignore
from PIL import Image  # type: ignore
from io import BytesIO
import re
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score  # type: ignore
from tensorflow.keras.preprocessing.image import ImageDataGenerator  # type: ignore
import joblib  # type: ignore
from fuzzywuzzy import fuzz  # type: ignore

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

pytesseract.pytesseract.tesseract_cmd = r'C:\\Program Files\\Tesseract-OCR\\tesseract.exe'

cnn_model = None
CNN_MODEL_PATH = "cnn_model/CatchED_CNN.keras"
CNN_LABELS_FLIPPED = True

nlp_model = None
vectorizer = None
NLP_MODEL_PATH = "nlp_model/fake_news_nlp_model.pkl"
VECTORIZER_PATH = "nlp_model/vectorizer.pkl"

EDU_KEYWORDS = [
    "ched", "deped", "education", "school", "class suspension", "students",
    "semester", "tuition", "graduation", "k-12", "teacher", "elementary", "high school",
    "college", "senior high", "philippine education", "scholarship", "enrollment", 
    "university", "academic", "advisory", "deped order", "online class", "announcement",
    "modules", "exam", "board exam", "DepEd Philippines", "CHED Philippines", "walang pasok"
]

def load_models():
    global cnn_model, nlp_model, vectorizer
    if os.path.exists(CNN_MODEL_PATH):
        cnn_model = tf.keras.models.load_model(CNN_MODEL_PATH)
        print("✅ CNN model loaded.")
    else:
        print("❌ CNN model not found.")

    if os.path.exists(NLP_MODEL_PATH) and os.path.exists(VECTORIZER_PATH):
        nlp_model = joblib.load(NLP_MODEL_PATH)
        vectorizer = joblib.load(VECTORIZER_PATH)
        print("✅ NLP model and vectorizer loaded.")
    else:
        print("❌ NLP model or vectorizer not found.")

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
    if not nlp_model or not vectorizer:
        return None
    text_vector = vectorizer.transform([text])
    prediction = nlp_model.predict_proba(text_vector)[0][1]
    return prediction

@app.route('/predict/image', methods=['POST'])
def predict_image():
    if 'image' not in request.files:
        return jsonify({'error': 'No image uploaded.'}), 400

    image_bytes = request.files['image'].read()
    gray_img, original_img = preprocess_image_for_ocr(image_bytes)

    ocr_data = pytesseract.image_to_data(
        gray_img,
        output_type=pytesseract.Output.DICT,
        config="--psm 1"
    )

    extracted_text = ""
    text_boxes = []

    for i in range(len(ocr_data["text"])):
        word = ocr_data["text"][i].strip()
        if word:
            x, y, w, h = ocr_data["left"][i], ocr_data["top"][i], ocr_data["width"][i], ocr_data["height"][i]
            extracted_text += word + " "
            text_boxes.append({
                "text": word,
                "x": x,
                "y": y,
                "width": w,
                "height": h,
                "conf": ocr_data["conf"][i]
            })

    cleaned_text = clean_ocr_text(extracted_text)
    print(f"📝 OCR Extracted Text: {cleaned_text}")
    is_related, keyword = is_education_related(cleaned_text)
    print(f"📚 Matched Education Keyword: {keyword if keyword else 'None'}")

    if not is_related:
        nlp_fake = predict_text_fake_news(cleaned_text)
        nlp_real = 1 - nlp_fake if nlp_fake is not None else None
        if nlp_fake is not None and nlp_real is not None and nlp_fake > 0.8:
            return jsonify({
                "extractedText": cleaned_text,
                "message": "⚠️ Post seems fake, but not related to PH education.",
                "nlp_prediction": {"real": round(nlp_real * 100, 2), "fake": round(nlp_fake * 100, 2)},
                "textBoxes": text_boxes
            }), 200
        return jsonify({
            "message": "❌ This post is not related to the scope of CatchED. Only education-related content in the Philippines is supported.",
            "extractedText": cleaned_text,
            "textBoxes": text_boxes
        }), 200

    cnn_real, cnn_fake = 0.5, 0.5
    if cnn_model:
        prediction = cnn_model.predict(prepare_for_cnn(image_bytes))[0][0]
        print(f"📈 Raw CNN prediction: {prediction}")
        if CNN_LABELS_FLIPPED:
            cnn_fake = prediction
            cnn_real = 1 - prediction
        else:
            cnn_real = prediction
            cnn_fake = 1 - prediction

    nlp_fake = predict_text_fake_news(cleaned_text)
    nlp_real = 1 - nlp_fake if nlp_fake is not None else None

    return jsonify({
        "extractedText": cleaned_text or "No text detected.",
        "textBoxes": text_boxes,
        "real": round(cnn_real * 100, 2),
        "fake": round(cnn_fake * 100, 2),
        "cnn_confidence": round(max(cnn_real, cnn_fake) * 100, 2),
        "nlp_prediction": {"real": round(nlp_real * 100, 2), "fake": round(nlp_fake * 100, 2)} if nlp_fake is not None else "NLP model not available"
    })

@app.route('/evaluate/cnn', methods=['GET'])
def evaluate_cnn():
    if not cnn_model:
        return jsonify({"error": "CNN model not loaded"}), 500

    DATASET_DIR = "dataset"
    IMAGE_SIZE = (128, 128)
    BATCH_SIZE = 32

    test_datagen = ImageDataGenerator(rescale=1./255, validation_split=0.2)
    test_generator = test_datagen.flow_from_directory(
        DATASET_DIR,
        target_size=IMAGE_SIZE,
        batch_size=BATCH_SIZE,
        class_mode='binary',
        subset='validation',
        shuffle=False
    )

    predictions = cnn_model.predict(test_generator)
    y_pred = (predictions > 0.5).astype(int).flatten()
    y_true = test_generator.classes

    class_labels = list(test_generator.class_indices.keys())
    report = classification_report(y_true, y_pred, target_names=class_labels, output_dict=True)
    conf_matrix = confusion_matrix(y_true, y_pred).tolist()
    accuracy = accuracy_score(y_true, y_pred)

    return jsonify({
        "classification_report": report,
        "confusion_matrix": conf_matrix,
        "accuracy": round(accuracy * 100, 2),
        "labels": class_labels
    })

@app.route('/')
def home():
    return jsonify({"message": "CatchEd API is live"})

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, debug=True)
