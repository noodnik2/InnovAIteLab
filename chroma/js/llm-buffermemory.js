
// to run this:
//  set the "OPENAI_API_KEY" environment variable

// see: https://js.langchain.com/docs/modules/memory/#buffermemory

import { OpenAI } from "langchain/llms/openai";
import { BufferMemory } from "langchain/memory";
import { ConversationChain } from "langchain/chains";

const model = new OpenAI({});
const memory = new BufferMemory();
// This chain is preconfigured with a default prompt
const chain = new ConversationChain({ llm: model, memory: memory });
const res1 = await chain.call({ input: "Hi! I'm Jim." });
console.log({ res1 });
// {response: " Hi Jim! It's nice to meet you. My name is AI. What would you like to talk about?"}

const res2 = await chain.call({ input: "What's my name?" });
console.log({ res2 });
// {response: ' You said your name is Jim. Is there anything else you would like to talk about?'}