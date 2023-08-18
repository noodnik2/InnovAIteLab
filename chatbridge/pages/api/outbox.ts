// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import {getServiceAddr, SERVICENAME_CHATAPI} from "@/routes/info";
import axios from 'axios';

export default async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
    const deliveryPkg = req.body;
    const serviceAddr = getServiceAddr(SERVICENAME_CHATAPI);
    const question = JSON.stringify(deliveryPkg.message);
    const model = deliveryPkg.model;
    const url = `${serviceAddr}/v1/chat/completions`

    const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;

    const axiosHeaders = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
    };

    const message = JSON.stringify({
        model: model,
        messages: [
            {
                role: 'system',
                content: 'You are a user trying to get information.',
            },
            {
                role: 'user',
                content: question,
            },
        ],
    });

    console.log(`outbox: POST url(${url}), message(${message}), headers(${JSON.stringify(axiosHeaders)})`);

    return axios.post(url, message, axiosHeaders)
        .then((response) => {
            console.log(`outbox: POST OK; status(${response.statusText})`);
            console.log(`outbox: received response data(${JSON.stringify(response.data)})`)
            const answer = response.data.choices[0].message.content;
            res.status(200).json({status: response.statusText, data: answer});

        }).catch((error) => {
            console.log(`outbox: POST received error(${error})`);
            const errorMessage = `error from ${url}: ${error}`;
            res.status(500).json({error: errorMessage});
        }
    );

}
