// timeline.js

document.addEventListener('DOMContentLoaded', function() {
  const container = document.getElementById('timeline-container');

  // Milliseconds per year (using 365.25 days/year)
  const msPerYear = 31557600000;

  // Desired zoom limits using George Washington’s block (67 years lifespan)
  // Zoom In: minimum visible span = 201 years (to keep block at ~1/3 of width)
  const zoomMin = 201 * msPerYear;
  // Zoom Out: Calculate based on ensuring a 67-year span is at least ~1 inch (~96px) wide.
  const containerWidth = container.offsetWidth;
  const zoomMax = (67 * msPerYear * containerWidth) / 96;

  const options = {
    orientation: 'top',           // Place labels above blocks
    showCurrentTime: false,
    zoomMin: zoomMin,             // Minimum visible span (~201 years)
    zoomMax: zoomMax,             // Maximum visible span (calculated dynamically)
    // Timeline bounds: from year 1 to 2025.
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
  // For this example, groups are defined by name.
  const groups = [
    { id: "Politics", content: "Politics" },
    { id: "Science", content: "Science" },
    { id: "Economy", content: "Economy" }
  ];

  // Load historical figures from Firestore.
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

           // Convert to Date objects. If not provided, skip this item.
           const startDate = birthDateStr ? new Date(birthDateStr) : null;
           const endDate = deathDateStr ? new Date(deathDateStr) : null;
           if (!startDate || !endDate) {
             console.warn(`Skipping ${data.name} due to missing dates.`);
             return;
           }

           // For group, use the first element from the groups array; if missing, default to "Politics"
           const primaryGroup = (data.groups && data.groups.length > 0) ? data.groups[0] : "Politics";

           // Build content HTML. Here we display the name at the top.
           // You can expand this content to include nationality, description, or even an image.
           let contentHTML = `<div class="figure-content">
                                  <h3>${data.name}</h3>`;
           if (data.nationality) {
             contentHTML += `<p><em>${data.nationality}</em></p>`;
           }
           if (data.description) {
             contentHTML += `<p>${data.description}</p>`;
           }
           if (data.imageUrl) {
             contentHTML += `<img src="${data.imageUrl}" alt="${data.name}" style="max-width:100px;">`;
           }
           contentHTML += `</div>`;

           items.push({
             id: doc.id,
             group: primaryGroup,  // This should match one of the group ids defined above.
             content: contentHTML,
             start: startDate,
             end: endDate
           });
       });

       // Initialize the timeline with the fetched items.
       const timeline = new vis.Timeline(container, items, groups, options);
    })
    .catch(error => {
       console.error("Error loading historical figures:", error);
    });
});
