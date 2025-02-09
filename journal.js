// journal.js

document.addEventListener('DOMContentLoaded', function() {
  // Monitor authentication state and update the UI accordingly.
  firebase.auth().onAuthStateChanged(user => {
    if (user) {
      console.log("User is logged in:", user.uid);
      document.getElementById('journal-form').style.display = 'block';
      loadJournalEntries(user.uid); // Load entries for this user (both public and private)
    } else {
      console.log("No user logged in");
      document.getElementById('journal-form').style.display = 'none';
      loadJournalEntries(null); // Load only public entries
    }
  });

  // Function to load journal entries from the "journals" collection.
  function loadJournalEntries(userId) {
    console.log("Loading entries for user:", userId);
    firebase.firestore().collection('journals').get()
      .then(snapshot => {
        console.log("Snapshot size:", snapshot.size);
        const entriesList = document.getElementById('entries-list');
        const countElement = document.getElementById('journal-count');
        entriesList.innerHTML = '';
        let count = 0;

        snapshot.forEach(doc => {
          console.log("Doc ID:", doc.id, "Data:", doc.data());
          const entry = doc.data();
          // Display entry if it is public or belongs to the logged-in user.
          if (!entry.isPrivate || (userId && entry.uid === userId)) {
            count++;
            const entryItem = document.createElement('li');
            entryItem.innerHTML = `<h3>${entry.title}</h3><p>${entry.content}</p>`;
            entriesList.appendChild(entryItem);
          }
        });

        if (countElement) {
          countElement.innerText = `Total Journal Entries: ${count}`;
        }
      })
      .catch((error) => {
        console.error("Error loading journal entries:", error);
      });
  }

  // Handle the submission of a new journal entry.
  const journalForm = document.getElementById("journalForm");
  if (journalForm) {
    journalForm.addEventListener("submit", (e) => {
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
      firebase.firestore().collection("journals").add(entry)
        .then(() => {
          document.getElementById("feedback").innerText = "Journal entry saved successfully!";
          journalForm.reset();
          // Reload entries after saving.
          loadJournalEntries(user.uid);
        })
        .catch((error) => {
          console.error("Error saving journal entry:", error);
          document.getElementById("feedback").innerText = "Error saving entry: " + error.message;
        });
    });
  }
});
