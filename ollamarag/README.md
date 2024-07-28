# Ollama RAG

## Inspiration

This conversation with ChatGPT:

### Me

> Write for me a RAG chat client that uses OpenLLM on top of Chroma for its embeddings. 

_\[...]_


> Now do it as simply as possible using a locally running Ollama client and server
> also using Chroma, using as simple and as much as possible their native APIs.


### ChatGPT

> Sure! Let's simplify the process and use a locally running Ollama client and server, and Chroma for embeddings. We'll use their native APIs directly for simplicity.

> #### Step-by-Step Setup
> 
> ##### 1. Install Dependencies
> 
> First, ensure you have the necessary packages installed:
> 
> ```bash
> pip install ollama chromadb
> ```
> 
> ##### 2. Set Up Chroma
> 
> Initialize Chroma and add some documents to it:
> 
> ```python
> import chromadb
> from chromadb.utils import embeddings
> 
> # Initialize Chroma client
> chroma_client = chromadb.Client()
> collection = chroma_client.create_collection("my_documents")
> 
> # Sample documents
> documents = [
>     {"id": "doc1", "text": "This is a sample document about Ollama."},
>     {"id": "doc2", "text": "Chroma is a powerful vector database for embeddings."},
>     # Add more documents as needed
> ]
> 
> # Add documents to Chroma
> for doc in documents:
>     embedding = embeddings.get_embedding(doc["text"])  # Assuming a function to get embeddings
>     collection.add(doc["id"], doc["text"], embedding)
> ```
> 
> ##### 3. Set Up Ollama
> 
> Assume you have an Ollama server running locally and you can interact with it through its API. Here’s a simplified way to call the Ollama API:
> 
> ```python
> import requests
> 
> def generate_response_with_ollama(prompt):
>     url = "http://localhost:8000/generate"  # Replace with your Ollama server URL
>     response = requests.post(url, json={"prompt": prompt})
>     return response.json()["text"]
> ```
> 
> ##### 4. Create the Chat Client
> 
> Now, integrate these components into a simple chat client:
> 
> ```python
> class SimpleRAGChatClient:
>     def __init__(self, chroma_client):
>         self.chroma_client = chroma_client
> 
>     def get_relevant_documents(self, query):
>         # Generate the embedding for the query
>         query_embedding = embeddings.get_embedding(query)
>         
>         # Retrieve relevant documents from Chroma
>         results = self.chroma_client.query(query_embedding, n_results=5)  # Retrieve top 5 documents
>         return results
> 
>     def generate_response(self, query):
>         # Retrieve relevant documents
>         relevant_docs = self.get_relevant_documents(query)
>         
>         # Combine the contents of the documents
>         combined_docs = "\n".join([doc["text"] for doc in relevant_docs])
>         
>         # Generate a response using Ollama
>         prompt = f"Context: {combined_docs}\n\nQuery: {query}\nResponse:"
>         response = generate_response_with_ollama(prompt)
>         
>         return response
> 
> # Initialize the chat client
> chat_client = SimpleRAGChatClient(chroma_client)
> 
> # Example query
> query = "Tell me about Chroma."
> response = chat_client.generate_response(query)
> print(response)
> ```
> 
> ##### 5. Running the Chat Client
> 
> You can now interact with the chat client in a simple loop:
> 
> ```python
> if __name__ == "__main__":
>     while True:
>         user_query = input("You: ")
>         if user_query.lower() in ["exit", "quit"]:
>             break
>         response = chat_client.generate_response(user_query)
>         print(f"Bot: {response}")
> ```
> 
> ### Notes
> 
> 1. **Embeddings Function**: The `embeddings.get_embedding` function should be defined using an appropriate embeddings model. For simplicity, use any pre-trained model like Sentence Transformers.
> 
> 2. **Ollama API**: Ensure the Ollama server is correctly set up and the API endpoint (`http://localhost:8000/generate`) is accessible.
> 
> 3. **Error Handling**: Add basic error handling for API calls and embedding retrieval.
> 
> 4. **Scalability**: This example is simplified for demonstration. For a production environment, consider more robust solutions for embeddings and document retrieval.
> 
> This setup uses minimal code and relies on the native APIs of Ollama and Chroma to create a simple RAG-based chat client.

