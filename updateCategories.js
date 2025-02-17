const admin = require('firebase-admin');

// Initialize Firebase Admin using your service account credentials
admin.initializeApp({
  credential: admin.credential.cert(require('./serviceAccountKey.json'))
});

const db = admin.firestore();

async function updateCategories() {
  // Query documents where 'groups' array contains "politics"
  const snapshot = await db.collection('historicalFigures')
    .where('groups', 'array-contains', 'Arts, Musics & Culture')
    .get();

  if (snapshot.empty) {
    console.log('No documents found with the "politics" category.');
    return;
  }

  const batch = db.batch();

  snapshot.forEach(doc => {
    const data = doc.data();
    // Replace any occurrence of "politics" (case-insensitive) with "Politics/Military"
    const updatedGroups = data.groups.map(cat => {
      if (cat.toLowerCase() === 'arts, musics & culture') {
        return 'Arts, Musics & Cultural';
      }
      return cat;
    });
    batch.update(doc.ref, { groups: updatedGroups });
  });

  await batch.commit();
  console.log('Documents successfully updated.');
}

updateCategories().catch(console.error);
