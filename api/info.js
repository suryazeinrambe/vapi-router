// Free info page: GET /
'use strict';
module.exports = async function handler(req, res) {
  res.status(200);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({
    service: 'Zen Hello API',
    description: 'A simple hello world greeting, paid per call via x402.',
    endpoints: {
      'GET /hello': 'Hello world greeting — $0.005 USDC per call, paid via x402 (Base).',
      'GET /health': 'Health check (free).',
      'GET /openapi.json': 'OpenAPI document (free).',
      'GET /.well-known/x402': 'x402 discovery document (free).',
    },
    price: { amount: '5000', asset: 'USDC', network: 'eip155:8453', usd: '0.005' },
    payTo: '0x64eee79d896f48cfecb0687d4a68ec64e4e63ff3',
  });
};
