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
  // Global events will be rendered as custom time markers (not assigned to a separate group).

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
  // Declare timeline variable (global)
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
          ? data.groups[0].trim().toLowerCase() : "politics";
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
  // Function: Update Global Events Markers & Their Labels
  // -------------------------------
  function updateGlobalEventsMarkers() {
    firebase.firestore().collection("globalEvents")
      .get()
      .then(snapshot => {
        const events = [];
        snapshot.forEach(doc => {
          const event = doc.data();
          if (event.eventDate && event.eventEndDate && timeline) {
            events.push({ id: doc.id, event: event });
          }
        });
  
        // Define an array of lighter colors for alternating global event markers.
        const markerColors = ["#a8d5e2", "#d5e8a8", "#f2e3a1", "#e2a8d5"];
  
        events.forEach(({ id, event }, index) => {
          const startDate = new Date(event.eventDate);
          const endDate = new Date(event.eventEndDate);
          try { timeline.removeCustomTime(id); } catch(e) { }
          timeline.addCustomTime(startDate, id);
          setTimeout(() => {
            const markers = document.querySelectorAll('#timeline-container .vis-custom-time');
            // Fallback: calculate pixel positions based on the current timeline window.
            const windowRange = timeline.getWindow();
            const startTime = windowRange.start.getTime();
            const endTime = windowRange.end.getTime();
            const currentContainerWidth = container.getBoundingClientRect().width;
            const timeSpan = endTime - startTime;
            const pixelPerMs = currentContainerWidth / timeSpan;
            const startPx = (startDate.getTime() - startTime) * pixelPerMs;
            const endPx = (endDate.getTime() - startTime) * pixelPerMs;
  
            if (markers[index]) {
              const marker = markers[index];
              let computedWidth = endPx - startPx;
              if (computedWidth < 2) { computedWidth = 2; } // Enforce minimum width
  
              // Update marker style based on calculated positions.
              marker.style.left = startPx + "px";
              marker.style.width = computedWidth + "px";
              marker.style.height = "100%";
              // Allow pointer events so that native tooltips can appear.
              marker.style.pointerEvents = "auto";
              // Apply alternating background color.
              marker.style.backgroundColor = markerColors[index % markerColors.length];
              // Add a border for clarity.
              marker.style.border = "1px solid black";
  
              const innerDiv = marker.querySelector('div');
              if (innerDiv) {
                innerDiv.style.width = computedWidth + "px";
                innerDiv.style.left = (-computedWidth / 2) + "px";
              }
  
              // Set marker attributes so that the eventName appears as a tooltip.
              marker.setAttribute('data-label', event.eventName);
              marker.setAttribute('title', event.eventName);
              console.log("Set data-label for marker", id, "to", event.eventName, "with width", computedWidth);
            }
          }, 200);
        });
  
        // After processing markers, update global event labels.
        setTimeout(() => {
          console.log("Global events processed. Calling updateGlobalEventLabels().");
          updateGlobalEventLabels();
        }, 1000);
      })
      .catch(error => {
        console.error("Error loading global events:", error);
      });
  }
  
  // -------------------------------
  // Function: Update Global Event Labels in the Global Events Labels Container
  // -------------------------------
  function updateGlobalEventLabels() {
    console.log("updateGlobalEventLabels() called");
    const containerRect = container.getBoundingClientRect();
    const labelsContainer = document.getElementById('global-events-labels');
    if (!labelsContainer) {
      console.log("No global events labels container found.");
      return;
    }
    console.log("Global events labels container found. Width:", labelsContainer.offsetWidth);
    
    labelsContainer.innerHTML = '';
    
    // Gather marker data.
    const markerElements = document.querySelectorAll('#timeline-container .vis-custom-time');
    console.log("Found " + markerElements.length + " custom time markers.");
    let labelData = [];
    markerElements.forEach(marker => {
      const markerRect = marker.getBoundingClientRect();
      const leftPos = markerRect.left - containerRect.left + markerRect.width / 2;
      const labelText = marker.getAttribute('data-label') || 'Global Event';
      labelData.push({ left: leftPos, text: labelText });
    });
    
    // Sort label data by horizontal position.
    labelData.sort((a, b) => a.left - b.left);
    
    // Settings for stacking labels.
    const rowHeight = 20; // approximate label height (adjust as needed)
    const rowMargin = 5;  // vertical gap between rows
    const baseOffset = 10; // base top offset
    let rows = [];
    let labelsWithRows = [];
    
    // Create a temporary element to measure label widths.
    const tempSpan = document.createElement('span');
    tempSpan.style.visibility = 'hidden';
    tempSpan.style.position = 'absolute';
    tempSpan.style.whiteSpace = 'nowrap';
    tempSpan.style.fontSize = "14px";  // should match .global-event-label font size
    tempSpan.style.padding = "2px 4px";  // should match your label padding
    document.body.appendChild(tempSpan);
    
    labelData.forEach(item => {
      tempSpan.innerText = item.text;
      const labelWidth = tempSpan.offsetWidth;
      let placedRow = 0;
      for (let i = 0; i < rows.length; i++) {
        if (item.left > rows[i] + 5) { // 5px gap
          placedRow = i;
          break;
        }
        if (i === rows.length - 1) {
          placedRow = i + 1;
        }
      }
      const rightPos = item.left + labelWidth;
      if (placedRow < rows.length) {
        rows[placedRow] = rightPos;
      } else {
        rows.push(rightPos);
      }
      labelsWithRows.push({
        left: item.left,
        text: item.text,
        width: labelWidth,
        row: placedRow
      });
    });
    document.body.removeChild(tempSpan);
    
    // Place labels and adjust container height.
    let maxBottom = 0;
    labelsWithRows.forEach(item => {
      const label = document.createElement('div');
      label.className = 'global-event-label';
      label.innerText = item.text;
      label.style.position = 'absolute';
      label.style.left = item.left + 'px';
      const topPos = baseOffset + item.row * (rowHeight + rowMargin);
      label.style.top = topPos + 'px';
      labelsContainer.appendChild(label);
      
      const labelBottom = topPos + rowHeight;
      if (labelBottom > maxBottom) { maxBottom = labelBottom; }
    });
    
    // Dynamically adjust the container's height.
    labelsContainer.style.height = (maxBottom + 10) + "px"; // additional padding if needed
    console.log("Global event labels assigned:", labelsWithRows, "Container height set to:", labelsContainer.style.height);
  }
  
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
            const imageURL = row.imageURL; // Adjust field name as needed.
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
