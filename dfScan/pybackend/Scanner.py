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
from sklearn.metrics import classification_report, confusion_matrix  # type: ignore
import matplotlib.pyplot as plt  # type: ignore
from tensorflow.keras.preprocessing.image import ImageDataGenerator  # type: ignore
import joblib  # type: ignore 

# Initialize Flask app
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# Set Tesseract path
pytesseract.pytesseract.tesseract_cmd = r'C:\\Program Files\\Tesseract-OCR\\tesseract.exe'

# Load CNN model
cnn_model = None
CNN_MODEL_PATH = "cnn_model/CatchED_CNN.keras"
CNN_LABELS_FLIPPED = True

# Load NLP model
nlp_model = None
vectorizer = None
NLP_MODEL_PATH = "nlp_model/fake_news_nlp_model.pkl"
VECTORIZER_PATH = "nlp_model/vectorizer.pkl"

# Education keywords
EDU_KEYWORDS = [
    "ched", "deped", "education", "school", "students", "class suspension",
    "semester", "tuition", "graduation", "k-12", "teacher", "elementary", "high school",
    "college", "senior high", "philippine education", "scholarship", "enrollment", 
    "university", "academic"
]

# Load models
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

# Utility: Clean text

def clean_ocr_text(text):
    text = re.sub(r'[^\w\s.,!?-]', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

# Check if text is education-related

def is_education_related(text):
    text = text.lower()
    return any(keyword in text for keyword in EDU_KEYWORDS)

# Preprocess image for OCR

def preprocess_image_for_ocr(image_bytes):
    image = Image.open(BytesIO(image_bytes)).convert("RGB")
    img_cv = np.array(image)

    # Convert to grayscale
    gray = cv2.cvtColor(img_cv, cv2.COLOR_RGB2GRAY)

    # Denoise
    denoised = cv2.bilateralFilter(gray, 9, 75, 75)

    # Sharpen
    kernel = np.array([[0, -1, 0],
                       [-1, 5, -1],
                       [0, -1, 0]])
    sharpened = cv2.filter2D(denoised, -1, kernel)

    # Increase contrast
    contrasted = cv2.convertScaleAbs(sharpened, alpha=1.5, beta=0)

    # Adaptive Thresholding
    thresh = cv2.adaptiveThreshold(contrasted, 255,
                                   cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                   cv2.THRESH_BINARY, 11, 2)

    return Image.fromarray(thresh)

# Preprocess image for CNN

def prepare_for_cnn(image_bytes):
    image = Image.open(BytesIO(image_bytes)).convert("RGB").resize((128, 128))
    return np.expand_dims(np.array(image) / 255.0, axis=0)

# NLP-based prediction

def predict_text_fake_news(text):
    if not nlp_model or not vectorizer:
        return None
    text_vector = vectorizer.transform([text])
    prediction = nlp_model.predict_proba(text_vector)[0][1]  # Probability of being fake
    return prediction

# Main endpoint: Image → OCR + CNN + NLP Prediction

@app.route('/predict/image', methods=['POST'])
def predict_image():
    if 'image' not in request.files:
        return jsonify({'error': 'No image uploaded.'}), 400

    image_bytes = request.files['image'].read()

    # OCR text extraction
    processed_image = preprocess_image_for_ocr(image_bytes)
    extracted_text = pytesseract.image_to_string(processed_image).strip()
    cleaned_text = clean_ocr_text(extracted_text)

    # Check if content is education-related
    if not is_education_related(cleaned_text):
        return jsonify({
            "message": "❌ This post is not related to the scope of CatchED. Only education-related content in the Philippines is supported.",
            "extractedText": cleaned_text
        }), 200

    # CNN prediction
    cnn_real, cnn_fake = 0.5, 0.5
    if cnn_model:
        prediction = cnn_model.predict(prepare_for_cnn(image_bytes))[0][0]
        if CNN_LABELS_FLIPPED:
            cnn_fake = prediction
            cnn_real = 1 - prediction
        else:
            cnn_real = prediction
            cnn_fake = 1 - prediction

    # NLP prediction
    nlp_fake = predict_text_fake_news(cleaned_text)
    nlp_real = 1 - nlp_fake if nlp_fake is not None else None

    return jsonify({
        "extractedText": cleaned_text or "No text detected.",
        "cnn_prediction": {"real": round(cnn_real * 100, 2), "fake": round(cnn_fake * 100, 2)},
        "nlp_prediction": {"real": round(nlp_real * 100, 2), "fake": round(nlp_fake * 100, 2)} if nlp_fake is not None else "NLP model not available"
    })

# Evaluation route for CNN
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

    return jsonify({
        "classification_report": report,
        "confusion_matrix": conf_matrix,
        "labels": class_labels
    })

# Root test route
@app.route('/')
def home():
    return jsonify({"message": "CatchED API is live – Powered by CNN, OCR, and NLP 🔍🧠"})

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, debug=True)
