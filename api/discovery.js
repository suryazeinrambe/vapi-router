// Free x402 discovery document: GET /.well-known/x402
'use strict';
module.exports = async function handler(req, res) {
  const host = req.headers.host || req.headers['x-forwarded-host'] || '';
  const base = `https://${host}`;
  res.status(200);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({
    x402Version: 2,
    serviceName: 'Zen Hello API',
    description: 'A simple hello world greeting. GET /hello costs $0.005 USDC (Base) per call via x402.',
    resource: {
      url: `${base}/hello`,
      description: 'A simple hello world greeting.',
      mimeType: 'application/json',
      serviceName: 'Zen Hello API',
    },
    accepts: [
      {
        scheme: 'exact',
        network: 'eip155:8453',
        amount: '5000',
        asset: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        payTo: '0x64eee79d896f48cfecb0687d4a68ec64e4e63ff3',
        maxTimeoutSeconds: 120,
        extra: { name: 'USD Coin', version: '2' },
      },
    ],
    openapi: `${base}/openapi.json`,
  });
};
