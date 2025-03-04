from flask import Flask, request, jsonify # type: ignore
from flask_cors import CORS # type: ignore
import os
import numpy as np # type: ignore
import pandas as pd # type: ignore
import pytesseract # type: ignore
import cv2 # type: ignore
import tensorflow as tf # type: ignore
from PIL import Image # type: ignore
from io import BytesIO
from sklearn.feature_extraction.text import TfidfVectorizer # type: ignore
from sklearn.naive_bayes import MultinomialNB # type: ignore
from sklearn.model_selection import train_test_split # type: ignore
from sklearn.metrics import accuracy_score, f1_score, confusion_matrix # type: ignore

app = Flask(__name__)
CORS(app)

# Set Tesseract Path
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

# Load Fake and Real news datasets
DATASET_PATH = "fakenews_dset"
df_fake = pd.read_csv(os.path.join(DATASET_PATH, "Fake.csv"))
df_true = pd.read_csv(os.path.join(DATASET_PATH, "True.csv"))

# Assign labels
df_fake['label'] = 1  # 1 = Fake
df_true['label'] = 0  # 0 = Real

# Combine datasets
df = pd.concat([df_fake, df_true], ignore_index=True).dropna(subset=['text'])

# Train-test split
X_train, X_test, y_train, y_test = train_test_split(df['text'], df['label'], test_size=0.2, random_state=42)

# Convert text to TF-IDF features
vectorizer = TfidfVectorizer()
X_train_tfidf = vectorizer.fit_transform(X_train)
X_test_tfidf = vectorizer.transform(X_test)

# Train Naïve Bayes Model
model_nb = MultinomialNB()
model_nb.fit(X_train_tfidf, y_train)

# Evaluate Naive Bayes Model
y_pred = model_nb.predict(X_test_tfidf)
print(f"✅ Naive Bayes Accuracy: {accuracy_score(y_test, y_pred) * 100:.2f}%")
print(f"✅ Naive Bayes F1 Score: {f1_score(y_test, y_pred):.2f}")
print(f"✅ Naive Bayes Confusion Matrix:\n{confusion_matrix(y_test, y_pred)}")

# Load CNN Model
cnn_model = None
CNN_MODEL_PATH = "cnn_model/cnn_model (1).keras"  # This is your new folder structure
CNN_LABELS_FLIPPED = True  # Set to True if CNN labels were reversed (1 = Real, 0 = Fake)

def load_cnn_model():
    global cnn_model
    if os.path.exists(CNN_MODEL_PATH):
        try:
            cnn_model = tf.keras.models.load_model(CNN_MODEL_PATH)
            print("✅ CNN model loaded successfully!")
        except Exception as e:
            print(f"⚠️ Error loading CNN model: {e}")
    else:
        print(f"❌ CNN model file not found at {CNN_MODEL_PATH}")

load_cnn_model()

# Image Processing Functions
def preprocess_image(image_bytes):
    image = Image.open(BytesIO(image_bytes)).convert("L")
    img_cv = np.array(image)
    img_cv = cv2.GaussianBlur(img_cv, (5, 5), 0)
    img_cv = cv2.adaptiveThreshold(img_cv, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2)
    return Image.fromarray(img_cv)

def prepare_for_cnn(image_bytes):
    image = Image.open(BytesIO(image_bytes)).convert("RGB").resize((128, 128))
    return np.expand_dims(np.array(image) / 255.0, axis=0)

# Routes
@app.route('/predict/text', methods=['POST'])
def predict_text():
    data = request.get_json()
    article = data.get('article', '').strip()

    if not article:
        return jsonify({'error': 'No text provided'}), 400

    article_tfidf = vectorizer.transform([article])
    proba = model_nb.predict_proba(article_tfidf)[0]

    return jsonify({
        "text_based_prediction": {
            "Real": f"{proba[0] * 100:.2f}%",
            "Fake": f"{proba[1] * 100:.2f}%"
        }
    })

@app.route('/predict/image', methods=['POST'])
def predict_image():
    if 'image' not in request.files:
        return jsonify({'error': 'No image uploaded'}), 400

    image_bytes = request.files['image'].read()
    processed_image = preprocess_image(image_bytes)
    extracted_text = pytesseract.image_to_string(processed_image).strip()

    if not extracted_text:
        return jsonify({"error": "No text detected"}), 400

    # Text-based prediction
    text_proba = model_nb.predict_proba(vectorizer.transform([extracted_text]))[0]

    # CNN-based prediction (with label flip support)
    if cnn_model:
        image_proba = cnn_model.predict(prepare_for_cnn(image_bytes))[0][0]
        print(f"🔍 Raw CNN Model Probability (Fake class): {image_proba:.4f}")

        if CNN_LABELS_FLIPPED:
            image_real = image_proba  # Assume Real = 1 in flipped case
            image_fake = 1 - image_proba
        else:
            image_fake = image_proba  # Assume Fake = 1 normally
            image_real = 1 - image_proba
    else:
        image_real, image_fake = 0.5, 0.5  # Default if model not loaded

    return jsonify({
        "extracted_text": extracted_text,
        "text_based_prediction": {
            "Real": f"{text_proba[0] * 100:.2f}%",
            "Fake": f"{text_proba[1] * 100:.2f}%"
        },
        "image_based_prediction": {
            "Real": f"{image_real * 100:.2f}%",
            "Fake": f"{image_fake * 100:.2f}%"
        }
    })

if __name__ == "__main__":
    app.run(debug=True)
