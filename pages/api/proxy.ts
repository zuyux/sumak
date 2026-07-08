import type { NextApiRequest, NextApiResponse } from 'next';

const ALLOWED_HOSTS = [
  'gateway.pinata.cloud',
  'ipfs.io',
  'cloudflare-ipfs.com',
  'dweb.link',
  'gateway.ipfs.io',
  'ipfs.infura.io',
  'nftstorage.link',
  'w3s.link',
];

const IPFS_PATH_REGEX = /\/ipfs\/([^/?#]+)/i;
const IPFS_GATEWAY_FALLBACKS = [
  'https://ipfs.io/ipfs/',
  'https://dweb.link/ipfs/',
  'https://gateway.pinata.cloud/ipfs/',
  'https://gateway.ipfs.io/ipfs/',
  'https://nftstorage.link/ipfs/',
  'https://w3s.link/ipfs/',
];

function buildCandidateUrls(target: URL): string[] {
  const candidates = [target.toString()];
  const match = target.pathname.match(IPFS_PATH_REGEX);

  if (!match?.[1]) {
    return candidates;
  }

  const cid = match[1];
  for (const gateway of IPFS_GATEWAY_FALLBACKS) {
    const candidate = `${gateway}${cid}${target.search}`;
    if (!candidates.includes(candidate)) {
      candidates.push(candidate);
    }
  }

  return candidates;
}

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
    let lastFailure: string | null = null;

    for (const candidate of buildCandidateUrls(target)) {
      try {
        const upstream = await fetch(candidate, {
          headers,
          signal: AbortSignal.timeout(8000),
        });

        if (!upstream.ok) {
          lastFailure = `Upstream fetch failed: ${upstream.status} ${upstream.statusText}`;
          continue;
        }

        const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
        const cacheControl = upstream.headers.get('cache-control');
        const contentLength = upstream.headers.get('content-length');
        const contentRange = upstream.headers.get('content-range');
        const acceptRanges = upstream.headers.get('accept-ranges');

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', contentType);

        if (cacheControl) {
          res.setHeader('Cache-Control', cacheControl);
        }
        if (contentLength) {
          res.setHeader('Content-Length', contentLength);
        }
        if (contentRange) {
          res.setHeader('Content-Range', contentRange);
        }
        if (acceptRanges) {
          res.setHeader('Accept-Ranges', acceptRanges);
        }

        const buffer = await upstream.arrayBuffer();
        res.status(upstream.status).send(Buffer.from(buffer));
        return;
      } catch (error) {
        lastFailure = error instanceof Error ? error.message : 'Unknown proxy fetch error';
      }
    }

    console.error('Proxy exhausted IPFS candidates for', url, lastFailure);
    res.status(502).send(lastFailure ?? 'Proxy fetch error');
  } catch (error) {
    console.error('Proxy error fetching', url, error);
    res.status(500).send('Proxy fetch error');
  }
}
