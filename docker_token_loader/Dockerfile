# Dockerfile
# Multi-stage build for efficient image size

# FROM python:3.12-slim
FROM python:3.11-slim

  # Install system dependencies for document processing
RUN apt-get update && apt-get install -y \
build-essential \
libmagic1 \
poppler-utils \
tesseract-ocr \
&& rm -rf /var/lib/apt/lists/*

  # Set working directory
WORKDIR /app

  # Copy requirements first (for layer caching)
COPY app/requirements.txt .

  # Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

  # Copy application code
COPY app/ .

  # Create data directories
RUN mkdir -p /data/uploads /data/chroma

  # Expose port
EXPOSE 8000

  # Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

