// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import {createCollector, createResolver, llm, memory} from "@/pages/api/bridge";

export default async function handler(req: NextApiRequest, res: NextApiResponse<any>) {

    try {
        const deliveryPkg = req.body;
        console.log(`resolver: received(${JSON.stringify(deliveryPkg)})`);

        // const llm = createLlm(deliveryPkg.model, deliveryPkg.temperature);
        const query = deliveryPkg.message;

        const answers = await createResolver(llm).resolve([query]);
        console.log(`resolver: received answers(${JSON.stringify(answers)})`)

        const answer = answers[0]

        await createCollector(memory).record(query, answer);

        res.status(200).json({status: "OK", data: answer});
    } catch(error) {
        console.log(`resolver: received error(${error})`);
        res.status(500).json({error: `error: ${error}`});
    }
}
