document.addEventListener('DOMContentLoaded', function() {
  // -------------------------------
  // Helper function: Initialize Flatpickr for date inputs
  // -------------------------------
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
  
  // Initialize date inputs
  initDatePicker("#dateOfBirth");
  initDatePicker("#dateOfDeath");

  // -------------------------------
  // Define main variables & timeline options
  // -------------------------------
  const container = document.getElementById('timeline-container');
  const msPerYear = 31557600000; // 365.25 days/year in milliseconds
  const zoomMin = 201 * msPerYear;
  const containerWidth = container.offsetWidth;
  const zoomMax = (67 * msPerYear * containerWidth) / 96;
  
  const options = {
    orientation: 'top',
    showCurrentTime: false,
    zoomMin: zoomMin,
    zoomMax: zoomMax,
    min: new Date("0001-01-01"),
    max: new Date("2025-12-31"),
    stack: true,
    tooltip: { delay: 100, followMouse: true },
    margin: { item: { horizontal: 0, vertical: 5 } }
  };

  // -------------------------------
  // Define Regions and Groups (by desired order)
  // -------------------------------
  const regions = [
    "North America",
    "South America",
    "Europe",
    "Africa",
    "Middle East",
    "East Asia",
    "Australia"
  ];
  
  // Create one group per region
  const groups = regions.map(region => ({ id: region.toLowerCase(), content: region }));
  // Add an "Unknown" group for items with no region
  groups.push({ id: "unknown", content: "Unknown" });
  // Global events remain as custom time markers – they are not added to a separate group.
  
  // -------------------------------
  // Define Expertise Colors for Historical Figures
  // -------------------------------
  const expertiseColors = {
    "politics & military": "red",
    "science": "blue",
    "economy": "green",
    "arts, musics & cultural": "violet",
    "literature": "yellow",
    "philosophy & religion": "indigo",
    "social & cultural movement": "orange",
    "exploration & discovery": "sienna"
  };

  const expertiseTextColors = {
    "politics & military": "black",
    "science": "white",
    "economy": "white",
    "arts, musics & cultural": "#333333",
    "literature": "black",
    "philosophy & religion": "white",
    "social & cultural movement": "white",
    "exploration & discovery": "yellow"
  };

  // -------------------------------
  // Helper functions: Format Dates and Names
  // -------------------------------
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
  
  // -------------------------------
  // Declare timeline variable (to be used globally)
  // -------------------------------
  let timeline;

  // -------------------------------
  // Retrieve Historical Figures & Build Timeline Items
  // -------------------------------
  firebase.firestore().collection("historicalFigures")
    .get()
    .then(snapshot => {
      const historicalItems = [];
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
  
        let region = "unknown";
        if (data.region && typeof data.region === "string") {
          const normalizedRegion = data.region.trim().toLowerCase();
          if (regions.map(r => r.toLowerCase()).includes(normalizedRegion)) {
            region = normalizedRegion;
          }
        }
        const groupId = region;
  
        const birthYear = startDate.getFullYear();
        const deathYear = endDate.getFullYear();
        const contentHTML = `${formattedName} (${birthYear} - ${deathYear})`;
  
        historicalItems.push({
          id: doc.id,
          group: groupId,
          content: contentHTML,
          start: startDate,
          end: endDate,
          style: "background-color: " + bgColor + "; color: " + textColor + "; padding: 2px 3px;"
        });
      });
  
      console.log("Historical timeline items:", historicalItems);
      // Create the timeline with only historical figures first.
      timeline = new vis.Timeline(container, historicalItems, groups, options);
  
      // -------------------------------
      // Dynamic Group Label Adjustment
      // -------------------------------
      timeline.on('redraw', function () {
        const groupLabels = document.querySelectorAll('.vis-labelset .vis-label');
        const groupsElements = document.querySelectorAll('.vis-group');
        groupLabels.forEach((label, index) => {
          if (groupsElements[index]) {
            const newHeight = groupsElements[index].offsetHeight;
            label.style.height = newHeight + 'px';
            label.style.lineHeight = newHeight + 'px';
          }
        });
      });
  
      // After a delay, process global events as custom time markers.
      setTimeout(() => {
        console.log("Global events: calling updateGlobalEventsMarkers()");
        updateGlobalEventsMarkers();
        timeline.on('rangechanged', updateGlobalEventsMarkers);
      }, 1000);
  
    })
    .catch(error => {
      console.error("Error loading historical figures:", error);
    });
  
  // -------------------------------
  // Retrieve Global Events & Update Their Custom Time Markers
  // -------------------------------
// -------------------------------
// Retrieve Global Events & Update Their Custom Time Markers
// -------------------------------
firebase.firestore().collection("globalEvents")
  .get()
  .then(snapshot => {
    const events = [];
    snapshot.forEach(doc => {
      const event = doc.data();
      // Ensure both eventDate and eventEndDate are available.
      if (event.eventDate && event.eventEndDate && timeline) {
        events.push({ id: doc.id, event: event });
      }
    });

    events.forEach(({ id, event }, index) => {
      const startDate = new Date(event.eventDate);
      const endDate = new Date(event.eventEndDate);
      // Add a custom time marker at the start date
      timeline.addCustomTime(startDate, id);
      setTimeout(() => {
        // Retrieve all custom time markers – assuming the order is preserved
        const markers = document.querySelectorAll('#timeline-container .vis-custom-time');
        if (markers[index]) {
          const marker = markers[index];
          // Compute pixel positions for start and end dates using the timeline API.
          const startPx = timeline.getPixelFromTime(startDate);
          const endPx = timeline.getPixelFromTime(endDate);
          let computedWidth = endPx - startPx;
          // Enforce a minimum width of 5px.
          if (computedWidth < 5) {
            computedWidth = 5;
          }
          // Update the marker style to represent the duration.
          marker.style.left = startPx + "px";
          marker.style.width = computedWidth + "px";
          marker.style.height = "100%";  // Ensure it spans full height
          // Set the marker's data-label attribute to the event name.
          marker.setAttribute('data-label', event.eventName);
          console.log("Set data-label for marker", id, "to", event.eventName, "with width", computedWidth);
        }
      }, 200);
    });

    // After processing global events, update any separate label container (if used)
    setTimeout(() => {
      console.log("Global events processed. Calling updateGlobalEventLabels().");
      updateGlobalEventLabels();
    }, 1000);
  })
  .catch(error => {
    console.error("Error loading global events:", error);
  });

  // -------------------------------
  // Authentication-Dependent UI Elements
  // -------------------------------
  firebase.auth().onAuthStateChanged(user => {
    const figureFormSection = document.getElementById('figure-form-section');
    if (figureFormSection) figureFormSection.classList.toggle('hidden', !user);
  
    const csvImportSection = document.getElementById('csv-import-section');
    if (csvImportSection) csvImportSection.classList.toggle('hidden', !user);
  });
  
  // -------------------------------
  // Event Listener: Add New Historical Figure Form Submission
  // -------------------------------
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
  
  // -------------------------------
  // CSV Import Functionality
  // -------------------------------
  document.getElementById("csvImportForm").addEventListener("submit", function(e) {
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
            const imageURL = row.imageURL;
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
