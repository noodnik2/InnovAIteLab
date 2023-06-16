from dotenv import load_dotenv
from langchain.embeddings import OpenAIEmbeddings
from langchain.document_loaders import DirectoryLoader
from langchain.text_splitter import CharacterTextSplitter
from langchain.vectorstores import Chroma
from langchain.chains import RetrievalQA
from langchain import OpenAI

load_dotenv()

embeddings = OpenAIEmbeddings()

text = "This is the most egregious thing in the world."

loader = DirectoryLoader('news', glob="**/*.txt")
documents = loader.load()

text_splitter = CharacterTextSplitter(chunk_size=2500, chunk_overlap=0)
texts = text_splitter.split_documents(documents)

docsearch = Chroma.from_documents(texts, embeddings)
qa = RetrievalQA.from_chain_type(
    llm=OpenAI(),
    chain_type="stuff",
    retriever=docsearch.as_retriever()
)

def query(q):
    print("Query: ", q)
    print("Answer: ", qa.run(q))

query("What are the effects of legislations surrounding emissions on the Australian coal market?")
# query("What is China's plan for renewable energy?")
# query("Is there an export ban on coal in Indonesia? Why?")

# qa.run("")

# doc_embeddings = embeddings.embed_documents([text])
# print(doc_embeddings)
