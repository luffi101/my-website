const db = firebase.firestore();

// Check if user is logged in before showing the form
firebase.auth().onAuthStateChanged(user => {
    if (user) {
        document.getElementById('journal-form').style.display = 'block';
        loadJournalEntries(user.uid); // Load user-specific entries
    } else {
        loadJournalEntries(null); // Load only public entries
    }
});

// Load journal entries
function loadJournalEntries(userId) {
    db.collection('journalEntries').get().then(snapshot => {
        const entriesList = document.getElementById('entries-list');
        entriesList.innerHTML = '';

        snapshot.forEach(doc => {
            const entry = doc.data();

            // Show only public entries OR the user's private entries
            if (!entry.private || (userId && entry.userId === userId)) {
                const entryItem = document.createElement('li');
                entryItem.innerHTML = `<h3>${entry.title}</h3><p>${entry.content}</p>`;
                entriesList.appendChild(entryItem);
            }
        });
    });
}

// Add new entry
document.getElementById('new-entry-form').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const user = firebase.auth().currentUser;
    if (!user) return alert('You must be logged in to add an entry');

    const title = document.getElementById('entry-title').value.trim();
    const content = document.getElementById('entry-content').value.trim();
    const isPrivate = document.getElementById('entry-private').checked;

    if (title && content) {
        db.collection('journalEntries').add({
            title,
            content,
            private: isPrivate,
            userId: user.uid,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
            document.getElementById('new-entry-form').reset();
            loadJournalEntries(user.uid);
        });
    }
});
