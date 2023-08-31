// see: https://docs.trychroma.com/integrations

import { OpenAI } from "langchain/llms/openai";
import { ConversationalRetrievalQAChain } from "langchain/chains";
import { Chroma } from "langchain/vectorstores/chroma";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import * as fs from "fs";

// to run this:
//  set the "OPENAI_API_KEY" environment variable
//  run chroma's docker-container with `docker-compose up -d --build`

export const run = async () => {
    console.log('running');
    /* Initialize the LLM to use to answer the question */
    const model = new OpenAI();
    /* Load in the file we want to do question answering over */
    const text = fs.readFileSync("state_of_the_union.txt", "utf8");
    /* Split the text into chunks */
    const textSplitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000 });
    const docs = await textSplitter.createDocuments([text]);
    /* Create the vectorstore */
    const vectorStore = await Chroma.fromDocuments(
        docs,
        new OpenAIEmbeddings(),
        { collectionName: "state_of_the_union" }
    );
    /* Create the chain */
    const chain = ConversationalRetrievalQAChain.fromLLM(model, vectorStore.asRetriever());
    /* Ask it a question */
    const question = "What did the president say about Justice Breyer?";
    const res = await chain.call({ question, chat_history: [] });
    console.log(res);
};

await run();