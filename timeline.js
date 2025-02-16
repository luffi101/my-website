document.addEventListener('DOMContentLoaded', function() {
  // Helper function to initialize Flatpickr for date inputs
  function initDatePicker(selector) {
    flatpickr(selector, {
      dateFormat: "Y-m-d",
      minDate: "0001-01-01",
      maxDate: "2025-12-31",
      altInput: true,
      altFormat: "F j, Y",
      allowInput: true
    });
  }
  
  // Initialize both date inputs
  initDatePicker("#dateOfBirth");
  initDatePicker("#dateOfDeath");

  const container = document.getElementById('timeline-container');
  const msPerYear = 31557600000; // 365.25 days/year in milliseconds
  
  // Zoom limits based on a reference lifespan:
  const zoomMin = 201 * msPerYear; // Minimum visible span = 201 years
  const containerWidth = container.offsetWidth;
  const zoomMax = (67 * msPerYear * containerWidth) / 96; // Ensure 67-year block is at least ~96px wide
  
  // Timeline options with stacking enabled and minimum group height.
  const options = {
    orientation: 'top',
    showCurrentTime: false,
    zoomMin: zoomMin,
    zoomMax: zoomMax,
    min: new Date("0001-01-01"),
    max: new Date("2025-12-31"),
    stack: true,
    groupOrder: 'content',
    groupMinHeight: 60, 
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
  
  // Create groups: one group per region.
  const groups = [];
  regions.forEach(region => {
    groups.push({ id: region.toLowerCase(), content: region });
  });
  groups.push({ id: "unknown", content: "Unknown" });
  
  // Map expertise categories to background colors.
  const expertiseColors = {
    "politics": "red",
    "science": "blue",
    "economy": "green",
    "arts & culture": "violet",
    "literature": "yellow",
    "philosophy & religion": "indigo",
    "social & cultural movement": "orange"
  };
  
  // Map expertise categories to text colors.
  const expertiseTextColors = {
    "politics": "black",
    "science": "white",
    "economy": "white",
    "arts & culture": "#333333",
    "literature": "black",
    "philosophy & religion": "white",
    "social & cultural movement": "white"
  };
  
  // Helper functions for formatting dates and names.
  function formatDate(dateStr) {
    if (dateStr && dateStr.length === 4) {
      dateStr += "-01-01";
    }
    return dateStr ? new Date(dateStr) : null;
  }
  
  function formatName(name) {
    if (name && name.includes(",")) {
      const parts = name.split(",");
      if (parts.length >= 2) {
        return parts[1].trim() + " " + parts[0].trim();
      }
    }
    return name;
  }
  
  // Retrieve historical figures from Firestore.
  firebase.firestore().collection("historicalFigures")
    .get()
    .then(snapshot => {
      const items = [];
      snapshot.forEach(doc => {
        const data = doc.data();
  
        const startDate = formatDate(data.dateOfBirth);
        const endDate = formatDate(data.dateOfDeath);
        if (!startDate || !endDate) {
          console.warn(`Skipping ${data.name} due to missing or invalid dates.`);
          return;
        }
  
        const expertiseCategory = (data.groups && data.groups.length > 0)
          ? data.groups[0].trim().toLowerCase()
          : "politics";
        const bgColor = expertiseColors[expertiseCategory] || "gray";
        const textColor = expertiseTextColors[expertiseCategory] || "white";
  
        const formattedName = formatName(data.name);
  
        // Determine region (default "unknown") from the "region" field.
        let region = "unknown";
        if (data.region && typeof data.region === "string") {
          const normalizedRegion = data.region.trim().toLowerCase();
          if (regions.map(r => r.toLowerCase()).includes(normalizedRegion)) {
            region = normalizedRegion;
          }
        }
        // Since we now have one row per region, groupId is just the normalized region.
        const groupId = region;
  
        const birthYear = startDate.getFullYear();
        const deathYear = endDate.getFullYear();
  
        // Build content HTML:
        // The container reserves bottom padding for a footer.
        // The name is centered; birth year appears at bottom left and death year at bottom right.
        const contentHTML = `
          <div class="figure-content" style="position: relative; width: 100%; height: 100%; padding-bottom: 10px;">
            <div class="name-container" style="position: absolute; top: 50%; left: 0; right: 0; transform: translateY(-50%); text-align: center;">
              <span class="figure-name" style="font-size: 1em; margin: 0;">${formattedName}</span>
            </div>
            <span class="birth-year" style="position: absolute; bottom: 0; left: 0; font-size: 0.7em; opacity: 0.8;">${birthYear}</span>
            <span class="death-year" style="position: absolute; bottom: 0; right: 0; font-size: 0.7em; opacity: 0.8;">${deathYear}</span>
          </div>`;
  
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
      figureFormSection.classList.toggle('hidden', !user);
    }
  });
  
  // Event listener for the "Add Historical Figure" form.
  const figureForm = document.getElementById("figureForm");
  if (figureForm) {
    figureForm.addEventListener("submit", (e) => {
      e.preventDefault();
  
      const name = document.getElementById("figureName").value.trim();
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
