// Free OpenAPI document: GET /openapi.json
'use strict';
module.exports = async function handler(req, res) {
  res.status(200);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({
    openapi: '3.0.3',
    info: {
      title: 'Zen Hello API',
      version: '1.0.0',
      description: 'A simple hello world greeting. GET /hello costs $0.005 USDC (Base) per call, paid via x402.',
    },
    paths: {
      '/hello': {
        get: {
          summary: 'Hello world greeting (paid)',
          'x-payment-info': {
            scheme: 'exact',
            network: 'eip155:8453',
            amount: '5000',
            asset: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
            payTo: '0x64eee79d896f48cfecb0687d4a68ec64e4e63ff3',
            maxTimeoutSeconds: 120,
            extra: { name: 'USD Coin', version: '2' },
          },
          responses: {
            200: { description: 'Paid response — { "message": "Hello, world!" }' },
            402: { description: 'Payment required' },
          },
        },
      },
      '/health': {
        get: {
          summary: 'Health check (free)',
          responses: { 200: { description: 'OK' } },
        },
      },
    },
  });
};
