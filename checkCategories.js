const admin = require('firebase-admin');

// Initialize Firebase Admin using your service account credentials
admin.initializeApp({
  credential: admin.credential.cert(require('./serviceAccountKey.json'))
});

const db = admin.firestore();

async function checkCategories() {
  // Query documents where 'groups' array contains "politics"
  const snapshot = await db.collection('historicalFigures')
    .where('groups', 'array-contains', 'Arts & Culture')
    .get();

  if (snapshot.empty) {
    console.log('No documents found with the "politics" category.');
    return;
  }

  console.log(`Found ${snapshot.size} document(s) with "politics":`);
  snapshot.forEach(doc => {
    console.log(doc.id, doc.data().groups);
  });
}

checkCategories().catch(console.error);
