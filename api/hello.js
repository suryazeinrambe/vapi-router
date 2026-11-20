// Zen Hello API — x402 payable endpoint as a Vercel Serverless Function.
// Deploy: copy this folder's contents into your Vercel project's root
// (api/hello.js + api/health.js + api/info.js + api/openapi.js
//  + api/discovery.js + vercel.json), then redeploy. No dependencies, Node runtime.
//
// Payable endpoint: GET /hello (rewritten to /api/hello by vercel.json)
//   $0.005 USDC per call (x402 v2, exact scheme, Base mainnet)
//   No payment  -> HTTP 402 with the offer in the JSON body AND the
//                  base64 PAYMENT-REQUIRED header.
//   With a valid PAYMENT-SIGNATURE header -> verify + settle via the
//   facilitator (https://x402.org/facilitator), then serve
//   { "message": "Hello, world!" } with a PAYMENT-RESPONSE header.
//   Paid content is NEVER served unpaid.
//
// Payout wallet: Zen's zendiraizel wallet. Payments go DIRECTLY here.
// Never put a private key or seed phrase in this file (none is needed).
'use strict';

const FACILITATOR = process.env.FACILITATOR || 'https://x402.org/facilitator';
const PAY_TO = '0x64eee79d896f48cfecb0687d4a68ec64e4e63ff3';
const ASSET = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // canonical USDC on Base
const NETWORK = 'eip155:8453'; // Base mainnet
const AMOUNT = '5000'; // atomic units (6 decimals) = $0.005 USDC per call
const MAX_TIMEOUT_SECONDS = 120;
const SERVICE_NAME = 'Zen Hello API';
// Vercel Hobby functions time out at 10s — keep facilitator calls well inside that.
const FACILITATOR_TIMEOUT_MS = 8000;

function baseUrl(req) {
  const pub = (process.env.PUBLIC_URL || '').replace(/\/$/, '');
  if (pub) return pub;
  const host = req.headers.host || req.headers['x-forwarded-host'] || '';
  return `https://${host}`;
}

function paymentOption() {
  return {
    scheme: 'exact',
    network: NETWORK,
    amount: AMOUNT,
    asset: ASSET,
    payTo: PAY_TO,
    maxTimeoutSeconds: MAX_TIMEOUT_SECONDS,
    extra: { name: 'USD Coin', version: '2' },
  };
}

// x402 v2 offer, exactly as the vAPI docs' minimal example.
function buildOffer(req) {
  const url = `${baseUrl(req)}/hello`;
  return {
    x402Version: 2,
    error: 'Payment required',
    resource: {
      url,
      description: 'A simple hello world greeting.',
      mimeType: 'application/json',
      serviceName: SERVICE_NAME,
    },
    accepts: [paymentOption()],
  };
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, PAYMENT-SIGNATURE, PAYMENT-REQUIRED, PAYMENT-RESPONSE',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Expose-Headers': 'PAYMENT-REQUIRED, PAYMENT-RESPONSE',
  };
}

function sendJson(res, status, obj, extraHeaders) {
  res.status(status);
  res.setHeader('Content-Type', 'application/json');
  for (const [k, v] of Object.entries({ ...corsHeaders(), ...(extraHeaders || {}) })) {
    res.setHeader(k, v);
  }
  res.json(obj);
}

// 402 with the offer in BOTH the body and the base64 PAYMENT-REQUIRED header.
function send402(req, res, errorMessage) {
  const offer = buildOffer(req);
  if (errorMessage) offer.error = errorMessage;
  const body = JSON.stringify(offer);
  res.status(402);
  res.setHeader('Content-Type', 'application/json');
  for (const [k, v] of Object.entries(corsHeaders())) res.setHeader(k, v);
  res.setHeader('PAYMENT-REQUIRED', Buffer.from(body).toString('base64'));
  res.send(body);
}

async function postJson(url, obj) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FACILITATOR_TIMEOUT_MS);
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(obj),
      signal: ctrl.signal,
    });
    return await r.json().catch(() => null);
  } finally {
    clearTimeout(timer);
  }
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(204);
    for (const [k, v] of Object.entries(corsHeaders())) res.setHeader(k, v);
    res.end();
    return;
  }
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'Method not allowed' });

  const encoded = req.headers['payment-signature'];
  if (!encoded) return send402(req, res);

  let payment;
  try {
    payment = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
  } catch {
    return send402(req, res, 'Invalid payment');
  }

  const offer = buildOffer(req);
  const body = {
    x402Version: 2,
    paymentPayload: payment,
    paymentRequirements: offer.accepts[0],
  };

  try {
    const verified = await postJson(`${FACILITATOR}/verify`, body);
    if (!verified || verified.isValid !== true) {
      return send402(req, res, 'Payment verification failed');
    }
    const settlement = await postJson(`${FACILITATOR}/settle`, body);
    if (!settlement || settlement.success !== true) {
      return send402(req, res, 'Payment settlement failed');
    }
    sendJson(res, 200, { message: 'Hello, world!' }, {
      'PAYMENT-RESPONSE': Buffer.from(JSON.stringify(settlement)).toString('base64'),
    });
  } catch (err) {
    // Facilitator unreachable / timeout / bad response: fail closed.
    // Never serve the paid content, never crash.
    console.error('facilitator error:', err && err.message ? err.message : err);
    return send402(req, res, 'Payment verification failed');
  }
};
