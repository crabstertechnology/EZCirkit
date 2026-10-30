const fs = require('fs');
const path = require('path');

async function compileAll() {
  console.log('Fetching tutorial chapters from Firestore...');
  const chaptersRes = await fetch('https://firestore.googleapis.com/v1/projects/studio-2519724075-3b571/databases/(default)/documents/tutorialChapters');
  const chaptersData = await chaptersRes.json();
  const chapters = chaptersData.documents || [];

  const outDir = path.join(process.cwd(), 'public', 'builds', 'experiments');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const manifest = {};
  let totalSuccess = 0;
  let totalFail = 0;

  for (const ch of chapters) {
    const chId = ch.name.split('/').pop();
    console.log(`\nProcessing Chapter: ${ch.fields?.title?.stringValue || chId}`);
    
    const tutsRes = await fetch(`https://firestore.googleapis.com/v1/projects/studio-2519724075-3b571/databases/(default)/documents/tutorialChapters/${chId}/tutorials`);
    const tutsData = await tutsRes.json();
    const tuts = tutsData.documents || [];

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

      console.log(`[${i+1}/${tuts.length}] Checking build for "${title}" (ID: ${id})...`);
      
      if (!code.trim()) {
        console.warn(`  Skipping: Empty code`);
        continue;
      }

      const hexFilePath = path.join(outDir, `${id}.hex`);
      let hexData = '';

      // Check if already compiled on disk
      if (fs.existsSync(hexFilePath)) {
        hexData = fs.readFileSync(hexFilePath, 'utf-8');
        console.log(`  -> Reusing existing build on disk (${hexData.length} bytes)`);
      } else {
        // Compile via Render
        try {
          const start = Date.now();
          const res = await fetch('https://ezcirkit.onrender.com/api/compile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code })
          });
          const data = await res.json();
          const elapsed = Date.now() - start;

          if (data.success && data.hex) {
            hexData = data.hex;
            fs.writeFileSync(hexFilePath, hexData, 'utf-8');
            console.log(`  -> Compiled in ${elapsed}ms! HEX size: ${hexData.length} bytes`);
          } else {
            console.error(`  -> FAILED: ${data.error || 'Unknown compile error'}`);
            totalFail++;
            continue;
          }
        } catch (err) {
          console.error(`  -> NETWORK/SERVER ERROR: ${err.message}`);
          totalFail++;
          continue;
        }
      }

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
        hexUrl: `/builds/experiments/${id}.hex`,
        hexSize: hexData.length,
        compiledAt: new Date().toISOString()
      };
      totalSuccess++;
    }
  }

  const manifestPath = path.join(outDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');

  // Also write an embedded JS bundle so the Web IDE loads all builds instantly without any server/network
  const jsBundlePath = path.join(outDir, 'bundle.js');
  const bundleContent = `// Auto-generated precompiled experiment builds for EZCirkit Web IDE
window.PRECOMPILED_EXPERIMENTS = ${JSON.stringify(manifest, null, 2)};
`;
  fs.writeFileSync(jsBundlePath, bundleContent, 'utf-8');

  console.log(`\n========================================`);
  console.log(`BUILD SYNC COMPLETE:`);
  console.log(`  Successful builds: ${totalSuccess}`);
  console.log(`  Failed builds:     ${totalFail}`);
  console.log(`  Manifest:          ${manifestPath}`);
  console.log(`  JS Bundle:         ${jsBundlePath}`);
  console.log(`========================================\n`);
}

compileAll().catch(console.error);
