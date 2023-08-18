// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log(`_health: environment(${JSON.stringify(process.env)})`)
  res.status(200).json({ status: 'Healthy' })
}
