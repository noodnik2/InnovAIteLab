import requests

def generate_response_with_ollama(prompt):
    url = "http://localhost:8000/generate"  # Replace with your Ollama server URL
    response = requests.post(url, json={"prompt": prompt})
    return response.json()["text"]
