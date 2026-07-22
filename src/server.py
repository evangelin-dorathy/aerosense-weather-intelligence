import os
import pickle
import json
from flask import Flask, jsonify, request, send_from_directory

app = Flask(__name__, static_folder='../static')

# Base paths
PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_DIR = os.path.join(PROJECT_DIR, 'models')
DATA_DIR = os.path.join(PROJECT_DIR, 'data')

# Global variables for models
rain_model = None
temp_model = None
class_model = None

def load_models():
    global rain_model, temp_model, class_model
    try:
        rain_path = os.path.join(MODELS_DIR, 'rain_model.pkl')
        temp_path = os.path.join(MODELS_DIR, 'temp_model.pkl')
        class_path = os.path.join(MODELS_DIR, 'class_model.pkl')

        print("Loading ML models...")
        if os.path.exists(rain_path):
            with open(rain_path, 'rb') as f:
                rain_model = pickle.load(f)
        else:
            print(f"Warning: rain_model.pkl not found at {rain_path}")

        if os.path.exists(temp_path):
            with open(temp_path, 'rb') as f:
                temp_model = pickle.load(f)
        else:
            print(f"Warning: temp_model.pkl not found at {temp_path}")

        if os.path.exists(class_path):
            with open(class_path, 'rb') as f:
                class_model = pickle.load(f)
        else:
            print(f"Warning: class_model.pkl not found at {class_path}")
            
    except Exception as e:
        print(f"Error loading models: {e}")

# Load models at startup
load_models()

@app.route('/')
def serve_index():
    static_dir = os.path.join(PROJECT_DIR, 'static')
    return send_from_directory(static_dir, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    static_dir = os.path.join(PROJECT_DIR, 'static')
    if os.path.exists(os.path.join(static_dir, path)):
        return send_from_directory(static_dir, path)
    return send_from_directory(static_dir, 'index.html')

@app.route('/api/trends', methods=['GET'])
def get_trends():
    summary_path = os.path.join(DATA_DIR, 'weather_summary.json')
    if not os.path.exists(summary_path):
        return jsonify({"error": "Trends summary data not found. Please run the preprocessing pipeline first."}), 404
    
    try:
        with open(summary_path, 'r') as f:
            data = json.load(f)
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": f"Failed to load trends data: {str(e)}"}), 500

@app.route('/api/predict', methods=['POST'])
def predict():
    # Reload models if they haven't been loaded
    global rain_model, temp_model, class_model
    if rain_model is None or temp_model is None or class_model is None:
        load_models()
        if rain_model is None or temp_model is None or class_model is None:
            return jsonify({"error": "ML models are not available. Please run the training pipeline."}), 503

    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid JSON payload"}), 400

        # Extract features
        temperature = float(data.get('temperature', 15.0))
        apparent_temp = float(data.get('apparent_temperature', 14.5))
        humidity = float(data.get('humidity', 0.65))
        pressure = float(data.get('pressure', 1013.25))
        wind_speed = float(data.get('wind_speed', 10.0))
        visibility = float(data.get('visibility', 10.0))
        
        # Lag temperatures for next-day forecast
        prev_temp_1 = float(data.get('prev_temp_1', temperature))
        prev_temp_2 = float(data.get('prev_temp_2', prev_temp_1))
        prev_temp_3 = float(data.get('prev_temp_3', prev_temp_2))

        # 1. Rain Probability Prediction
        # Features: Temperature (C), Apparent Temperature (C), Humidity, Pressure (millibars), Wind Speed (km/h)
        rain_features = [[temperature, apparent_temp, humidity, pressure, wind_speed]]
        rain_prob = rain_model.predict_proba(rain_features)[0][1] # Probability of class 1 (rain)

        # 2. Next-Day Temperature Forecasting
        # Features: Temp_T_1, Temp_T_2, Temp_T_3
        temp_features = [[prev_temp_1, prev_temp_2, prev_temp_3]]
        next_day_temp = temp_model.predict(temp_features)[0]

        # 3. Weather Classification
        # Features: Temperature (C), Humidity, Pressure (millibars), Wind Speed (km/h), Visibility (km)
        class_features = [[temperature, humidity, pressure, wind_speed, visibility]]
        weather_class = class_model.predict(class_features)[0]

        # Detailed probabilities for classification
        weather_classes = class_model.classes_
        class_probs = class_model.predict_proba(class_features)[0]
        class_distribution = {cls: float(prob) for cls, prob in zip(weather_classes, class_probs)}

        return jsonify({
            "success": True,
            "rain_probability": round(float(rain_prob) * 100, 1),
            "forecasted_temp": round(float(next_day_temp), 2),
            "weather_class": weather_class,
            "class_probabilities": class_distribution
        })

    except Exception as e:
        return jsonify({"error": f"Inference failed: {str(e)}"}), 500

if __name__ == '__main__':
    # Start the server on port 5000
    app.run(host='0.0.0.0', port=5000, debug=True)
