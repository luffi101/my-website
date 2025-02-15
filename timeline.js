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

  // Set a fixed minimum group height for styling purposes
  const options = {
    orientation: 'top',
    showCurrentTime: false,
    zoomMin: zoomMin,
    zoomMax: zoomMax,
    min: new Date("0001-01-01"),
    max: new Date("2025-12-31"),
    stack: true,
    groupOrder: 'content',
    groupMinHeight: 60, // Ensure each group has at least 60px height
    tooltip: { delay: 100, followMouse: true },
    margin: { item: { horizontal: 0, vertical: 5 } }
  };

  // Custom group template: for rows ending with " - 2", we output a placeholder to hide the label.
  options.groupTemplate = function (group) {
    if (group.id.endsWith(" - 2")) {
      const span = document.createElement('span');
      span.innerHTML = '&nbsp;'; // non-breaking space so the row isn't collapsed
      span.className = 'vis-group-label-hidden';
      return span;
    }
    return group.content;
  };

  // Define regions.
  const regions = [
    "North America",
    "South America",
    "Europe",
    "Africa",
    "Middle East",
    "East Asia",
    "Australia"
  ];

  // Create groups: each region gets 2 rows.
  const groups = [];
  regions.forEach(region => {
    groups.push({ id: region.toLowerCase() + " - 1", content: region });
    groups.push({ id: region.toLowerCase() + " - 2", content: region });
  });
  groups.push({ id: "unknown - 1", content: "Unknown" });
  groups.push({ id: "unknown - 2", content: "Unknown" });

  // Set up counters to alternate rows for each region.
  const regionCounters = {};
  regions.forEach(region => {
    regionCounters[region.toLowerCase()] = 0;
  });
  regionCounters["unknown"] = 0;

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

  // Helper functions for formatting dates and names
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

        // Determine region (default "unknown").
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

        const birthYear = startDate.getFullYear();
        const deathYear = endDate.getFullYear();

        // Build content HTML (layout is controlled via CSS).
        const contentHTML = `
          <div class="figure-content">
            <div class="name-container">
              <span class="figure-name">${formattedName}</span>
            </div>
            <span class="birth-year">${birthYear}</span>
            <span class="death-year">${deathYear}</span>
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
