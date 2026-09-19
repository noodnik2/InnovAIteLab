# https://github.com/hwchase17/chroma-langchain/blob/master/qa.ipynb

from langchain.vectorstores import Chroma
from langchain.embeddings import OpenAIEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.llms import OpenAI
from langchain.chains import RetrievalQA
from langchain.document_loaders import TextLoader


from dotenv import load_dotenv
load_dotenv()

embeddings = OpenAIEmbeddings()

import chromadb
from chromadb.config import Settings
chroma_client = chromadb.Client(Settings(chroma_api_impl="rest",
                                         chroma_server_host="localhost",
                                         chroma_server_http_port="8000"
                                         ))

is_loading = False

if is_loading:
    # small: assets/boy_who_cried_wolf.txt
    # large: assets/sherlock_holmes.txt
    loader = TextLoader('assets/boy_who_cried_wolf.txt')
    documents = loader.load()
    # see https://github.com/hwchase17/langchain/issues/1310 for using chunk size to help with Rate Limit errors
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=0)
    texts = text_splitter.split_documents(documents)
    vectordb = Chroma.from_documents(texts, embeddings, client=chroma_client)
else:
    vectordb = Chroma(embedding_function=embeddings, client=chroma_client)

qa = RetrievalQA.from_chain_type(
    llm=OpenAI(),
    chain_type="stuff",
    retriever=vectordb.as_retriever()
)

# query = "What are the names of the main characters in the story, and what languages did they speak?"
query = "What is the moral of the story?"
answer = qa.run(query)

print(f"the answer is {answer}")
