#! /usr/bin/env node
import { Configuration, OpenAIApi } from "openai";
const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);
const response = await openai.createCompletion({
    model: "text-davinci-003",
    prompt: "Translate this into 1. French, 2. Spanish:\n\nWhat rooms do you have available?  Are the toilets clean?\n\n1. ",
    temperature: 0.3,
    max_tokens: 100,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
});
console.log(JSON.stringify(response.data));
