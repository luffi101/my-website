// admin.js

document.addEventListener('DOMContentLoaded', function() {
    // -------------------------------
    // Authentication Check: Redirect if not logged in.
    // -------------------------------
    firebase.auth().onAuthStateChanged(user => {
      if (!user) {
        alert("You must be logged in to access the admin page.");
        window.location.href = "index.html";
      } else {
        // Optionally, display user info.
        document.getElementById("auth-info").innerText = `Logged in as ${user.displayName}`;
        // Load records.
        loadGlobalEvents();
        loadHistoricalFigures();
      }
    });
  
    // -------------------------------
    // Load Global Events from Firestore and populate the table.
    // -------------------------------
    function loadGlobalEvents() {
      firebase.firestore().collection("globalEvents")
        .get()
        .then(snapshot => {
          const tbody = document.getElementById("globalEventsTable").querySelector("tbody");
          tbody.innerHTML = "";
          snapshot.forEach(doc => {
            const data = doc.data();
            const tr = document.createElement("tr");
            tr.innerHTML = `
              <td>${data.eventName || ""}</td>
              <td>${data.eventDate || ""}</td>
              <td>${data.eventEndDate || data.eventDate || ""}</td>
              <td>${data.description || ""}</td>
              <td>${data.category || ""}</td>
              <td>${data.region || ""}</td>
              <td>
                <button class="edit-button" onclick="openEditForm('globalEvents', '${doc.id}')">Edit</button>
              </td>
            `;
            tbody.appendChild(tr);
          });
        })
        .catch(error => {
          console.error("Error loading global events:", error);
        });
    }
  
    // -------------------------------
    // Load Historical Figures from Firestore and populate the table.
    // -------------------------------
    function loadHistoricalFigures() {
      firebase.firestore().collection("historicalFigures")
        .get()
        .then(snapshot => {
          const tbody = document.getElementById("historicalFiguresTable").querySelector("tbody");
          tbody.innerHTML = "";
          snapshot.forEach(doc => {
            const data = doc.data();
            const tr = document.createElement("tr");
            tr.innerHTML = `
              <td>${data.name || ""}</td>
              <td>${data.dateOfBirth || ""}</td>
              <td>${data.dateOfDeath || ""}</td>
              <td>${data.nationality || ""}</td>
              <td>${data.description || ""}</td>
              <td>${data.region || ""}</td>
              <td>
                <button class="edit-button" onclick="openEditForm('historicalFigures', '${doc.id}')">Edit</button>
              </td>
            `;
            tbody.appendChild(tr);
          });
        })
        .catch(error => {
          console.error("Error loading historical figures:", error);
        });
    }
  
    // -------------------------------
    // Open the Edit Form and Populate Fields
    // -------------------------------
    window.openEditForm = function(collectionName, docId) {
      const docRef = firebase.firestore().collection(collectionName).doc(docId);
      docRef.get().then(doc => {
        if (doc.exists) {
          const data = doc.data();
          // Set hidden fields
          document.getElementById("docId").value = docId;
          document.getElementById("collectionName").value = collectionName;
          // Hide both sets of fields initially.
          document.getElementById("globalEventsEditFields").style.display = "none";
          document.getElementById("historicalFiguresEditFields").style.display = "none";
          
          if (collectionName === "globalEvents") {
            document.getElementById("editEventName").value = data.eventName || "";
            document.getElementById("editEventDate").value = data.eventDate || "";
            document.getElementById("editEventEndDate").value = data.eventEndDate || data.eventDate || "";
            document.getElementById("editEventDescription").value = data.description || "";
            document.getElementById("editEventCategory").value = data.category || "";
            document.getElementById("editEventRegion").value = data.region || "";
            document.getElementById("globalEventsEditFields").style.display = "block";
          } else if (collectionName === "historicalFigures") {
            document.getElementById("editName").value = data.name || "";
            document.getElementById("editDateOfBirth").value = data.dateOfBirth || "";
            document.getElementById("editDateOfDeath").value = data.dateOfDeath || "";
            document.getElementById("editNationality").value = data.nationality || "";
            document.getElementById("editDescription").value = data.description || "";
            document.getElementById("editRegion").value = data.region || "";
            document.getElementById("historicalFiguresEditFields").style.display = "block";
          }
          document.getElementById("editFormContainer").style.display = "block";
        } else {
          alert("Document not found!");
        }
      }).catch(error => {
        console.error("Error fetching document:", error);
      });
    };
  
    // -------------------------------
    // Close the Edit Form
    // -------------------------------
    window.closeEditForm = function() {
      document.getElementById("editFormContainer").style.display = "none";
    };
  
    // -------------------------------
    // Handle Edit Form Submission to Update Record
    // -------------------------------
    document.getElementById("editForm").addEventListener("submit", function(e) {
      e.preventDefault();
      const docId = document.getElementById("docId").value;
      const collectionName = document.getElementById("collectionName").value;
      const docRef = firebase.firestore().collection(collectionName).doc(docId);
      
      let updatedData = {};
      if (collectionName === "globalEvents") {
        updatedData = {
          eventName: document.getElementById("editEventName").value.trim(),
          eventDate: document.getElementById("editEventDate").value,
          eventEndDate: document.getElementById("editEventEndDate").value,
          description: document.getElementById("editEventDescription").value.trim(),
          category: document.getElementById("editEventCategory").value.trim(),
          region: document.getElementById("editEventRegion").value.trim()
        };
      } else if (collectionName === "historicalFigures") {
        updatedData = {
          name: document.getElementById("editName").value.trim(),
          dateOfBirth: document.getElementById("editDateOfBirth").value,
          dateOfDeath: document.getElementById("editDateOfDeath").value,
          nationality: document.getElementById("editNationality").value.trim(),
          description: document.getElementById("editDescription").value.trim(),
          region: document.getElementById("editRegion").value.trim()
        };
      }
      
      docRef.update(updatedData)
        .then(() => {
          alert("Record updated successfully!");
          closeEditForm();
          // Reload both tables.
          loadGlobalEvents();
          loadHistoricalFigures();
        })
        .catch(error => {
          console.error("Error updating record:", error);
          alert("Error updating record: " + error.message);
        });
    });
  
    // -------------------------------
    // CSV Import Functionality (if needed)
    // -------------------------------
    document.getElementById("csvImportForm")?.addEventListener("submit", function(e) {
      e.preventDefault();
      const fileInput = document.getElementById("csvFile");
      const dataType = document.getElementById("csvDataType").value;
      const file = fileInput.files[0];
      if (!file) {
        document.getElementById("csvFeedback").innerText = "Please select a CSV file.";
        return;
      }
    
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
          console.log("Parsed CSV data:", results.data);
    
          if (dataType === "historicalFigures") {
            results.data.forEach(row => {
              const name = row.name;
              const dateOfBirth = row.dateOfBirth;
              const dateOfDeath = row.dateOfDeath;
              const description = row.description;
              const groupsField = row.groups;
              const groupsArr = groupsField ? groupsField.split(",").map(s => s.trim()) : [];
              const imageURL = row.imageURL; // Adjust field name if necessary.
              const nationality = row.nationality;
              const region = row.region || "unknown";
              
              firebase.firestore().collection("historicalFigures").add({
                name: name,
                dateOfBirth: dateOfBirth,
                dateOfDeath: dateOfDeath,
                description: description,
                groups: groupsArr,
                imageURL: imageURL,
                nationality: nationality,
                region: region
              }).then(() => {
                console.log(`Added historical figure: ${name}`);
              }).catch(error => {
                console.error("Error adding historical figure:", error);
              });
            });
          } else if (dataType === "globalEvents") {
            results.data.forEach(row => {
              const eventName = row.eventName;
              const eventDate = row.eventDate;
              const eventEndDate = row.eventEndDate;
              const description = row.description;
              const category = row.category;
              const region = row.region;
              const significance = row.significance;
              const createdOn = new Date().toISOString().slice(0, 10);
        
              firebase.firestore().collection("globalEvents").add({
                eventName: eventName,
                eventDate: eventDate,
                eventEndDate: eventEndDate,
                description: description,
                category: category,
                region: region,
                significance: significance,
                createdOn: createdOn
              }).then(() => {
                console.log(`Added global event: ${eventName}`);
              }).catch(error => {
                console.error("Error adding global event:", error);
              });
            });
          }
          
          document.getElementById("csvFeedback").innerText = "CSV import completed successfully.";
        },
        error: function(err) {
          console.error("Error parsing CSV:", err);
          document.getElementById("csvFeedback").innerText = "Error parsing CSV file.";
        }
      });
    });
  });
  