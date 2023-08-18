import axios from 'axios';

async function callChatAPI(question: string): Promise<string> {
    const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    console.log(`the API key is ${apiKey}`)
    const apiUrl = 'https://api.openai.com/v1/chat/completions';

    return apiKey as string;
    // try {
    //     const response = await axios.post(apiUrl, {
    //         messages: [
    //             {
    //                 role: 'system',
    //                 content: 'You are a user trying to get information.',
    //             },
    //             {
    //                 role: 'user',
    //                 content: question,
    //             },
    //         ],
    //     }, {
    //         headers: {
    //             'Content-Type': 'application/json',
    //             'Authorization': `Bearer ${apiKey}`,
    //         },
    //     });
    //
    //     return response.data.choices[0].message.content;
    // } catch (error) {
    //     console.error('Error calling OpenAI chat API:', error);
    //     throw error;
    // }
}

export default callChatAPI;
