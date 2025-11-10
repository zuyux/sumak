import type { NextApiRequest, NextApiResponse } from 'next';

const ALLOWED_HOSTS = [
  'gateway.pinata.cloud',
  'ipfs.io',
  'cloudflare-ipfs.com',
  'dweb.link',
  'ipfs.infura.io',
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { url } = req.query;
  if (!url || typeof url !== 'string') {
    res.status(400).send('Missing url query param');
    return;
  }

  let target: URL;
  try {
    target = new URL(url);
  } catch {
    res.status(400).send('Invalid URL');
    return;
  }

  // Basic host whitelist to reduce open-proxy risk
  if (!ALLOWED_HOSTS.includes(target.hostname)) {
    res.status(403).send('Host not allowed');
    return;
  }

  try {
    const headers: Record<string, string> = {};
    if (req.headers.range) {
      headers.Range = String(req.headers.range);
    }
    const upstream = await fetch(target.toString(), { headers });
    if (!upstream.ok) {
      res.status(upstream.status).send(`Upstream fetch failed: ${upstream.statusText}`);
      return;
    }

    // Stream the response body back with CORS header
    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', contentType);

    const buffer = await upstream.arrayBuffer();
    const buf = Buffer.from(buffer);
    // Propagate upstream status (useful for 206 Partial Content when ranges are used)
    res.status(upstream.status).send(buf);
  } catch (error) {
    console.error('Proxy error fetching', url, error);
    res.status(500).send('Proxy fetch error');
  }
}
