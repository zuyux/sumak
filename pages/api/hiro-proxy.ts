// Next.js API route to proxy Hiro API requests and avoid CORS issues
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { path = '' } = req.query;
  if (!path || typeof path !== 'string') {
    res.status(400).json({ error: 'Missing or invalid path parameter' });
    return;
  }

  const apiUrl = `https://api.testnet.hiro.so/${path}`;
  try {
    const response = await fetch(apiUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        // Forward any additional headers if needed
      },
      body: req.method === 'POST' ? JSON.stringify(req.body) : undefined,
    });
    const data = await response.json();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch from Hiro API', details: error instanceof Error ? error.message : error });
  }
}
