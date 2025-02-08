// journal.js

// Ensure Firestore (db) and Auth (firebase.auth()) have been initialized via firebase-config.js

// Show the journal form if the user is logged in and load entries accordingly.
firebase.auth().onAuthStateChanged(user => {
    if (user) {
        document.getElementById('journal-form').style.display = 'block';
        loadJournalEntries(user.uid); // Load entries for this user (both public and private)
    } else {
        document.getElementById('journal-form').style.display = 'none';
        loadJournalEntries(null); // Load only public entries
    }
});

// Load journal entries from the "journals" collection.
function loadJournalEntries(userId) {
    db.collection('journals').get().then(snapshot => {
        const entriesList = document.getElementById('entries-list');
        entriesList.innerHTML = '';

        snapshot.forEach(doc => {
            const entry = doc.data();

            // Display entry if it is public or belongs to the logged-in user.
            if (!entry.isPrivate || (userId && entry.uid === userId)) {
                const entryItem = document.createElement('li');
                entryItem.innerHTML = `<h3>${entry.title}</h3><p>${entry.content}</p>`;
                entriesList.appendChild(entryItem);
            }
        });
    }).catch((error) => {
        console.error("Error loading journal entries:", error);
    });
}

// Handle the submission of a new journal entry.
document.getElementById("journalForm").addEventListener("submit", (e) => {
    e.preventDefault();
  
    // Get values from the form.
    const title = document.getElementById("entryTitle").value.trim();
    const content = document.getElementById("entryContent").value.trim();
    const isPrivate = document.getElementById("isPrivate").checked;
  
    // Check that the user is authenticated.
    const user = firebase.auth().currentUser;
    if (!user) {
      document.getElementById("feedback").innerText = "Please sign in to save your journal.";
      return;
    }
  
    // Prepare the journal entry object.
    const entry = {
      title: title,
      content: content,
      isPrivate: isPrivate,
      uid: user.uid,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };
  
    // Save to Firestore in the "journals" collection.
    db.collection("journals").add(entry)
      .then(() => {
        document.getElementById("feedback").innerText = "Journal entry saved successfully!";
        document.getElementById("journalForm").reset();
        // Reload entries after saving.
        loadJournalEntries(user.uid);
      })
      .catch((error) => {
        console.error("Error saving journal entry:", error);
        document.getElementById("feedback").innerText = "Error saving entry: " + error.message;
      });
});
