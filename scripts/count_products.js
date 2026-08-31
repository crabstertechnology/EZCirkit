const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined;

if (!projectId || !clientEmail || !privateKey) {
  console.error('Missing Firebase configuration in .env.local!');
  process.exit(1);
}

initializeApp({
  credential: cert({
    projectId,
    clientEmail,
    privateKey,
  }),
});

const db = getFirestore();

async function run() {
  try {
    const snapshot = await db.collection('products').get();
    console.log(`TOTAL_PRODUCTS_IN_FIRESTORE: ${snapshot.size}`);
    
    console.log('\nAll products in Firestore:');
    snapshot.docs.forEach((doc, idx) => {
      console.log(`${idx + 1}. [${doc.id}]: ${doc.data().name}`);
    });
  } catch (error) {
    console.error('Error fetching from Firestore:', error);
  }
}

run();
