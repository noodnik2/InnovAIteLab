// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import {createCollector, memory} from "@/pages/api/bridge";

export default async function handler(req: NextApiRequest, res: NextApiResponse<any>) {

    const deliveryPkg = req.body;
    console.log(`received(${JSON.stringify(deliveryPkg)})`);
    const text = JSON.stringify(deliveryPkg.message);
    await createCollector(memory).accept([text]).then(() => {
        console.log(`outbox: accepted text(${text})`)
        res.status(200).json({status: "OK", data: text});
    }).catch((error) => {
        console.log(`outbox: POST received error(${error})`);
        const errorMessage = `error: ${error}`;
        res.status(500).json({error: errorMessage});
    });
}
