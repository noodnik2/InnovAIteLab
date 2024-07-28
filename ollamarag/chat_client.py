class SimpleRAGChatClient:
    def __init__(self, chroma_client):
        self.chroma_client = chroma_client

    def get_relevant_documents(self, query):
        # Generate the embedding for the query
        query_embedding = embeddings.get_embedding(query)

        # Retrieve relevant documents from Chroma
        results = self.chroma_client.query(query_embedding, n_results=5)  # Retrieve top 5 documents
        return results

    def generate_response(self, query):
        # Retrieve relevant documents
        relevant_docs = self.get_relevant_documents(query)

        # Combine the contents of the documents
        combined_docs = "\n".join([doc["text"] for doc in relevant_docs])

        # Generate a response using Ollama
        prompt = f"Context: {combined_docs}\n\nQuery: {query}\nResponse:"
        response = generate_response_with_ollama(prompt)

        return response

# Initialize the chat client
chat_client = SimpleRAGChatClient(chroma_client)

# # Example query
# query = "Tell me about Chroma."
# response = chat_client.generate_response(query)
# print(response)


if __name__ == "__main__":
    while True:
        user_query = input("You: ")
        if user_query.lower() in ["exit", "quit"]:
            break
        response = chat_client.generate_response(user_query)
        print(f"Bot: {response}")
