/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  EZCirkit – Automatic SEO Content Generator                    ║
 * ║  Calls the internal Next.js API to batch-update all products    ║
 * ║  with metaTitle, metaDescription, and FAQs in Firestore.        ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * Usage:  node scripts/generate-product-seo.js
 *
 * REQUIRES: next dev server running on port 3000  OR
 *           run `node scripts/generate-product-seo.js --port 3001`
 */

const http = require('http');

// ─── Config ───────────────────────────────────────────────────────────────────
const PORT   = process.argv.includes('--port')
  ? process.argv[process.argv.indexOf('--port') + 1]
  : '3000';
const SECRET = 'ezcirkit-seo-2024-internal';

// ─── HTTP helper ──────────────────────────────────────────────────────────────
function post(path, headers = {}, body = {}) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const options = {
      hostname: 'localhost',
      port:     parseInt(PORT, 10),
      path,
      method:   'POST',
      headers: {
        'Content-Type':     'application/json',
        'Content-Length':   Buffer.byteLength(payload),
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   EZCirkit – Auto SEO Content Generator      ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');
  console.log(`📡 Calling local Next.js server on port ${PORT}...`);
  console.log('');

  let res;
  try {
    res = await post(
      '/api/internal/bulk-seo',
      { 'x-internal-secret': SECRET },
    );
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      console.error('❌ Could not connect to Next.js dev server!');
      console.error(`   Make sure "npm run dev" is running on port ${PORT}.`);
      console.error('   Then re-run this script in a separate terminal.');
    } else {
      console.error('❌ Request failed:', err.message);
    }
    process.exit(1);
  }

  if (res.status !== 200) {
    console.error(`❌ API returned HTTP ${res.status}:`);
    console.error(JSON.stringify(res.body, null, 2));
    process.exit(1);
  }

  const { updated, products } = res.body;
  console.log(`✅ Successfully updated ${updated} products!\n`);
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('   ID'.padEnd(24) + 'Name'.padEnd(46) + 'FAQs');
  console.log('───────────────────────────────────────────────────────────────');
  for (const p of products) {
    const id   = (p.id || '').substring(0, 22).padEnd(24);
    const name = (p.name || '').substring(0, 44).padEnd(46);
    console.log(`   ${id}${name}${p.faqCount} FAQs`);
  }
  console.log('═══════════════════════════════════════════════════════════════');

  console.log('');
  console.log('📋 Generated SEO Titles:');
  for (const p of products) {
    console.log(`   [${p.id}]`);
    console.log(`      Title : ${p.metaTitle}`);
    console.log(`      Desc  : ${p.metaDescription.substring(0, 80)}...`);
    console.log('');
  }

  console.log('🎉 Done! All products are now SEO-optimized in Firestore.');
  console.log('   Verify rich results: https://search.google.com/test/rich-results');
  console.log('');
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
