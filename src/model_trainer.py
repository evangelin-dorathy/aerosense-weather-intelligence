import os
import pickle
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.metrics import accuracy_score, mean_absolute_error, classification_report

def map_summary_to_category(summary):
    s = str(summary).lower()
    if 'fog' in s:
        return 'Foggy'
    elif 'rain' in s or 'drizzle' in s:
        return 'Rainy'
    elif 'clear' in s or 'dry' in s:
        if 'cloudy' in s or 'overcast' in s:
            return 'Cloudy/Overcast'
        return 'Clear/Sunny'
    else:
        return 'Cloudy/Overcast'

def train_models(dataset_path, models_dir):
    print(f"Loading dataset from {dataset_path}...")
    df = pd.read_csv(dataset_path)

    # Make sure output directory exists
    os.makedirs(models_dir, exist_ok=True)

    # Clean pressure (replace 0.0 pressure with median of non-zero pressure values)
    median_pressure = df[df['Pressure (millibars)'] > 200]['Pressure (millibars)'].median()
    if pd.isna(median_pressure):
        median_pressure = 1016.0  # default sea level pressure
    df['Pressure (millibars)'] = df['Pressure (millibars)'].replace(0.0, median_pressure)

    # Fill other NaNs if any
    df['Temperature (C)'] = df['Temperature (C)'].fillna(df['Temperature (C)'].median())
    df['Humidity'] = df['Humidity'].fillna(df['Humidity'].median())
    df['Wind Speed (km/h)'] = df['Wind Speed (km/h)'].fillna(df['Wind Speed (km/h)'].median())
    df['Visibility (km)'] = df['Visibility (km)'].fillna(df['Visibility (km)'].median())

    # ========================================================
    # 1. Rainfall Classifier
    # Predicts rain probability based on Temperature, Apparent Temperature, Humidity, Pressure, Wind Speed
    # ========================================================
    print("\n--- Training Rainfall Classifier ---")
    df['is_rain'] = (df['Precip Type'] == 'rain').astype(int)
    
    rain_features = ['Temperature (C)', 'Apparent Temperature (C)', 'Humidity', 'Pressure (millibars)', 'Wind Speed (km/h)']
    X_rain = df[rain_features]
    y_rain = df['is_rain']

    X_train_r, X_test_r, y_train_r, y_test_r = train_test_split(X_rain, y_rain, test_size=0.2, random_state=42)
    
    # Train Random Forest Classifier
    # Use max_depth and estimators limits for fast training and compact model size
    rain_model = RandomForestClassifier(n_estimators=50, max_depth=10, random_state=42, n_jobs=-1)
    rain_model.fit(X_train_r, y_train_r)
    
    y_pred_r = rain_model.predict(X_test_r)
    acc_r = accuracy_score(y_test_r, y_pred_r)
    print(f"Rainfall Classifier Accuracy: {acc_r * 100:.2f}%")
    print(classification_report(y_test_r, y_pred_r, target_names=['No Rain/Snow', 'Rain']))

    # Save rain model
    rain_model_path = os.path.join(models_dir, 'rain_model.pkl')
    with open(rain_model_path, 'wb') as f:
        pickle.dump(rain_model, f)
    print(f"Saved rain model to {rain_model_path}")


    # ========================================================
    # 2. Temperature Regressor
    # Uses daily averages and lag features (T-1, T-2, T-3) to predict temperature T
    # ========================================================
    print("\n--- Training Temperature Regressor ---")
    df['DateTime'] = pd.to_datetime(df['Formatted Date'], utc=True)
    df['Date'] = df['DateTime'].dt.date

    # Group by Date and calculate mean Temperature
    daily_df = df.groupby('Date').agg({
        'Temperature (C)': 'mean',
        'Humidity': 'mean',
        'Pressure (millibars)': 'mean',
        'Wind Speed (km/h)': 'mean'
    }).reset_index().sort_values('Date')

    # Create lag features
    for lag in [1, 2, 3]:
        daily_df[f'Temp_T_{lag}'] = daily_df['Temperature (C)'].shift(lag)

    # Drop NaNs created by lagging
    daily_df = daily_df.dropna().reset_index(drop=True)

    temp_features = ['Temp_T_1', 'Temp_T_2', 'Temp_T_3']
    X_temp = daily_df[temp_features]
    y_temp = daily_df['Temperature (C)']

    X_train_t, X_test_t, y_train_t, y_test_t = train_test_split(X_temp, y_temp, test_size=0.2, random_state=42)

    # Train Random Forest Regressor
    temp_model = RandomForestRegressor(n_estimators=50, max_depth=8, random_state=42, n_jobs=-1)
    temp_model.fit(X_train_t, y_train_t)

    y_pred_t = temp_model.predict(X_test_t)
    mae_t = mean_absolute_error(y_test_t, y_pred_t)
    print(f"Temperature Regressor MAE: {mae_t:.2f} C")

    # Save temp model
    temp_model_path = os.path.join(models_dir, 'temp_model.pkl')
    with open(temp_model_path, 'wb') as f:
        pickle.dump(temp_model, f)
    print(f"Saved temperature model to {temp_model_path}")


    # ========================================================
    # 3. Weather Classifier
    # Predicts high-level category (Clear/Sunny, Cloudy/Overcast, Rainy, Foggy)
    # ========================================================
    print("\n--- Training Weather Classifier ---")
    df['Category'] = df['Summary'].apply(map_summary_to_category)

    # Ensure class labels map consistently
    class_features = ['Temperature (C)', 'Humidity', 'Pressure (millibars)', 'Wind Speed (km/h)', 'Visibility (km)']
    X_class = df[class_features]
    y_class = df['Category']

    X_train_c, X_test_c, y_train_c, y_test_c = train_test_split(X_class, y_class, test_size=0.2, random_state=42)

    # Train Random Forest Classifier
    class_model = RandomForestClassifier(n_estimators=50, max_depth=12, random_state=42, n_jobs=-1)
    class_model.fit(X_train_c, y_train_c)

    y_pred_c = class_model.predict(X_test_c)
    acc_c = accuracy_score(y_test_c, y_pred_c)
    print(f"Weather Classifier Accuracy: {acc_c * 100:.2f}%")
    print(classification_report(y_test_c, y_pred_c))

    # Save class model
    class_model_path = os.path.join(models_dir, 'class_model.pkl')
    with open(class_model_path, 'wb') as f:
        pickle.dump(class_model, f)
    print(f"Saved weather classification model to {class_model_path}")

    print("\nModel training pipeline complete!")

if __name__ == "__main__":
    dataset = r"C:\Users\User\Downloads\archive (2)\weatherHistory.csv"
    models_path = r"C:\Users\User\.gemini\antigravity\scratch\weather_intelligence\models"
    train_models(dataset, models_path)
