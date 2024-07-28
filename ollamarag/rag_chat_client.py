# import os
# os.environ['KMP_DUPLICATE_LIB_OK'] = 'True'

import chromadb
from sentence_transformers import SentenceTransformer
import requests


# Define the Embeddings class
class Embeddings:
    def __init__(self, model_name='all-MiniLM-L6-v2'):
        print("threeb")
        self.model = SentenceTransformer(model_name)
        print("threec")

    def get_embedding(self, text):
        # Compute embedding for the input text
        embedding = self.model.encode(text)
        return embedding


# Function to generate response with Ollama
def generate_response_with_ollama(prompt):
    url = "http://localhost:8000/generate"  # Replace with your Ollama server URL
    response = requests.post(url, json={"prompt": prompt})
    return response.json()["text"]


# Define the RAG chat client
class SimpleRAGChatClient:
    def __init__(self, chroma_client):
        self.chroma_client = chroma_client

    def get_relevant_documents(self, query):
        # Generate the embedding for the query
        query_embedding = embeddings.get_embedding(query)

        # Retrieve relevant documents from Chroma
        results = collection.query(query_embedding, n_results=5)  # Retrieve top 5 documents
        return results

    def generate_response(self, query):
        # Retrieve relevant documents
        relevant_docs = self.get_relevant_documents(query)

        # Combine the contents of the documents
        combined_docs = "\n".join([rdoc["text"] for rdoc in relevant_docs])

        # Generate a response using Ollama
        prompt = f"Context: {combined_docs}\n\nQuery: {query}\nResponse:"
        ollama_response = generate_response_with_ollama(prompt)

        return ollama_response


print("one")
# Initialize Chroma client
chroma_client = chromadb.Client()
print("two")
collection = chroma_client.create_collection("my_documents")

# Initialize the Embeddings class
print("three")
embeddings = Embeddings()

# Sample documents
print("four")
sample_documents = [
    {"id": "doc1", "text": "This is a sample document about Ollama."},
    {"id": "doc2", "text": "Chroma is a powerful vector database for embeddings."},
    # Add more documents as needed
]

# Add documents to Chroma
print("five")
for sdoc in sample_documents:
    embedding = embeddings.get_embedding(sdoc["text"])
    collection.add(sdoc["id"], sdoc["text"], embedding)

# Initialize the chat client
print("six")
chat_client = SimpleRAGChatClient(chroma_client)

# Interactive chat loop
print("seven")
if __name__ == "__main__":
    while True:
        user_query = input("You: ")
        if user_query.lower() in ["exit", "quit"]:
            break
        response = chat_client.generate_response(user_query)
        print(f"Bot: {response}")
