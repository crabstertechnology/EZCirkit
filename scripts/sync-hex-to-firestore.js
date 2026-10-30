const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
  console.error("Missing Firebase credentials in .env.local");
  process.exit(1);
}

initializeApp({
  credential: cert({ projectId, clientEmail, privateKey })
});

const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });

async function syncHexToFirestore() {
  const buildsDir = path.join(process.cwd(), 'public', 'builds', 'experiments');
  const manifestPath = path.join(buildsDir, 'manifest.json');

  if (!fs.existsSync(manifestPath)) {
    console.error("manifest.json not found in", buildsDir);
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const experimentIds = Object.keys(manifest);
  console.log(`Found ${experimentIds.length} experiments in manifest.json to sync to Firestore...`);

  const chapterId = 'FkNHrAv6t862HjjMMeIg';

  for (const expId of experimentIds) {
    const hexPath = path.join(buildsDir, `${expId}.hex`);
    if (!fs.existsSync(hexPath)) {
      console.warn(`HEX file missing for ${expId}`);
      continue;
    }

    const hexContent = fs.readFileSync(hexPath, 'utf8');
    const docRef = db.collection('tutorialChapters').doc(chapterId).collection('tutorials').doc(expId);

    console.log(`Updating Firestore tutorial: ${manifest[expId].title} (${expId}) with ${hexContent.length} bytes HEX...`);
    await docRef.set({ compiledHex: hexContent }, { merge: true });
  }

  console.log("All existing experiments in Firestore now have compiledHex attached!");
}

syncHexToFirestore().catch(console.error);

