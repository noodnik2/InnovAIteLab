// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import {getServiceAddr} from "@/routes/info";
import EventSource from 'eventsource';

// chatbridge: TODO This file can probably be deleted
export default async function handler(req: NextApiRequest, res: NextApiResponse<any>) {

    console.log(`consume: request arrived`)
    res.status(400).send(`unsupported call to deprecated function`)
    return

    // console.log(`request arrived`)
    // const consumerTopics = req.query['model']
    // if (!consumerTopics) {
    //     res.status(400).send(`missing 'model' query parameter value`)
    //     return
    // }
    //
    // const SERVICENAME_MONITOR = "consumer-service-tbd";
    // const serviceAddr = getServiceAddr(SERVICENAME_MONITOR);
    // if (!serviceAddr) {
    //     res.status(500).send(`unknown service address for(${SERVICENAME_MONITOR})`)
    //     return
    // }
    //
    // res.setHeader('Content-Type', 'text/event-stream');
    // res.setHeader('Cache-Control', 'no-cache');
    // res.flushHeaders();
    //
    // const url = `${serviceAddr}/consume?model=${consumerTopics}`;
    // console.log(`GET ${url}`)
    //
    // const es = new EventSource(url);
    //
    // es.addEventListener('open',  (e) => {
    //     console.log(`(${consumerTopics}) API route SSE opened`)
    //     writeChunk(res, `retry: 3000\n`)
    // });
    //
    // // @ts-ignore
    // es.addEventListener('error', (e) => {
    //     console.log(`(${consumerTopics}) API route error(${(e as EventWithMessage).message})`)
    // });
    //
    // es.addEventListener('streamer', (e) => {
    //     writeEvent(res, e)
    // });
    //
    // res.on('close', () => {
    //     console.log(`API route SSE response closed; closing connection for topics(${consumerTopics})`);
    //     es.close();
    //     res.end();
    // });

}

// const writeEvent = (res: NextApiResponse<any>, e: MessageEvent) => {
//     writeChunk(res, `event: ${e.type}\ndata: ${e.data}\n\n`)
// }
//
// const writeChunk = (res: NextApiResponse<any>, chunk: any) => {
//     res.write(chunk);
//     (res as FlushableNextApiResponse).flush();
// }
//
// interface EventWithMessage extends MessageEvent {
//     message?: string
// }
//
// interface FlushableNextApiResponse extends NextApiResponse {
//     flush(): void
// }
