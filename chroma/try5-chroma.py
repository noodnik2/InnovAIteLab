from langchain.embeddings.openai import OpenAIEmbeddings
# from langchain.embeddings.cohere import CohereEmbeddings
from langchain.text_splitter import CharacterTextSplitter
from langchain.prompts import PromptTemplate
# from langchain.vectorstores.elastic_vector_search import ElasticVectorSearch
from langchain.vectorstores import Chroma
# from langchain.docstore.document import Document
# from langchain.prompts import PromptTemplate


from dotenv import load_dotenv
load_dotenv()

text_splitter = CharacterTextSplitter(chunk_size=1000, chunk_overlap=0)
texts = text_splitter.split_text("I am the wolfman, so don't you forget it!\n")

embeddings = OpenAIEmbeddings()

docsearch = Chroma.from_texts(texts, embeddings, metadatas=[{"source": str(i)} for i in range(len(texts))])

query = "Who am I?"
docs = docsearch.similarity_search(query)

print(f"len(docs) is {len(docs)}")

# from langchain.chains.qa_with_sources import load_qa_with_sources_chain
from langchain.chains.question_answering import load_qa_chain
from langchain.llms import OpenAI

# chain = load_qa_with_sources_chain(OpenAI(temperature=0), chain_type="stuff")
# answer = chain({"input_documents": docs, "question": query}, return_only_outputs=True)

custom_prompt_template = """
    You are an Israeli citizen, therefore you will answer the question below in Hebrew.  Here is your context,
    which will be in English, which of course you understand very well:
    
    {context}
    
    Question: {question}
    Answer:
"""

custom_prompt = PromptTemplate(
    template = custom_prompt_template,
    input_variables = ["context", "question"]
)

chain = load_qa_chain(OpenAI(temperature=0), chain_type="stuff", verbose=True, prompt = custom_prompt)
answer = chain({"input_documents": docs, "question": query}, return_only_outputs=True)

print(f"the template is {chain.llm_chain.prompt.template}")

print(f"the chain returns {answer}")