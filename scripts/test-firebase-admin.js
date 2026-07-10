// Test script to verify if the Firebase Admin credentials in .env.local are valid and working.
const dotenv = require('dotenv');
const path = require('path');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Load .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

console.log('Project ID:', process.env.FIREBASE_PROJECT_ID);
console.log('Client Email:', process.env.FIREBASE_CLIENT_EMAIL);
console.log('Private Key Exists:', !!process.env.FIREBASE_PRIVATE_KEY);

if (!process.env.FIREBASE_PRIVATE_KEY) {
  console.error('Error: FIREBASE_PRIVATE_KEY is not defined in .env.local');
  process.exit(1);
}

try {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
  
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey,
    }),
  });

  const db = getFirestore();
  
  console.log('Attempting to fetch one document from products collection...');
  db.collection('products').limit(1).get()
    .then(snapshot => {
      if (snapshot.empty) {
        console.log('Success! Connected, but products collection is empty.');
      } else {
        console.log('Success! Successfully connected and fetched product:', snapshot.docs[0].id);
        console.log('Product Name:', snapshot.docs[0].data().name);
      }
      process.exit(0);
    })
    .catch(err => {
      console.error('Firestore Query Error:', err);
      process.exit(1);
    });

} catch (err) {
  console.error('Initialization Error:', err);
  process.exit(1);
}
