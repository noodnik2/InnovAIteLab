import { TextLoader } from "langchain/document_loaders/fs/text";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import {RetrievalQAChain} from "langchain/chains";
import {OpenAI} from "langchain/llms/openai";
import {UnstructuredLoader} from "langchain/document_loaders";
import {Document} from "langchain/document";

async function retrieveFromDocs() {

    // load documents

    // const loader = new UnstructuredLoader("tests/docs/test.md");
    const loader = new TextLoader("tests/docs/test.md");
    const docs = await loader.load();

    // split documents into chunks


    const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 500,
        chunkOverlap: 0,
    });

    const myDoc = new Document({
        pageContent: "My name is Kenny",
        metadata: {
            "level": 1,
            "title": "Top level entry1",
        },
    })

    // const splitDocs = await textSplitter.splitDocuments(docs);
    const splitDocs = await textSplitter.splitDocuments([myDoc]);

    // embed and store the documents into a vector database

    const embeddings = new OpenAIEmbeddings();

    const vectorStore = await MemoryVectorStore.fromDocuments(splitDocs, embeddings);

    // Create a chain that uses the OpenAI LLM and HNSWLib vector store.
    const temperature = 1.0;
    const model = new OpenAI({temperature});
    // Initialize a retriever wrapper around the vector store
    const vectorStoreRetriever = vectorStore.asRetriever();
    const chain = RetrievalQAChain.fromLLM(model, vectorStoreRetriever);

    const queries = [
        "What is my name?",
        "What is my title?",
        "What is the metadata of the document you found my name in?"
    ]

    console.log(`temperature: ${temperature}`)
    for (const query of queries) {
        const { text } = await chain.call({query});
        console.log(`query(${query}) => answer(${text})`);
    }

}

retrieveFromDocs();


