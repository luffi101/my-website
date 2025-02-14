// timeline.js

document.addEventListener('DOMContentLoaded', function() {
  const container = document.getElementById('timeline-container');

  // Milliseconds per year (using 365.25 days/year)
  const msPerYear = 31557600000;

  // Desired zoom limits using George Washington’s 67-year lifespan as a reference:
  // Zoom In: minimum visible span = 201 years (so his block occupies ~1/3 of the container width).
  const zoomMin = 201 * msPerYear;
  
  // Zoom Out: ensure his block remains at least ~1 inch (≈96px) wide.
  const containerWidth = container.offsetWidth;
  const zoomMax = (67 * msPerYear * containerWidth) / 96;

  const options = {
    orientation: 'top',
    showCurrentTime: false,
    zoomMin: zoomMin,
    zoomMax: zoomMax,
    min: new Date("0001-01-01"),
    max: new Date("2025-12-31"),
    stack: false,
    groupOrder: 'content',
    tooltip: {
      delay: 100,
      followMouse: true
    },
    margin: {
      item: { horizontal: 0, vertical: 5 }
    }
  };

  // Define groups (categories) for the timeline.
  const groups = [
    { id: "Politics", content: "Politics" },
    { id: "Science", content: "Science" },
    { id: "Economy", content: "Economy" }
  ];

  // Retrieve historical figures from Firestore.
  firebase.firestore().collection("historicalFigures")
    .get()
    .then(snapshot => {
       const items = [];
       snapshot.forEach(doc => {
           const data = doc.data();

           let birthDateStr = data.dateOfBirth;
           if (birthDateStr && birthDateStr.length === 4) {
             birthDateStr += "-01-01";
           }
           let deathDateStr = data.dateOfDeath;
           if (deathDateStr && deathDateStr.length === 4) {
             deathDateStr += "-01-01";
           }

           const startDate = birthDateStr ? new Date(birthDateStr) : null;
           const endDate = deathDateStr ? new Date(deathDateStr) : null;
           if (!startDate || !endDate) {
             console.warn(`Skipping ${data.name} due to missing or invalid dates.`);
             return;
           }

           // For groups, use the first element from the groups array; default to "Politics".
           const primaryGroup = (data.groups && data.groups.length > 0) ? data.groups[0] : "Politics";

           // Process name: convert "Lastname, Firstname" to "Firstname Lastname".
           let formattedName = data.name;
           if (formattedName && formattedName.includes(",")) {
             const parts = formattedName.split(",");
             if (parts.length >= 2) {
               formattedName = parts[1].trim() + " " + parts[0].trim();
             }
           }

           // Build content HTML: Only display the name.
           let contentHTML = `<div class="figure-content">
                                  <h3>${formattedName}</h3>
                                </div>`;

           items.push({
             id: doc.id,
             group: primaryGroup,
             content: contentHTML,
             start: startDate,
             end: endDate
           });
       });

       console.log("Timeline items:", items);
       // Initialize the timeline with the fetched items.
       const timeline = new vis.Timeline(container, items, groups, options);
    })
    .catch(error => {
       console.error("Error loading historical figures:", error);
    });
  
  // Show/hide the "Add Historical Figure" form based on authentication.
  firebase.auth().onAuthStateChanged(user => {
    const figureFormSection = document.getElementById('figure-form-section');
    if (figureFormSection) {
      figureFormSection.style.display = user ? 'block' : 'none';
    }
  });

  // Add event listener for the new historical figure form.
  const figureForm = document.getElementById("figureForm");
  if (figureForm) {
    figureForm.addEventListener("submit", (e) => {
      e.preventDefault();
      
      // Get form values.
      const name = document.getElementById("figureName").value.trim();
      const groupsStr = document.getElementById("figureGroups").value.trim();
      const groupsArr = groupsStr.split(",").map(s => s.trim());
      const dateOfBirth = document.getElementById("dateOfBirth").value.trim();
      const dateOfDeath = document.getElementById("dateOfDeath").value.trim();
      const nationality = document.getElementById("nationality").value.trim();
      const description = document.getElementById("description").value.trim();
      const imageUrl = document.getElementById("imageUrl").value.trim();

      // Create new historical figure object.
      const newFigure = {
        name: name,
        groups: groupsArr,
        dateOfBirth: dateOfBirth,
        dateOfDeath: dateOfDeath,
        nationality: nationality,
        description: description,
        imageUrl: imageUrl
      };

      // Save to Firestore in the "historicalFigures" collection.
      firebase.firestore().collection("historicalFigures").add(newFigure)
        .then(() => {
          document.getElementById("figureFeedback").innerText = "Historical figure added successfully!";
          figureForm.reset();
          // Optionally, reload the page to update the timeline.
          window.location.reload();
        })
        .catch(error => {
          console.error("Error adding historical figure:", error);
          document.getElementById("figureFeedback").innerText = "Error: " + error.message;
        });
    });
  }
});
