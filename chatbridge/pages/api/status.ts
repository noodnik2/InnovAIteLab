// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import {getServiceAddr} from "@/routes/info";
import axios from 'axios';

export default async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
    const SERVICENAME_MONITOR = "tbd-deleteme?";
    const serviceAddr = getServiceAddr(SERVICENAME_MONITOR);
    const url = `${serviceAddr}/status`

    console.log(`GET url(${url})`);
    return axios
        .get(url)
        .then((response) => {
            console.log(`GET OK`);
            res.status(200).json(response.data);
        })
        .catch((error) => {
            console.log(`GET received error(${error})`);
            res.status(500).json({error: error});
        });
}
