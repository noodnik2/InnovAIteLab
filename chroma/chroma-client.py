import chromadb
from dotenv import dotenv_values

config = dotenv_values(".env")

OPENAI_API_KEY=config["OPENAI_API_KEY"]

from chromadb.utils import embedding_functions

# Using OpenAI Embeddings. This assumes you have the openai package installed
openai_ef = embedding_functions.OpenAIEmbeddingFunction(
    api_key=OPENAI_API_KEY,
    model_name="text-embedding-ada-002"
)

chroma_client = chromadb.Client()
openai_collection = chroma_client.create_collection(name="openai_embeddings", embedding_function=openai_ef)
openai_collection.add(
    documents=["This is a document", "This is another document"],
    metadatas=[{"source": "my_source"}, {"source": "my_source"}],
    ids=["id1", "id2"]
)
results = openai_collection.query(
    query_texts=["This is a query document"],
    n_results=2
)

print(f"results are({results})\n")

