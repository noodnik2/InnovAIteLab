# Use Python base image
FROM python:3.8-slim

# Set the working directory
WORKDIR /app

# Copy the current directory contents into the container at /app
COPY . /app

# Install dependencies
RUN pip install -r requirements.txt

# Expose the Flask port
EXPOSE 8000

# Command to run the application
CMD ["python", "app.py"]
