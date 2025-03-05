document.addEventListener('DOMContentLoaded', function() {
  // -------------------------------
  // Helper: Initialize Flatpickr for date inputs
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
  
  initDatePicker("#dateOfBirth");
  initDatePicker("#dateOfDeath");

  // -------------------------------
  // Main Variables & Timeline Options
  // -------------------------------
  const container = document.getElementById('timeline-container');
  const msPerYear = 31557600000;
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
  // Define Regions and Groups
  // -------------------------------
  const regions = [
    "North America", "South America", "Europe",
    "Africa", "Middle East", "East Asia", "Australia"
  ];
  
  // Create one group per region
  const groups = regions.map(region => ({ id: region.toLowerCase(), content: region }));
  groups.push({ id: "unknown", content: "Unknown" });
  // Dedicated group for global events:
  groups.push({ id: "global-events", content: "Global Events" });
  
  // -------------------------------
  // Expertise Colors for Historical Figures
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
  // Helper: Format Dates and Names
  // -------------------------------
  function formatDate(dateStr) {
    if (dateStr && dateStr.length === 4) { dateStr += "-01-01"; }
    return dateStr ? new Date(dateStr) : null;
  }
  
  function formatName(name) {
    if (name && name.includes(",")) {
      const parts = name.split(",");
      if (parts.length >= 2) { return parts[1].trim() + " " + parts[0].trim(); }
    }
    return name;
  }
  
  // -------------------------------
  // Data Loading using Promise.all
  // -------------------------------
  let timeline;
  const allItems = [];
  
  const historicalPromise = firebase.firestore().collection("historicalFigures").get();
  const globalEventsPromise = firebase.firestore().collection("globalEvents").get();
  
  Promise.all([historicalPromise, globalEventsPromise])
    .then(([historicalSnapshot, globalSnapshot]) => {
      // Process Historical Figures
      historicalSnapshot.forEach(doc => {
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
          const normalized = data.region.trim().toLowerCase();
          if (regions.map(r => r.toLowerCase()).includes(normalized)) {
            region = normalized;
          }
        }
  
        const birthYear = startDate.getFullYear();
        const deathYear = endDate.getFullYear();
        const contentHTML = `${formattedName} (${birthYear} - ${deathYear})`;
  
        allItems.push({
          id: doc.id,
          group: region,
          content: contentHTML,
          start: startDate,
          end: endDate,
          style: "background-color: " + bgColor + "; color: " + textColor + "; padding: 2px 3px;"
        });
      });
      
      // Process Global Events
      globalSnapshot.forEach(doc => {
        const event = doc.data();
        if (event.eventDate && event.eventEndDate) {
          const startDate = new Date(event.eventDate);
          const endDate = new Date(event.eventEndDate);
          const duration = endDate.getTime() - startDate.getTime();
          let styleStr = "background-color: orange; color: black; padding: 2px 3px;";
          // Enforce a minimum width if duration is less than one year.
          if (duration < msPerYear) {
            styleStr += " min-width: 5px;";
          }
          allItems.push({
            id: doc.id,
            group: "global-events",
            content: event.eventName,
            start: startDate,
            end: endDate,
            style: styleStr
          });
          console.log("Added global event item for", event.eventName);
        }
      });
      
      console.log("Combined timeline items:", allItems);
      timeline = new vis.Timeline(container, allItems, groups, options);
      
      // -------------------------------
      // Dynamic Group Label Adjustment
      // -------------------------------
      timeline.on('redraw', function() {
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
      
      // (Optional) If you still want a separate container for global event labels,
      // you can update that container here by iterating over the global events items.
      // For example:
      updateGlobalEventLabels();
      timeline.on('rangechanged', updateGlobalEventLabels);
    })
    .catch(error => {
      console.error("Error loading data:", error);
    });
  
  // -------------------------------
  // (Optional) Function: Update Global Event Labels in a Separate Container
  // -------------------------------
  function updateGlobalEventLabels() {
    // If you want to update a separate container with labels based on the global events items,
    // you can use timeline.getPixelFromTime() to compute positions.
    // For example, if your global events items are in the "global-events" group:
    const labelsContainer = document.getElementById('global-events-labels');
    if (!labelsContainer) return;
    labelsContainer.innerHTML = '';
    
    // Filter items in group "global-events"
    const globalItems = allItems.filter(item => item.group === "global-events");
    globalItems.forEach(item => {
      // Compute the midpoint between start and end:
      const midTime = new Date((item.start.getTime() + item.end.getTime()) / 2);
      // Use timeline API to convert time to pixel position:
      const leftPos = timeline.getPixelFromTime(midTime);
      
      const label = document.createElement('div');
      label.className = 'global-event-label';
      label.innerText = item.content;
      label.style.left = leftPos + 'px';
      label.style.top = '10px';  // adjust as needed
      labelsContainer.appendChild(label);
    });
    console.log("Updated global event labels for", globalItems.length, "items.");
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
