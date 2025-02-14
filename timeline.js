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
    // Timeline bounds from year 1 to 2025
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

  // Define the 7 geographical regions.
  const regions = [
    "North America",
    "South America",
    "Europe",
    "Africa",
    "Middle East",
    "East Asia",
    "Australia"
  ];

  // Create groups: each region gets two rows.
  const groups = [];
  regions.forEach(region => {
    groups.push({ id: region.toLowerCase() + " - 1", content: region + " (Row 1)" });
    groups.push({ id: region.toLowerCase() + " - 2", content: region + " (Row 2)" });
  });
  // Fallback groups for unknown region.
  groups.push({ id: "unknown - 1", content: "Unknown (Row 1)" });
  groups.push({ id: "unknown - 2", content: "Unknown (Row 2)" });

  // Set up counters to alternate rows for each region.
  const regionCounters = {};
  regions.forEach(region => {
    regionCounters[region.toLowerCase()] = 0;
  });
  regionCounters["unknown"] = 0;

  // Map expertise categories (the "groups" field in the document) to colors.
  // These colors represent the figure's field of expertise.
  const expertiseColors = {
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

           // Determine the region from the document (default to "unknown").
           let region = "unknown";
           if (data.region && typeof data.region === "string") {
             let normalizedRegion = data.region.trim().toLowerCase();
             if (regions.map(r => r.toLowerCase()).includes(normalizedRegion)) {
               region = normalizedRegion;
             }
           }

           // Alternate row assignment for the region.
           const counter = regionCounters[region] || 0;
           const rowNumber = (counter % 2 === 0) ? " - 1" : " - 2";
           regionCounters[region] = counter + 1;
           const groupId = region + rowNumber;

           // Determine the expertise category from data.groups.
           // Use the first expertise in the array (if available); default to "politics".
           let expertiseCategory = "politics";
           if (data.groups && Array.isArray(data.groups) && data.groups.length > 0) {
             expertiseCategory = data.groups[0].trim().toLowerCase();
           }

           // Get the background color based on the expertise category.
           const bgColor = expertiseColors[expertiseCategory] || "gray";

           // Process name: convert "Lastname, Firstname" to "Firstname Lastname".
           let formattedName = data.name;
           if (formattedName && formattedName.includes(",")) {
             const parts = formattedName.split(",");
             if (parts.length >= 2) {
               formattedName = parts[1].trim() + " " + parts[0].trim();
             }
           }

           // Build content HTML: display only the formatted name.
           let contentHTML = `<div class="figure-content" style="background-color: ${bgColor}; padding: 5px; color: white;">
                                  <h3>${formattedName}</h3>
                                </div>`;

           items.push({
             id: doc.id,
             group: groupId,  // Based on region and alternating row.
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

  // Add event listener for the "Add Historical Figure" form.
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
      const region = document.getElementById("figureRegion").value.trim();
      
      const newFigure = {
        name: name,
        groups: groupsArr,
        dateOfBirth: dateOfBirth,
        dateOfDeath: dateOfDeath,
        nationality: nationality,
        description: description,
        imageUrl: imageUrl,
        region: region
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
