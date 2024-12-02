import chromadb
from chromadb.utils import embeddings

# Initialize Chroma client
chroma_client = chromadb.Client()
collection = chroma_client.create_collection("my_documents")

# Sample documents
documents = [
    {"id": "doc1", "text": "This is a sample document about Ollama."},
    {"id": "doc2", "text": "Chroma is a powerful vector database for embeddings."},
    # Add more documents as needed
]

# Add documents to Chroma
for doc in documents:
    embedding = embeddings.get_embedding(doc["text"])  # Assuming a function to get embeddings
    collection.add(doc["id"], doc["text"], embedding)
