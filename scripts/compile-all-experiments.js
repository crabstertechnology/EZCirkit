const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!getApps().length) {
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}
const db = getFirestore();

const COMPILER_URL = 'https://ezcirkit.onrender.com/api/compile';

async function compileCodeWithRetry(code, title, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`  [Attempt ${attempt}/${maxRetries}] Compiling "${title}" via ${COMPILER_URL}...`);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 75000); // 75s timeout for Render cold start

      const res = await fetch(COMPILER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ code }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }

      const data = await res.json();
      if (!data.success || !data.hex) {
        throw new Error(data.error || data.stderr || 'Compilation returned failure');
      }

      return data.hex;
    } catch (err) {
      console.warn(`  Warning on attempt ${attempt}: ${err.message}`);
      if (attempt < maxRetries) {
        console.log(`  Waiting 5 seconds before retry...`);
        await new Promise((r) => setTimeout(r, 5000));
      } else {
        throw err;
      }
    }
  }
}

function isValidIntelHex(hex) {
  if (!hex || typeof hex !== 'string') return false;
  const trimmed = hex.trim();
  return trimmed.startsWith(':') && trimmed.includes(':00000001FF');
}

async function main() {
  console.log('=== EZCirkit Precompiled Experiment Generator ===\n');

  const outDir = path.join(__dirname, '..', 'public', 'builds', 'experiments');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const manifestPath = path.join(outDir, 'manifest.json');
  let existingManifest = {};
  if (fs.existsSync(manifestPath)) {
    try {
      existingManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch (e) {
      existingManifest = {};
    }
  }

  // Fetch all chapters and tutorials
  const chaptersSnap = await db.collection('tutorialChapters').orderBy('order').get();
  console.log(`Found ${chaptersSnap.docs.length} chapters in Firestore.`);

  const allTutorials = [];
  for (const chapDoc of chaptersSnap.docs) {
    const chapData = chapDoc.data();
    const tutsSnap = await chapDoc.ref.collection('tutorials').orderBy('order').get();
    for (const tutDoc of tutsSnap.docs) {
      allTutorials.push({
        ref: tutDoc.ref,
        id: tutDoc.id,
        chapterId: chapDoc.id,
        chapterTitle: chapData.title || '',
        ...tutDoc.data(),
      });
    }
  }

  console.log(`Total experiments found across all chapters: ${allTutorials.length}\n`);

  const manifest = {};
  let compiledCount = 0;
  let reusedCount = 0;
  let failedCount = 0;

  for (let i = 0; i < allTutorials.length; i++) {
    const tut = allTutorials[i];
    const indexStr = `[${i + 1}/${allTutorials.length}]`;
    console.log(`${indexStr} Processing: "${tut.title}" (ID: ${tut.id})`);

    let hexContent = '';

    // Check if we have valid hex in Firestore already
    if (isValidIntelHex(tut.compiledHex)) {
      hexContent = tut.compiledHex.trim();
      console.log(`  ✓ Reusing valid precompiled hex from Firestore (${(hexContent.length / 1024).toFixed(1)} KB)`);
      reusedCount++;
    } else if (existingManifest[tut.id] && isValidIntelHex(existingManifest[tut.id].compiledHex)) {
      // Check existing manifest
      hexContent = existingManifest[tut.id].compiledHex.trim();
      console.log(`  ✓ Reusing valid precompiled hex from existing manifest (${(hexContent.length / 1024).toFixed(1)} KB)`);
      reusedCount++;
      // Update Firestore with this hex so database stays in sync
      await tut.ref.update({ compiledHex: hexContent });
    } else {
      // Need to compile via Render cloud compiler
      if (!tut.code || !tut.code.trim()) {
        console.error(`  ✗ Cannot compile: No code found for tutorial ${tut.id}`);
        failedCount++;
        continue;
      }

      try {
        hexContent = await compileCodeWithRetry(tut.code, tut.title);
        console.log(`  ✓ Compiled successfully via Render! Binary size: ${(hexContent.length / 1024).toFixed(1)} KB`);
        compiledCount++;

        // Save to Firestore
        await tut.ref.update({ compiledHex: hexContent });
        console.log(`  ✓ Saved compiledHex to Firestore document`);
      } catch (compileErr) {
        console.error(`  ✗ Compilation failed for "${tut.title}":`, compileErr.message);
        failedCount++;
        continue;
      }
    }

    // Save individual .hex file to disk in public/builds/experiments
    const hexFilePath = path.join(outDir, `${tut.id}.hex`);
    fs.writeFileSync(hexFilePath, hexContent, 'utf-8');

    // Add to manifest
    manifest[tut.id] = {
      id: tut.id,
      chapterId: tut.chapterId,
      title: tut.title || 'Experiment',
      order: tut.order || i + 1,
      code: tut.code || '',
      description: tut.description || '',
      diagramUrl: tut.diagramUrl || '',
      pinout: tut.pinout || '',
      components: Array.isArray(tut.components) ? tut.components : [],
      videoId: tut.videoId || '',
      duration: tut.duration || '5 mins',
      hexUrl: `/builds/experiments/${tut.id}.hex`,
      compiledHex: hexContent,
      compiledAt: new Date().toISOString(),
      hexBytes: hexContent.length,
    };
  }

  // Write updated manifest.json
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  console.log(`\n✓ Written public/builds/experiments/manifest.json (${Object.keys(manifest).length} experiments)`);

  // Write updated bundle.js
  const bundlePath = path.join(outDir, 'bundle.js');
  const bundleContent = `/**\n * Auto-generated EZCirkit experiment precompiled binary bundle.\n * Generated: ${new Date().toISOString()}\n * Experiments: ${Object.keys(manifest).length}\n */\nwindow.PRECOMPILED_EXPERIMENTS = ${JSON.stringify(manifest, null, 2)};\n`;
  fs.writeFileSync(bundlePath, bundleContent, 'utf-8');
  console.log(`✓ Written public/builds/experiments/bundle.js (${(bundleContent.length / 1024).toFixed(1)} KB)`);

  console.log('\n=== Summary ===');
  console.log(`Total Experiments: ${allTutorials.length}`);
  console.log(`Reused Existing Valid Hex: ${reusedCount}`);
  console.log(`Newly Compiled via Render: ${compiledCount}`);
  console.log(`Failed / Skipped: ${failedCount}`);
  console.log(`Manifest & Bundle total: ${Object.keys(manifest).length}`);
  console.log('All precompiled data is ready for instant 0ms flashing!');
}

main().catch((err) => {
  console.error('Fatal error running experiment compiler script:', err);
  process.exit(1);
});
