// timeline.js

document.addEventListener('DOMContentLoaded', function() {
  const container = document.getElementById('timeline-container');

  // Milliseconds per year (using 365.25 days/year)
  const msPerYear = 31557600000;

  // Desired zoom limits using George Washington’s 67-year lifespan as reference:
  // Zoom In: minimum visible span = 201 years (so his block occupies ~1/3 of the container width)
  const zoomMin = 201 * msPerYear;
  
  // Zoom Out: ensure his block remains at least ~1 inch (≈96px) wide.
  const containerWidth = container.offsetWidth;
  const zoomMax = (67 * msPerYear * containerWidth) / 96;

  const options = {
    orientation: 'top',           // Place labels above blocks
    showCurrentTime: false,
    zoomMin: zoomMin,             // Minimum visible time span (~201 years)
    zoomMax: zoomMax,             // Maximum visible time span (calculated dynamically)
    // Set timeline bounds (from year 1 to 2025)
    min: new Date("0001-01-01"),
    max: new Date("2025-12-31"),
    stack: false,
    groupOrder: 'content',        // Order groups by name
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
    { id: "politics", content: "Politics" },
    { id: "science", content: "Science" },
    { id: "economy", content: "Economy" },
    { id: "arts & culture", content: "Arts & Culture" },
    { id: "literature", content: "Literature" },
    { id: "philosophy & religion", content: "Philosophy & Religion" },
    { id: "social & cultural movement", content: "Social & Cultural Movement" }
  ];

  // Map each category to a color (keys in lowercase)
  const groupColors = {
    "politics": "red",
    "science": "blue",
    "economy": "green",
    "arts & culture": "violet",
    "literature": "yellow",
    "philosophy & religion": "indigo",
    "social & cultural movement": "orange"
  };

  // Retrieve historical figures from Firestore.
  firebase.firestore().collection("historicalFigures")
    .get()
    .then(snapshot => {
       const items = [];
       snapshot.forEach(doc => {
           const data = doc.data();

           // Process dateOfBirth: if only a year is provided, append "-01-01"
           let birthDateStr = data.dateOfBirth;
           if (birthDateStr && birthDateStr.length === 4) {
             birthDateStr += "-01-01";
           }
           let deathDateStr = data.dateOfDeath;
           if (deathDateStr && deathDateStr.length === 4) {
             deathDateStr += "-01-01";
           }

           // Convert to Date objects.
           const startDate = birthDateStr ? new Date(birthDateStr) : null;
           const endDate = deathDateStr ? new Date(deathDateStr) : null;
           if (!startDate || !endDate) {
             console.warn(`Skipping ${data.name} due to missing or invalid dates.`);
             return;
           }

           // Use the first element from data.groups as the primary group (default to "politics")
           const primaryGroup = (data.groups && data.groups.length > 0) ? data.groups[0].toLowerCase() : "politics";
           
           // Get the color for the primary group.
           const bgColor = groupColors[primaryGroup] || "gray";

           // Process name: convert "Lastname, Firstname" to "Firstname Lastname".
           let formattedName = data.name;
           if (formattedName && formattedName.includes(",")) {
             const parts = formattedName.split(",");
             if (parts.length >= 2) {
               formattedName = parts[1].trim() + " " + parts[0].trim();
             }
           }

           // Build content HTML: display only the name in a div with the background color.
           let contentHTML = `<div class="figure-content" style="background-color: ${bgColor} !important; padding: 5px; color: white;">
                                  <h3>${formattedName}</h3>
                                </div>`;

           items.push({
             id: doc.id,
             group: primaryGroup,  // Must match one of the lower-case group IDs defined above.
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
      
      const name = document.getElementById("figureName").value.trim();
      const groupsStr = document.getElementById("figureGroups").value.trim();
      const groupsArr = groupsStr.split(",").map(s => s.trim());
      const dateOfBirth = document.getElementById("dateOfBirth").value.trim();
      const dateOfDeath = document.getElementById("dateOfDeath").value.trim();
      const nationality = document.getElementById("nationality").value.trim();
      const description = document.getElementById("description").value.trim();
      const imageUrl = document.getElementById("imageUrl").value.trim();

      const newFigure = {
        name: name,
        groups: groupsArr,
        dateOfBirth: dateOfBirth,
        dateOfDeath: dateOfDeath,
        nationality: nationality,
        description: description,
        imageUrl: imageUrl
      };

      firebase.firestore().collection("historicalFigures").add(newFigure)
        .then(() => {
          document.getElementById("figureFeedback").innerText = "Historical figure added successfully!";
          figureForm.reset();
          window.location.reload();
        })
        .catch(error => {
          console.error("Error adding historical figure:", error);
          document.getElementById("figureFeedback").innerText = "Error: " + error.message;
        });
    });
  }
});
