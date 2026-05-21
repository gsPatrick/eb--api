/**
 * Smoke test — verifies the API responds without a database connection.
 * Run with: npm run smoke:test (requires server running).
 */

const http = require('http');

const port = process.env.PORT || 3000;
const prefix = process.env.APP_API_PREFIX || '/api';

function request(path) {
  return new Promise((resolve, reject) => {
    http
      .get({ hostname: 'localhost', port, path: `${prefix}${path}` }, (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          resolve({ statusCode: res.statusCode, body: JSON.parse(body) });
        });
      })
      .on('error', reject);
  });
}

async function run() {
  const ping = await request('/v1/ping');
  if (ping.statusCode !== 200 || !ping.body.data?.pong) {
    throw new Error('Ping check failed');
  }

  console.log('[smoke:test] OK — /v1/ping responded correctly');
}

run().catch((error) => {
  console.error('[smoke:test] FAILED:', error.message);
  process.exit(1);
});
