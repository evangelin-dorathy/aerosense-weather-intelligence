# Use a lightweight official Python image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies if any
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn

# Copy project files
COPY . .

# Run data preprocessing and model training to generate pickles & summary json
RUN python src/data_processor.py && python src/model_trainer.py

# Expose server port
EXPOSE 5000

# Set environment variable for Flask
ENV FLASK_APP=src/server.py
ENV PORT=5000

# Start server using gunicorn for production reliability
CMD gunicorn --bind 0.0.0.0:$PORT src.server:app