## Me

> Write the best version of the embeddings.get_embedding function
> that I can use for this case.

## ChatGPT

> To create a robust `embeddings.get_embedding` function, we can use a pre-trained model from the Sentence Transformers library. Sentence Transformers provide a straightforward way to compute sentence embeddings using various state-of-the-art transformer models.
> 
> First, ensure you have the `sentence-transformers` library installed:
> 
> ```bash
> pip install sentence-transformers
> ```
> 
> Here's the implementation of the `embeddings.get_embedding` function using the `sentence-transformers` library:
> 
> ```python
> from sentence_transformers import SentenceTransformer
> 
> class Embeddings:
>     def __init__(self, model_name='all-MiniLM-L6-v2'):
>         self.model = SentenceTransformer(model_name)
> 
>     def get_embedding(self, text):
>         # Compute embedding for the input text
>         embedding = self.model.encode(text)
>         return embedding
> 
> # Initialize the Embeddings class
> embeddings = Embeddings()
> 
> # Example usage
> sample_text = "This is a sample document about Ollama."
> embedding = embeddings.get_embedding(sample_text)
> print(embedding)
> ```
> 
> ### Explanation
> 
> 1. **Initialization**: The `Embeddings` class is initialized with a pre-trained model from the Sentence Transformers library. The model `all-MiniLM-L6-v2` is a lightweight and efficient model suitable for generating embeddings quickly. You can replace it with other models provided by Sentence Transformers based on your needs.
> 
> 2. **get_embedding Method**: This method takes a piece of text and computes its embedding using the `encode` method of the Sentence Transformers model.
> 
> 3. **Example Usage**: An example demonstrates how to initialize the `Embeddings` class and use the `get_embedding` method to compute the embedding for a sample text.
> 
> ### Integration into the RAG Chat Client
> 
> Now, integrate this `Embeddings` class into the previously defined RAG chat client:
> 
> ```python
> import chromadb
> 
> # Initialize Chroma client
> chroma_client = chromadb.Client()
> collection = chroma_client.create_collection("my_documents")
> 
> # Initialize the Embeddings class
> embeddings = Embeddings()
> 
> # Sample documents
> documents = [
>     {"id": "doc1", "text": "This is a sample document about Ollama."},
>     {"id": "doc2", "text": "Chroma is a powerful vector database for embeddings."},
>     # Add more documents as needed
> ]
> 
> # Add documents to Chroma
> for doc in documents:
>     embedding = embeddings.get_embedding(doc["text"])
>     collection.add(doc["id"], doc["text"], embedding)
> 
> # Define the RAG chat client
> class SimpleRAGChatClient:
>     def __init__(self, chroma_client):
>         self.chroma_client = chroma_client
> 
>     def get_relevant_documents(self, query):
>         # Generate the embedding for the query
>         query_embedding = embeddings.get_embedding(query)
>         
>         # Retrieve relevant documents from Chroma
>         results = self.chroma_client.query(query_embedding, n_results=5)  # Retrieve top 5 documents
>         return results
> 
>     def generate_response(self, query):
>         # Retrieve relevant documents
>         relevant_docs = self.get_relevant_documents(query)
>         
>         # Combine the contents of the documents
>         combined_docs = "\n".join([doc["text"] for doc in relevant_docs])
>         
>         # Generate a response using Ollama
>         prompt = f"Context: {combined_docs}\n\nQuery: {query}\nResponse:"
>         response = generate_response_with_ollama(prompt)
>         
>         return response
> 
> # Initialize the chat client
> chat_client = SimpleRAGChatClient(chroma_client)
> 
> # Example query
> query = "Tell me about Chroma."
> response = chat_client.generate_response(query)
> print(response)
> ```
> 
> This setup provides a complete implementation of the `embeddings.get_embedding` function using Sentence Transformers, and integrates it into the RAG chat client, allowing you to generate embeddings and use them for document retrieval and response generation.

