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

           // Process dateOfBirth: if only a year is provided, append "-01-01".
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

           // Process name to convert "Lastname, Firstname" to "Firstname Lastname"
           let formattedName = data.name;
           if (formattedName && formattedName.includes(",")) {
             const parts = formattedName.split(",");
             if (parts.length >= 2) {
               formattedName = parts[1].trim() + " " + parts[0].trim();
             }
           }

           // For groups, use the first element in the groups array (if available); default to "Politics".
           const primaryGroup = (data.groups && data.groups.length > 0) ? data.groups[0] : "Politics";

           // Build content HTML.
           let contentHTML = `<div class="figure-content">
                                  <h3>${formattedName}</h3>`;
           if (data.nationality) {
             contentHTML += `<p><em>${data.nationality}</em></p>`;
           }
           if (data.description) {
             contentHTML += `<p>${data.description}</p>`;
           }
           if (data.imageUrl) {
             contentHTML += `<img src="${data.imageUrl}" alt="${formattedName}" style="max-width:100px;">`;
           }
           contentHTML += `</div>`;

           items.push({
             id: doc.id,
             group: primaryGroup,  // Must match one of the group IDs defined above.
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
});
