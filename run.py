import os
import sys
import subprocess

# Add project root to sys.path
PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(PROJECT_DIR)

DATASET_PATH = r"C:\Users\User\Downloads\archive (2)\weatherHistory.csv"
SUMMARY_PATH = os.path.join(PROJECT_DIR, 'data', 'weather_summary.json')
MODELS_DIR = os.path.join(PROJECT_DIR, 'models')

def check_dataset():
    if not os.path.exists(DATASET_PATH):
        print(f"\n[ERROR] Szegedi weather dataset not found at expected path:")
        print(f"        {DATASET_PATH}")
        print("Please place the weatherHistory.csv in the correct folder or update the path.")
        sys.exit(1)
    print(f"[OK] Found dataset at {DATASET_PATH}")

def check_and_process_data():
    if not os.path.exists(SUMMARY_PATH):
        print("\n[INFO] Pre-computed weather summary JSON not found. Running data processor...")
        from src.data_processor import run_preprocessing
        try:
            run_preprocessing(DATASET_PATH, SUMMARY_PATH)
            print("[OK] Preprocessing completed.")
        except Exception as e:
            print(f"[ERROR] Data preprocessing failed: {e}")
            sys.exit(1)
    else:
        print("[OK] Pre-computed weather summary JSON already exists.")

def check_and_train_models():
    required_models = ['rain_model.pkl', 'temp_model.pkl', 'class_model.pkl']
    missing_models = [m for m in required_models if not os.path.exists(os.path.join(MODELS_DIR, m))]

    if missing_models:
        print(f"\n[INFO] Missing trained models: {missing_models}. Running model training pipeline...")
        from src.model_trainer import train_models
        try:
            train_models(DATASET_PATH, MODELS_DIR)
            print("[OK] All models trained and saved successfully.")
        except Exception as e:
            print(f"[ERROR] Model training pipeline failed: {e}")
            sys.exit(1)
    else:
        print("[OK] All trained machine learning model weights found.")

def start_server():
    print("\n[INFO] Starting Flask backend server on http://localhost:5000 ...")
    from src.server import app
    # Disable flask reloader if run from python command to avoid double execution of startup code
    app.run(host='127.0.0.1', port=5000, debug=False)

def main():
    print("==================================================================")
    print("      AeroSense Weather Intelligence System Initializer           ")
    print("==================================================================")
    
    check_dataset()
    check_and_process_data()
    check_and_train_models()
    
    start_server()

if __name__ == '__main__':
    main()
