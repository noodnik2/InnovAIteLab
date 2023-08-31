import { TextLoader } from "langchain/document_loaders/fs/text";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import {RetrievalQAChain} from "langchain/chains";
import {OpenAI} from "langchain/llms/openai";

async function retrieveFromDocs() {

    // load documents

    const loader = new TextLoader("tests/docs/test.md");
    const docs = await loader.load();

    // split documents into chunks


    const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 500,
        chunkOverlap: 0,
    });

    const splitDocs = await textSplitter.splitDocuments(docs);

    // embed and store the documents into a vector database

    const embeddings = new OpenAIEmbeddings();

    const vectorStore = await MemoryVectorStore.fromDocuments(splitDocs, embeddings);

    // Create a chain that uses the OpenAI LLM and HNSWLib vector store.
    const model = new OpenAI({});
    // Initialize a retriever wrapper around the vector store
    const vectorStoreRetriever = vectorStore.asRetriever();
    const chain = RetrievalQAChain.fromLLM(model, vectorStoreRetriever);
    const res = await chain.call({
        query: "What can you tell me about stuff that's found within the second level?",
    });
    console.log({ res });

}

retrieveFromDocs();


