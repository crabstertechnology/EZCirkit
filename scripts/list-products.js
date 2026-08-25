const dotenv = require('dotenv');
const path = require('path');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

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
  
  db.collection('products').get()
    .then(snapshot => {
      console.log(`Total products: ${snapshot.size}`);
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        console.log(`- ID: ${doc.id}`);
        console.log(`  Name: ${data.name}`);
        console.log(`  Category: ${data.category}`);
        console.log(`  Price: ₹${data.price}`);
        console.log(`  Stock: ${data.stock}`);
        console.log(`  metaTitle: ${data.metaTitle || 'none'}`);
        console.log(`  metaDescription: ${data.metaDescription || 'none'}`);
        console.log('');
      });
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
