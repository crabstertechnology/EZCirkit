const fs = require('fs');
const path = require('path');

const COMPILER_URL = 'https://ezcirkit.onrender.com/api/compile';

function isValidIntelHex(hex) {
  if (!hex || typeof hex !== 'string') return false;
  const trimmed = hex.trim();
  return trimmed.startsWith(':') && trimmed.includes(':00000001FF');
}

async function compileCodeWithRetry(code, title, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`  [Attempt ${attempt}/${maxRetries}] Compiling "${title}" via ${COMPILER_URL}...`);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 80000); // 80s timeout

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
        console.log(`  Waiting 4 seconds before retry...`);
        await new Promise((r) => setTimeout(r, 4000));
      } else {
        throw err;
      }
    }
  }
}

async function compileAll() {
  const forceRecompile = process.argv.includes('--force') || !process.argv.includes('--reuse');
  console.log('=== EZCirkit Precompiled Experiment Generator ===');
  console.log(`Mode: ${forceRecompile ? 'Fresh Recompile All via Render' : 'Reuse Existing Builds When Available'}\n`);

  console.log('Fetching tutorial chapters from Firestore REST API...');
  const chaptersRes = await fetch('https://firestore.googleapis.com/v1/projects/studio-2519724075-3b571/databases/(default)/documents/tutorialChapters');
  const chaptersData = await chaptersRes.json();
  const chapters = chaptersData.documents || [];
  console.log(`Found ${chapters.length} chapter(s).\n`);

  const outDir = path.join(process.cwd(), 'public', 'builds', 'experiments');
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

  const manifest = {};
  let totalSuccess = 0;
  let totalFail = 0;
  let totalSkipped = 0;

  for (const ch of chapters) {
    const chId = ch.name.split('/').pop();
    const chTitle = ch.fields?.title?.stringValue || chId;
    console.log(`\n--------------------------------------------------`);
    console.log(`Chapter: ${chTitle} (${chId})`);
    console.log(`--------------------------------------------------`);

    const tutsRes = await fetch(`https://firestore.googleapis.com/v1/projects/studio-2519724075-3b571/databases/(default)/documents/tutorialChapters/${chId}/tutorials`);
    const tutsData = await tutsRes.json();
    const tuts = tutsData.documents || [];
    console.log(`Found ${tuts.length} tutorials in this chapter.\n`);

    for (let i = 0; i < tuts.length; i++) {
      const t = tuts[i];
      const id = t.fields?.id?.stringValue || t.name.split('/').pop();
      const title = t.fields?.title?.stringValue || 'Tutorial';
      const code = t.fields?.code?.stringValue || '';
      const description = t.fields?.description?.stringValue || '';
      const diagramUrl = t.fields?.diagramUrl?.stringValue || '';
      const pinout = t.fields?.pinout?.stringValue || '';
      const videoId = t.fields?.videoId?.stringValue || '';
      const duration = t.fields?.duration?.stringValue || '5 mins';
      const order = parseInt(t.fields?.order?.integerValue || `${i + 1}`, 10);
      const isHidden = t.fields?.isHidden?.booleanValue ?? false;
      const isVideoOnly = t.fields?.isVideoOnly?.booleanValue ?? false;
      const firestoreHex = t.fields?.compiledHex?.stringValue || '';

      const indexStr = `[${i + 1}/${tuts.length}]`;
      console.log(`${indexStr} Processing: "${title}" (ID: ${id})`);

      if (!code.trim()) {
        console.log(`  ℹ Skipping code compilation: Video/intro experiment (no code sketch)`);
        totalSkipped++;
        manifest[id] = {
          id,
          chapterId: chId,
          title,
          description,
          code: '',
          diagramUrl,
          pinout,
          videoId,
          duration,
          order,
          isHidden,
          isVideoOnly: true,
        };
        continue;
      }

      const hexFilePath = path.join(outDir, `${id}.hex`);
      let hexData = '';

      if (!forceRecompile && isValidIntelHex(existingManifest[id]?.compiledHex)) {
        hexData = existingManifest[id].compiledHex;
        console.log(`  ✓ Reusing existing valid build (${(hexData.length / 1024).toFixed(1)} KB)`);
      } else {
        try {
          hexData = await compileCodeWithRetry(code, title);
          console.log(`  ✓ Compiled successfully via Render! Size: ${(hexData.length / 1024).toFixed(1)} KB`);
        } catch (compileErr) {
          console.error(`  ✗ Fresh compile failed: ${compileErr.message}`);
          if (isValidIntelHex(firestoreHex)) {
            hexData = firestoreHex;
            console.log(`  ⚠ Falling back to existing valid Firestore binary (${(hexData.length / 1024).toFixed(1)} KB)`);
          } else if (fs.existsSync(hexFilePath)) {
            hexData = fs.readFileSync(hexFilePath, 'utf-8');
            console.log(`  ⚠ Falling back to existing disk binary (${(hexData.length / 1024).toFixed(1)} KB)`);
          } else {
            totalFail++;
            continue;
          }
        }
      }

      // Save individual HEX file to disk
      fs.writeFileSync(hexFilePath, hexData, 'utf-8');

      manifest[id] = {
        id,
        chapterId: chId,
        title,
        description,
        code,
        diagramUrl,
        pinout,
        videoId,
        duration,
        order,
        isHidden,
        isVideoOnly,
        hexUrl: `/builds/experiments/${id}.hex`,
        hexSize: hexData.length,
        compiledHex: hexData,
        compiledAt: new Date().toISOString(),
      };
      totalSuccess++;
    }
  }

  // Write manifest.json
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  console.log(`\n✓ Written: ${manifestPath} (${Object.keys(manifest).length} experiments)`);

  // Write bundle.js for instant offline Web IDE loading
  const jsBundlePath = path.join(outDir, 'bundle.js');
  const bundleContent = `/**
 * Auto-generated EZCirkit experiment precompiled binary bundle.
 * Generated: ${new Date().toISOString()}
 * Experiments: ${Object.keys(manifest).length}
 */
window.PRECOMPILED_EXPERIMENTS = ${JSON.stringify(manifest, null, 2)};
`;
  fs.writeFileSync(jsBundlePath, bundleContent, 'utf-8');
  console.log(`✓ Written: ${jsBundlePath} (${(bundleContent.length / 1024).toFixed(1)} KB)`);

  console.log(`\n========================================`);
  console.log(`PRECOMPILATION COMPLETE:`);
  console.log(`  Successfully compiled/verified: ${totalSuccess}`);
  console.log(`  Skipped (video-only):           ${totalSkipped}`);
  console.log(`  Failed:                         ${totalFail}`);
  console.log(`  Manifest entries:               ${Object.keys(manifest).length}`);
  console.log(`========================================\n`);
}

compileAll().catch((err) => {
  console.error('Fatal compilation error:', err);
  process.exit(1);
});
