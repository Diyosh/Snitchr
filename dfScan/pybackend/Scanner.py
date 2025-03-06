from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import numpy as np
import pandas as pd
import pytesseract
import cv2
import tensorflow as tf
from PIL import Image
from io import BytesIO
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.model_selection import train_test_split
from sklearn.metrics import confusion_matrix, accuracy_score, f1_score

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

# Load datasets
def load_datasets():
    dataset_path = "fakenews_dset"
    df_fake = pd.read_csv(os.path.join(dataset_path, "Fake.csv"))
    df_true = pd.read_csv(os.path.join(dataset_path, "True.csv"))

    df_fake['label'] = 1
    df_true['label'] = 0
    df = pd.concat([df_fake, df_true], ignore_index=True).dropna(subset=['text'])
    return df

df = load_datasets()

# Train Naive Bayes model
X_train, X_test, y_train, y_test = train_test_split(df['text'], df['label'], test_size=0.2, random_state=42)
vectorizer = TfidfVectorizer()
X_train_tfidf = vectorizer.fit_transform(X_train)

model_nb = MultinomialNB().fit(X_train_tfidf, y_train)
from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import numpy as np
import pandas as pd
import pytesseract
import cv2
import tensorflow as tf
from PIL import Image
from io import BytesIO
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.model_selection import train_test_split
from sklearn.metrics import confusion_matrix, accuracy_score, f1_score

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

# Load datasets
def load_datasets():
    dataset_path = "fakenews_dset"
    df_fake = pd.read_csv(os.path.join(dataset_path, "Fake.csv"))
    df_true = pd.read_csv(os.path.join(dataset_path, "True.csv"))

    df_fake['label'] = 1
    df_true['label'] = 0
    df = pd.concat([df_fake, df_true], ignore_index=True).dropna(subset=['text'])
    return df

df = load_datasets()

# Train Naive Bayes model
X_train, X_test, y_train, y_test = train_test_split(df['text'], df['label'], test_size=0.2, random_state=42)
vectorizer = TfidfVectorizer()
X_train_tfidf = vectorizer.fit_transform(X_train)

model_nb = MultinomialNB().fit(X_train_tfidf, y_train)

# === Evaluation (prints only once at startup) ===
X_test_tfidf = vectorizer.transform(X_test)
y_pred = model_nb.predict(X_test_tfidf)

conf_matrix = confusion_matrix(y_test, y_pred)
accuracy = accuracy_score(y_test, y_pred)
f1 = f1_score(y_test, y_pred)

print("\n===== Naive Bayes Model Evaluation =====")
print(f"Confusion Matrix:\n{conf_matrix}")
print(f"Accuracy: {accuracy:.4f}")
print(f"F1 Score: {f1:.4f}")
print("=========================================\n")

# Load CNN Model
cnn_model = None
CNN_MODEL_PATH = "cnn_model/cnn_model (1).keras"
CNN_LABELS_FLIPPED = True

def load_cnn_model():
    global cnn_model
    if os.path.exists(CNN_MODEL_PATH):
        cnn_model = tf.keras.models.load_model(CNN_MODEL_PATH)
        print("✅ CNN model loaded")
    else:
        print("❌ CNN model not found")

load_cnn_model()

# Image Processing Functions
def preprocess_image_for_ocr(image_bytes):
    image = Image.open(BytesIO(image_bytes)).convert("L")
    img_cv = np.array(image)
    img_cv = cv2.GaussianBlur(img_cv, (5, 5), 0)
    img_cv = cv2.adaptiveThreshold(img_cv, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2)
    return Image.fromarray(img_cv)

def prepare_for_cnn(image_bytes):
    image = Image.open(BytesIO(image_bytes)).convert("RGB").resize((128, 128))
    return np.expand_dims(np.array(image) / 255.0, axis=0)

# API Routes
@app.route('/predict/text', methods=['POST'])
def predict_text():
    data = request.get_json()
    article = data.get('text', '').strip()

    if not article:
        return jsonify({'error': 'No text provided'}), 400

    article_tfidf = vectorizer.transform([article])
    proba = model_nb.predict_proba(article_tfidf)[0]

    return jsonify({
        "real": proba[0] * 100,
        "fake": proba[1] * 100,
    })

