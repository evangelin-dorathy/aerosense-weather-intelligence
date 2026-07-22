# AeroSense: Weather Intelligence & Predictive Analytics System

AeroSense is a comprehensive weather analytics, classification, and forecasting system that processes the Szegedi weather history dataset, trains three separate machine learning models, and serves an interactive, highly polished glassmorphic dashboard.

## Features

- **Top Summary Grid**: Highlights overall metrics: average temperature, maximum recorded temperature, rain probability, and clear sky days.
- **Interactive Visualizations (Chart.js)**:
  - **Yearly Temperature Trends**: A smooth line chart showing multi-year average temperature movements.
  - **Monthly Temperature Ranges**: A clustered bar chart showing the minimum, average, and maximum temperatures for each month.
  - **Seasonal Weather Profile**: A radar chart comparing physical metrics (Temperature, Humidity, Wind Speed, Rain Probability, and Pressure) across all four seasons.
  - **Monthly Rainfall Probability**: A gradient line chart showing precipitation probability by month.
- **ML Live Predictions Console**: An interactive control board allowing real-time execution of trained machine learning models:
  - **Rainfall Classifier (Random Forest)**: Computes the precise probability of rain based on current conditions.
  - **Next-Day Temperature Forecaster (Random Forest Regressor)**: Uses historical time-series lag inputs (T-1, T-2, T-3) to predict tomorrow's average temperature.
  - **Weather Classifier (Random Forest Multi-class)**: Classifies current conditions into one of 4 major categories: *Clear/Sunny*, *Cloudy/Overcast*, *Rainy*, or *Foggy*, with an animated breakdown of class confidence probabilities.
- **Lightweight Single-Page Application (SPA)**: Hand-crafted modern CSS glassmorphism layout, responsive navigation, custom HSL color palette, and micro-animations.

---

## Directory Structure

```text
weather_intelligence/
├── data/
│   └── weather_summary.json       # Pre-computed trend data for fast dashboard loading
├── models/
│   ├── rain_model.pkl             # Trained Rainfall Classifier (Random Forest)
│   ├── temp_model.pkl             # Trained Temperature Regressor (Random Forest)
│   └── class_model.pkl            # Trained Weather Multi-class Classifier
├── src/
│   ├── __init__.py
│   ├── data_processor.py          # Weather trend analysis & aggregation logic
│   ├── model_trainer.py           # Machine learning training pipeline
│   └── server.py                  # Flask REST API and static server
├── static/
│   ├── index.html                 # Dashboard UI (Glassmorphic dark theme)
│   ├── style.css                  # Custom styling (modern colors, shadows)
│   └── app.js                     # Chart.js rendering & API integrations
├── requirements.txt               # Dependencies
└── run.py                         # Single command to train models and start the server
```

---

## Requirements

Before starting, ensure you have Python 3.8+ installed. You can install all dependencies using pip:

```bash
pip install -r requirements.txt
```

---

## Getting Started

1. **Verify Dataset Location**: Ensure the Szegedi dataset `weatherHistory.csv` is located at:
   `C:\Users\User\Downloads\archive (2)\weatherHistory.csv`
2. **Launch System**: Simply execute `run.py` from the project directory:
   ```bash
   python run.py
   ```
   *This command will automatically verify the dataset, aggregate historical statistics, train and serialize the three machine learning models if they don't exist yet, and launch the web server.*
3. **Open Dashboard**: Navigate to [http://localhost:5000](http://localhost:5000) in your web browser.

---

## Machine Learning Models Details

1. **Rainfall Prediction**: A `RandomForestClassifier` trained to predict the likelihood of rain using features: `Temperature (C)`, `Apparent Temperature (C)`, `Humidity`, `Pressure (millibars)`, and `Wind Speed (km/h)`.
2. **Next-Day Temperature forecasting**: A `RandomForestRegressor` that trains on daily aggregated temperature records, creating time-series lag metrics ($T-1, T-2, T-3$) to predict tomorrow's average temperature ($T$).
3. **Weather Classification**: A multi-class `RandomForestClassifier` that maps the 20+ distinct values in `Summary` to 4 high-level categories (`Clear/Sunny`, `Cloudy/Overcast`, `Rainy`, `Foggy`) using current physical indicators (`Temperature (C)`, `Humidity`, `Pressure (millibars)`, `Wind Speed (km/h)`, `Visibility (km)`).
