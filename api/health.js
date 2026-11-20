// Free health check: GET /health
'use strict';
module.exports = async function handler(req, res) {
  res.status(200);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({ ok: true });
};
