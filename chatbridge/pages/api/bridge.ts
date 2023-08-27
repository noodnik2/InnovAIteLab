// See: https://js.langchain.com/docs/modules/memory/how_to/vectorstore_retriever_memory

import { OpenAI } from "langchain/llms/openai";
import { VectorStoreRetrieverMemory } from "langchain/memory";
import { LLMChain } from "langchain/chains";
import { PromptTemplate } from "langchain/prompts";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";

interface InformationCollector {
    accept(texts: string[]): Promise<void>
    record(query: string, answer: string): Promise<void>
}

interface QueryResolver {
    resolve(queries: string[]): Promise<string[]>
}

export const createMemory = (): VectorStoreRetrieverMemory => {
    const nMemoriesToConsider = 1;
    const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    const embeddings = new OpenAIEmbeddings({openAIApiKey: apiKey});
    const vectorStore = new MemoryVectorStore(embeddings);
    console.log(`creating VectorStoreRetrieverMemory`);
    return new VectorStoreRetrieverMemory({
        vectorStoreRetriever: vectorStore.asRetriever(nMemoriesToConsider),
        memoryKey: "history",
    });

}

export const createCollector = (memory: VectorStoreRetrieverMemory): InformationCollector => {
    return {
        async accept(texts: string[]): Promise<void> {
            for (let t of texts) {
                await this.record(t, "...");
            }
        },
        async record(query: string, answer: string): Promise<void> {
            await memory.saveContext({ input: query }, { output: answer }).then(() => {
                console.log(`bridge: recorded query(${query}) => answer(${answer})`)
            }).catch((err) => {
                console.log(`bridge: error recording query(${query}) => answer(${answer}): ${err}`)
            });
        },
    }
}

export const createLlm = (model: string, temperature: number): OpenAI => {
    const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    console.log(`creating LLM with model(${model}), temperature(${temperature})`)
    return new OpenAI({openAIApiKey: apiKey, modelName: model, temperature: temperature});
}

const createLlmChain = (llm: OpenAI, memory: VectorStoreRetrieverMemory): LLMChain => {

    const promptTemplate = `
I want you to act as an AI librarian. 
You will research questions posed to you within the context of your knowledge, 
with emphasis on the context of your recent history memory, using it to develop
responses to queries which are based exclusively on actual knowledge, carefully
avoiding inclusion of theories or conjecture not based upon facts.  If you do
not know the answer to a question, just say so.

Here is your recent history to take into account as context:
{history}

(You do not need to use this information if not relevant)

Current conversation:
Human: {input}
AI librarian:`;

    const prompt = PromptTemplate.fromTemplate(promptTemplate);
    const chain = new LLMChain({ llm: llm, prompt, memory });
    console.log(`chain created; type(${chain._chainType()}), inputKeys(${chain.inputKeys}), outputKeys(${chain.outputKeys})`)
    return chain;
}


export const llm = createLlm(`gpt-3.5-turbo`, 1);

export const memory = createMemory();
export const llmChain = createLlmChain(llm, memory);

export const createResolver = (llm: OpenAI): QueryResolver => {
    console.log(`bridge: created with model(${llm.modelName}), temperature(${llm.temperature})`)
    return {
        async resolve(queries: string[]): Promise<string[]> {
            console.log(`received queries(${JSON.stringify(queries)})`);
            const answers: string[] = [];
            for (let query of queries) {
                await llmChain.call(({ input: query })).then((cv) => {
                    console.log(`bridge: q(${query}) => cv(${JSON.stringify(cv)})`)
                    answers.push(JSON.parse(JSON.stringify(cv.text)));
                }).catch((err) => {
                    console.log(`bridge: error in llm call(${err})`)
                });
            }
            return answers;
        }
    }
}
