const { initializeApp } = require('firebase/app');
const { getFirestore, collectionGroup, getDocs, limit, query } = require('firebase/firestore');

const firebaseConfig = {
  "projectId": "studio-2519724075-3b571",
  "appId": "1:1063677286444:web:d59cc52205c940edda5989",
  "apiKey": "AIzaSyAaRHpOOODgLR9sinxecEqb2u7s8iT9158",
  "authDomain": "studio-2519724075-3b571.firebaseapp.com",
  "storageBucket": "studio-2519724075-3b571.firebasestorage.app",
  "measurementId": "",
  "messagingSenderId": "1063677286444"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  console.log("Fetching orders...");
  const q = query(collectionGroup(db, 'orders'), limit(10));
  const snap = await getDocs(q);
  console.log(`Found ${snap.size} orders:`);
  snap.forEach(doc => {
    const data = doc.data();
    console.log(`Order ID: ${doc.id}, User ID: ${data.userId}, Total: ${data.total}, Status: ${data.status}`);
  });
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