## Me

> Can you put all of that together into a single Python file so that I can just run it?
> 
> ## ChatGPT
> 
> > Certainly! Here's the complete implementation in a single Python file. Ensure you have the required dependencies (`chromadb`, `sentence-transformers`, and `requests`) installed before running this script.
> 
> ```python
> import chromadb
> from sentence_transformers import SentenceTransformer
> import requests
> 
> # Define the Embeddings class
> class Embeddings:
>     def __init__(self, model_name='all-MiniLM-L6-v2'):
>         self.model = SentenceTransformer(model_name)
> 
>     def get_embedding(self, text):
>         # Compute embedding for the input text
>         embedding = self.model.encode(text)
>         return embedding
> 
> # Function to generate response with Ollama
> def generate_response_with_ollama(prompt):
>     url = "http://localhost:8000/generate"  # Replace with your Ollama server URL
>     response = requests.post(url, json={"prompt": prompt})
>     return response.json()["text"]
> 
> # Define the RAG chat client
> class SimpleRAGChatClient:
>     def __init__(self, chroma_client):
>         self.chroma_client = chroma_client
> 
>     def get_relevant_documents(self, query):
>         # Generate the embedding for the query
>         query_embedding = embeddings.get_embedding(query)
>         
>         # Retrieve relevant documents from Chroma
>         results = collection.query(query_embedding, n_results=5)  # Retrieve top 5 documents
>         return results
> 
>     def generate_response(self, query):
>         # Retrieve relevant documents
>         relevant_docs = self.get_relevant_documents(query)
>         
>         # Combine the contents of the documents
>         combined_docs = "\n".join([doc["text"] for doc in relevant_docs])
>         
>         # Generate a response using Ollama
>         prompt = f"Context: {combined_docs}\n\nQuery: {query}\nResponse:"
>         response = generate_response_with_ollama(prompt)
>         
>         return response
> 
> # Initialize Chroma client
> chroma_client = chromadb.Client()
> collection = chroma_client.create_collection("my_documents")
> 
> # Initialize the Embeddings class
> embeddings = Embeddings()
> 
> # Sample documents
> documents = [
>     {"id": "doc1", "text": "This is a sample document about Ollama."},
>     {"id": "doc2", "text": "Chroma is a powerful vector database for embeddings."},
>     # Add more documents as needed
> ]
> 
> # Add documents to Chroma
> for doc in documents:
>     embedding = embeddings.get_embedding(doc["text"])
>     collection.add(doc["id"], doc["text"], embedding)
> 
> # Initialize the chat client
> chat_client = SimpleRAGChatClient(chroma_client)
> 
> # Interactive chat loop
> if __name__ == "__main__":
>     while True:
>         user_query = input("You: ")
>         if user_query.lower() in ["exit", "quit"]:
>             break
>         response = chat_client.generate_response(user_query)
>         print(f"Bot: {response}")
> ```
> 
> ### Instructions
> 
> 1. **Install Required Packages**:
>    ```bash
>    pip install chromadb sentence-transformers requests
>    ```
> 
> 2. **Run the Script**:
>    ```bash
>    python rag_chat_client.py
>    ```
> 
> 3. **Start Interaction**:
>     - Type your query when prompted (`You:`) and press Enter.
>     - Type `exit` or `quit` to end the interaction.
> 
> ### Notes
> 
> - Make sure the Ollama server is running locally and accessible at the specified URL (`http://localhost:8000/generate`). Adjust the URL if needed.
> - This script initializes Chroma, loads sample documents, and sets up a simple chat client that uses embeddings for document retrieval and generates responses using the Ollama server.
> - Modify or expand the sample documents as needed to suit your use case.


## Running Containers

```shell
$ docker run -d --name chroma-server -p 8080:8080 chromadb/chroma
$ docker run -d --name ollama-server -p 8000:8000 ollama/ollama
```
