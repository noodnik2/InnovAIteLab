from sentence_transformers import SentenceTransformer

class Embeddings:
    def __init__(self, model_name='all-MiniLM-L6-v2'):
        self.model = SentenceTransformer(model_name)

    def get_embedding(self, text):
        # Compute embedding for the input text
        embedding = self.model.encode(text)
        return embedding

# Initialize the Embeddings class
embeddings = Embeddings()

# Example usage
sample_text = "This is a sample document about Ollama."
embedding = embeddings.get_embedding(sample_text)
print(embedding)
