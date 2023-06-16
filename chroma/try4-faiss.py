from langchain.embeddings.openai import OpenAIEmbeddings
from langchain.text_splitter import CharacterTextSplitter
from langchain.vectorstores import FAISS

# FAISS stores vectors in memory

text_splitter = CharacterTextSplitter(
    separator = "\n",
    chunk_size = 1000,
    chunk_overlap = 200, # sentences can stride across newlines
    length_function = len,
)

texts = text_splitter.split_text("I am the wolfman, don't you forget it.")

from dotenv import load_dotenv
load_dotenv()

embeddings = OpenAIEmbeddings()

docsearch = FAISS.from_texts(texts, embeddings)

query = "who am I?"
docs = docsearch.similarity_search(query)

print(f"len(docs) is {len(docs)}")

from langchain.chains.question_answering import load_qa_chain
from langchain.llms import OpenAI

chain = load_qa_chain(OpenAI(), chain_type="stuff") # stuff in all documents at once

print(f"the template is {chain.llm_chain.prompt.template}")

print(f"the chain returns {chain.run(input_documents=docs, question=query)}")
