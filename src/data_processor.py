import os
import json
import pandas as pd
import numpy as np

def run_preprocessing(dataset_path, output_json_path):
    print(f"Loading dataset from {dataset_path}...")
    df = pd.read_csv(dataset_path)

    # 1. Date parsing
    print("Parsing dates and extracting date parts...")
    # Formatted Date format: 2006-04-01 00:00:00.000 +0200
    df['DateTime'] = pd.to_datetime(df['Formatted Date'], utc=True)
    df['Year'] = df['DateTime'].dt.year
    df['Month'] = df['DateTime'].dt.month
    df['Date'] = df['DateTime'].dt.date

    # Define seasons
    # Winter: Dec-Feb (12, 1, 2)
    # Spring: Mar-May (3, 4, 5)
    # Summer: Jun-Aug (6, 7, 8)
    # Autumn: Sep-Nov (9, 10, 11)
    month_to_season = {
        12: 'Winter', 1: 'Winter', 2: 'Winter',
        3: 'Spring', 4: 'Spring', 5: 'Spring',
        6: 'Summer', 7: 'Summer', 8: 'Summer',
        9: 'Autumn', 10: 'Autumn', 11: 'Autumn'
    }
    df['Season'] = df['Month'].map(month_to_season)

    # Rain and Clear flags
    df['is_rain'] = (df['Precip Type'] == 'rain').astype(int)
    
    # Check if a day is clear
    # Define Clear categories as we did in mappings
    def is_clear_summary(summary):
        s = str(summary).lower()
        if 'clear' in s or 'dry' in s:
            if 'cloudy' not in s and 'overcast' not in s:
                return 1
        return 0
    df['is_clear'] = df['Summary'].apply(is_clear_summary)

    # Compute overall statistics
    print("Calculating overall statistics...")
    avg_temp = float(df['Temperature (C)'].mean())
    max_temp = float(df['Temperature (C)'].max())
    rain_ratio = float(df['is_rain'].mean())
    
    # Clear sky days: group by Date to see if a day is mostly clear, or average clear hours
    daily_clear = df.groupby('Date')['is_clear'].mean()
    clear_days_ratio = float((daily_clear > 0.5).mean()) # fraction of days with >50% clear hours

    # Compute yearly average temperature trend
    print("Calculating yearly temperature trends...")
    yearly_avg = df.groupby('Year')['Temperature (C)'].mean().sort_index()
    yearly_trend = {
        "years": [int(y) for y in yearly_avg.index],
        "temps": [round(float(t), 2) for t in yearly_avg.values]
    }

    # Compute monthly temperature statistics (for box plot representation)
    print("Calculating monthly temperature distributions...")
    monthly_stats = []
    month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    for m in range(1, 13):
        m_df = df[df['Month'] == m]['Temperature (C)']
        q_min = float(m_df.min())
        q1 = float(m_df.quantile(0.25))
        q_median = float(m_df.median())
        q3 = float(m_df.quantile(0.75))
        q_max = float(m_df.max())
        monthly_stats.append({
            "month": month_names[m - 1],
            "min": round(q_min, 2),
            "q1": round(q1, 2),
            "median": round(q_median, 2),
            "q3": round(q3, 2),
            "max": round(q_max, 2),
            "avg": round(float(m_df.mean()), 2)
        })

    # Compute seasonal metrics
    print("Calculating seasonal averages...")
    seasons = ['Winter', 'Spring', 'Summer', 'Autumn']
    seasonal_data = {}
    for s in seasons:
        s_df = df[df['Season'] == s]
        seasonal_data[s] = {
            "temp": round(float(s_df['Temperature (C)'].mean()), 2),
            "humidity": round(float(s_df['Humidity'].mean()), 3),
            "wind_speed": round(float(s_df['Wind Speed (km/h)'].mean()), 2),
            "pressure": round(float(s_df[s_df['Pressure (millibars)'] > 200]['Pressure (millibars)'].mean()), 2), # exclude invalid 0 pressure readings for mean
            "rain_prob": round(float(s_df['is_rain'].mean()), 3)
        }

    # Monthly rainfall patterns
    print("Calculating monthly rainfall patterns...")
    monthly_rain = df.groupby('Month')['is_rain'].mean()
    monthly_rain_trend = [round(float(val), 3) for val in monthly_rain.values]

    # Combine everything into a dictionary
    summary = {
        "general_stats": {
            "avg_temp": round(avg_temp, 2),
            "max_temp": round(max_temp, 2),
            "rain_ratio": round(rain_ratio, 3),
            "clear_days_ratio": round(clear_days_ratio, 3)
        },
        "yearly_trend": yearly_trend,
        "monthly_stats": monthly_stats,
        "seasonal_stats": seasonal_data,
        "monthly_rain_trend": {
            "months": month_names,
            "rain_probs": monthly_rain_trend
        }
    }

    # Save to file
    os.makedirs(os.path.dirname(output_json_path), exist_ok=True)
    with open(output_json_path, 'w') as f:
        json.dump(summary, f, indent=4)
    print(f"Data summary successfully written to {output_json_path}")

if __name__ == "__main__":
    dataset = r"C:\Users\User\Downloads\archive (2)\weatherHistory.csv"
    output_json = r"C:\Users\User\.gemini\antigravity\scratch\weather_intelligence\data\weather_summary.json"
    run_preprocessing(dataset, output_json)
