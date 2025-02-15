document.addEventListener('DOMContentLoaded', function() {
  // Initialize Flatpickr for date inputs
  flatpickr("#dateOfBirth", {
    dateFormat: "Y-m-d",
    minDate: "0001-01-01",
    maxDate: "2025-12-31",
    altInput: true,
    altFormat: "F j, Y",
    allowInput: true
  });

  flatpickr("#dateOfDeath", {
    dateFormat: "Y-m-d",
    minDate: "0001-01-01",
    maxDate: "2025-12-31",
    altInput: true,
    altFormat: "F j, Y",
    allowInput: true
  });
    
  const container = document.getElementById('timeline-container');
  const msPerYear = 31557600000; // 365.25 days/year in milliseconds
  
  // Zoom limits based on George Washington’s 67-year lifespan:
  const zoomMin = 201 * msPerYear; // Minimum visible span = 201 years
  const containerWidth = container.offsetWidth;
  const zoomMax = (67 * msPerYear * containerWidth) / 96; // Ensure 67-year block is at least ~96px wide
  
  const options = {
    orientation: 'top',
    showCurrentTime: false,
    zoomMin: zoomMin,
    zoomMax: zoomMax,
    min: new Date("0001-01-01"),
    max: new Date("2025-12-31"),
    stack: false,
    groupOrder: 'content',
    tooltip: { delay: 100, followMouse: true },
    margin: { item: { horizontal: 0, vertical: 5 } }
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
  
  // Create groups: each region gets 2 rows; for the first row, show the label, for the second row, use an empty label.
  const groups = [];
  regions.forEach(region => {
    groups.push({ id: region.toLowerCase() + " - 1", content: region });
    groups.push({ id: region.toLowerCase() + " - 2", content: "" });
  });
  groups.push({ id: "unknown - 1", content: "Unknown" });
  groups.push({ id: "unknown - 2", content: "" });
  
  // Set up counters to alternate rows for each region.
  const regionCounters = {};
  regions.forEach(region => {
    regionCounters[region.toLowerCase()] = 0;
  });
  regionCounters["unknown"] = 0;
  
  // Map expertise categories (from the "groups" field) to background colors.
  const expertiseColors = {
    "politics": "red",             // Bright red for Politics.
    "science": "blue",             // Blue for Science.
    "economy": "green",            // Green for Economy.
    "arts & culture": "violet",    // Violet for Arts & Culture.
    "literature": "yellow",        // Yellow for Literature.
    "philosophy & religion": "indigo", // Indigo for Philosophy & Religion.
    "social & cultural movement": "orange" // Orange for Social & Cultural Movement.
  };
  
  // Map expertise categories to text colors for good contrast.
  const expertiseTextColors = {
    "politics": "black",
    "science": "white",
    "economy": "white",
    "arts & culture": "#333333",
    "literature": "black",
    "philosophy & religion": "white",
    "social & cultural movement": "white"
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
        const startDate = birthDateStr ? new Date(birthDateStr) : null;
        const endDate = deathDateStr ? new Date(deathDateStr) : null;
        if (!startDate || !endDate) {
          console.warn(`Skipping ${data.name} due to missing or invalid dates.`);
          return;
        }
  
        // Determine primary expertise category from data.groups (default "politics")
        const expertiseCategory = (data.groups && data.groups.length > 0) 
          ? data.groups[0].trim().toLowerCase() 
          : "politics";
        const bgColor = expertiseColors[expertiseCategory] || "gray";
        const textColor = expertiseTextColors[expertiseCategory] || "white";
  
        // Process name: convert "Lastname, Firstname" to "Firstname Lastname"
        let formattedName = data.name;
        if (formattedName && formattedName.includes(",")) {
          const parts = formattedName.split(",");
          if (parts.length >= 2) {
            formattedName = parts[1].trim() + " " + parts[0].trim();
          }
        }
  
        // Determine region (default "unknown") from the "region" field.
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
  
        // Extract birth and death years.
        const birthYear = startDate.getFullYear();
        const deathYear = endDate.getFullYear();
  
        // Build content HTML with centered name and years at the bottom corners.
        const contentHTML = `
          <div class="figure-content" style="position: relative; width: 100%; height: 100%; padding-bottom: 10px;">
            <div class="name-container" style="position: absolute; top: 50%; left: 0; right: 0; transform: translateY(-50%); text-align: center;">
              <span class="figure-name" style="font-size: 1em; margin: 0;">${formattedName}</span>
            </div>
            <span class="birth-year" style="position: absolute; bottom: 0; left: 0; font-size: 0.7em; opacity: 0.8;">${birthYear}</span>
            <span class="death-year" style="position: absolute; bottom: 0; right: 0; font-size: 0.7em; opacity: 0.8;">${deathYear}</span>
          </div>`;
  
        // Create the timeline item.
        items.push({
          id: doc.id,
          group: groupId,
          content: contentHTML,
          start: startDate,
          end: endDate,
          style: "background-color: " + bgColor + "; color: " + textColor + "; padding: 1px 2px; height: 40px; min-height: 0;"
        });
      });
  
      console.log("Timeline items:", items);
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
  
  // Event listener for the "Add Historical Figure" form.
  const figureForm = document.getElementById("figureForm");
  if (figureForm) {
    figureForm.addEventListener("submit", (e) => {
      e.preventDefault();
  
      const name = document.getElementById("figureName").value.trim();
      // Gather checkbox values for categories.
      const categoryCheckboxes = document.querySelectorAll('input[name="figureCategory"]:checked');
      const groupsArr = Array.from(categoryCheckboxes).map(cb => cb.value);
  
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