@app.route('/predict/image', methods=['POST'])
def predict_image():
    if 'image' not in request.files:
        return jsonify({'error': 'No image uploaded'}), 400

    image_bytes = request.files['image'].read()

    processed_image = preprocess_image_for_ocr(image_bytes)
    extracted_text = pytesseract.image_to_string(processed_image).strip()

    text_proba = [0.5, 0.5]
    if extracted_text:
        text_proba = model_nb.predict_proba(vectorizer.transform([extracted_text]))[0]

    image_real, image_fake = 0.5, 0.5
    if cnn_model:
        cnn_proba = cnn_model.predict(prepare_for_cnn(image_bytes))[0][0]
        if CNN_LABELS_FLIPPED:
            image_fake = cnn_proba
            image_real = 1 - cnn_proba
        else:
            image_real = cnn_proba
            image_fake = 1 - cnn_proba

    combined_real = (0.7 * text_proba[0]) + (0.3 * image_real)
    combined_fake = (0.7 * text_proba[1]) + (0.3 * image_fake)

    return jsonify({
        "extractedText": extracted_text or "No text detected",
        "real": combined_real * 100,
        "fake": combined_fake * 100
    })

@app.route('/')
def home():
    return jsonify({"message": "Fake News Scanner API is running."})

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, debug=True)

# === Evaluation (prints only once at startup) ===
X_test_tfidf = vectorizer.transform(X_test)
y_pred = model_nb.predict(X_test_tfidf)

conf_matrix = confusion_matrix(y_test, y_pred)
accuracy = accuracy_score(y_test, y_pred)
f1 = f1_score(y_test, y_pred)

print("\n===== Naive Bayes Model Evaluation =====")
print(f"Confusion Matrix:\n{conf_matrix}")
print(f"Accuracy: {accuracy:.4f}")
print(f"F1 Score: {f1:.4f}")
print("=========================================\n")

# Load CNN Model
cnn_model = None
CNN_MODEL_PATH = "cnn_model/cnn_model (1).keras"
CNN_LABELS_FLIPPED = True

def load_cnn_model():
    global cnn_model
    if os.path.exists(CNN_MODEL_PATH):
        cnn_model = tf.keras.models.load_model(CNN_MODEL_PATH)
        print("✅ CNN model loaded")
    else:
        print("❌ CNN model not found")

load_cnn_model()

# Image Processing Functions
def preprocess_image_for_ocr(image_bytes):
    image = Image.open(BytesIO(image_bytes)).convert("L")
    img_cv = np.array(image)
    img_cv = cv2.GaussianBlur(img_cv, (5, 5), 0)
    img_cv = cv2.adaptiveThreshold(img_cv, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2)
    return Image.fromarray(img_cv)

def prepare_for_cnn(image_bytes):
    image = Image.open(BytesIO(image_bytes)).convert("RGB").resize((128, 128))
    return np.expand_dims(np.array(image) / 255.0, axis=0)

# API Routes
@app.route('/predict/text', methods=['POST'])
def predict_text():
    data = request.get_json()
    article = data.get('text', '').strip()

    if not article:
        return jsonify({'error': 'No text provided'}), 400

    article_tfidf = vectorizer.transform([article])
    proba = model_nb.predict_proba(article_tfidf)[0]

    return jsonify({
        "real": proba[0] * 100,
        "fake": proba[1] * 100,
    })

@app.route('/predict/image', methods=['POST'])
def predict_image():
    if 'image' not in request.files:
        return jsonify({'error': 'No image uploaded'}), 400

    image_bytes = request.files['image'].read()

    processed_image = preprocess_image_for_ocr(image_bytes)
    extracted_text = pytesseract.image_to_string(processed_image).strip()

    text_proba = [0.5, 0.5]
    if extracted_text:
        text_proba = model_nb.predict_proba(vectorizer.transform([extracted_text]))[0]

    image_real, image_fake = 0.5, 0.5
    if cnn_model:
        cnn_proba = cnn_model.predict(prepare_for_cnn(image_bytes))[0][0]
        if CNN_LABELS_FLIPPED:
            image_fake = cnn_proba
            image_real = 1 - cnn_proba
        else:
            image_real = cnn_proba
            image_fake = 1 - cnn_proba

    combined_real = (0.7 * text_proba[0]) + (0.3 * image_real)
    combined_fake = (0.7 * text_proba[1]) + (0.3 * image_fake)

    return jsonify({
        "extractedText": extracted_text or "No text detected",
        "real": combined_real * 100,
        "fake": combined_fake * 100
    })

@app.route('/')
def home():
    return jsonify({"message": "Fake News Scanner API is running."})

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, debug=True)
