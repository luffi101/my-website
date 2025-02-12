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

  // Function to load journal entries, ordered by timestamp (newest first)
  function loadJournalEntries(userId) {
    firebase.firestore().collection('journals')
      .orderBy('timestamp', 'desc')
      .get()
      .then(snapshot => {
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
                  
                  // Convert Firestore timestamp to a Date string (if available)
                  let displayDate = '';
                  if (entry.timestamp && entry.timestamp.toDate) {
                      const dateObj = entry.timestamp.toDate();
                      displayDate = dateObj.toLocaleString(); // e.g., "2/9/2025, 5:05:57 PM"
                  }
                  
                  // Replace newline characters with <br> tags for proper formatting
                  const formattedContent = entry.content.replace(/\n/g, "<br>");
                  
                  // Display date at the top, then title and content.
                  entryItem.innerHTML = `<small>${displayDate}</small>
                                           <h3>${entry.title}</h3>
                                           <p>${formattedContent}</p>`;
                  
                  // If the entry is private and belongs to the logged-in user, add a "Make Public" button.
                  if (entry.isPrivate && userId && entry.uid === userId) {
                      const makePublicBtn = document.createElement('button');
                      makePublicBtn.innerText = "Make Public";
                      makePublicBtn.addEventListener("click", function() {
                          firebase.firestore().collection("journals").doc(doc.id)
                            .update({ isPrivate: false })
                            .then(() => {
                                console.log("Entry updated to public.");
                                loadJournalEntries(userId);
                            })
                            .catch((error) => {
                                console.error("Error updating entry:", error);
                            });
                      });
                      entryItem.appendChild(makePublicBtn);
                  }
                  
                  // If the entry belongs to the logged-in user, add a "Delete" button.
                  if (userId && entry.uid === userId) {
                      const deleteBtn = document.createElement('button');
                      deleteBtn.innerText = "Delete";
                      deleteBtn.addEventListener("click", function() {
                          if (confirm("Are you sure you want to delete this entry?")) {
                              firebase.firestore().collection("journals").doc(doc.id).delete()
                                .then(() => {
                                    console.log("Entry deleted.");
                                    loadJournalEntries(userId);
                                })
                                .catch(error => {
                                    console.error("Error deleting entry:", error);
                                });
                          }
                      });
                      entryItem.appendChild(deleteBtn);
                  }
                  
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
          // New entries are private by default.
          const isPrivate = true;

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
