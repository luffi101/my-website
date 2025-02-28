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
  
  // Initialize date inputs
  initDatePicker("#dateOfBirth");
  initDatePicker("#dateOfDeath");

  const container = document.getElementById('timeline-container');
  const msPerYear = 31557600000; // 365.25 days/year in milliseconds

  // Calculate zoom limits
  const zoomMin = 201 * msPerYear; // Minimum visible span = 201 years
  const containerWidth = container.offsetWidth;
  const zoomMax = (67 * msPerYear * containerWidth) / 96; // Ensure 67-year block is at least ~96px wide
  
  // Timeline options
  const options = {
    orientation: 'top',
    showCurrentTime: false,
    zoomMin: zoomMin,
    zoomMax: zoomMax,
    min: new Date("0001-01-01"),
    max: new Date("2025-12-31"),
    stack: true,
    // Remove unsupported options if necessary:
    // groupOrder: 'content',
    tooltip: { delay: 100, followMouse: true },
    margin: { item: { horizontal: 0, vertical: 5 } }
  };

  // Define regions (in desired order)
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
  const groups = regions.map(region => {
    return { id: region.toLowerCase(), content: region };
  });
  // Add an "Unknown" group
  groups.push({ id: "unknown", content: "Unknown" });

  // Expertise colors and text colors for historical figures
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

  // Helper functions to format dates and names.
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
  
  // Declare timeline in outer scope.
  let timeline;

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
  
        // Determine region (default "unknown")
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
  
        // Build content HTML (simple text format)
        const contentHTML = `${formattedName} (${birthYear} - ${deathYear})`;
  
        items.push({
          id: doc.id,
          group: groupId,
          content: contentHTML,
          start: startDate,
          end: endDate,
          style: "background-color: " + bgColor + "; color: " + textColor + "; padding: 2px 3px;"
        });
      });
  
      console.log("Timeline items:", items);
      timeline = new vis.Timeline(container, items, groups, options);
  
      // Adjust group label heights dynamically on timeline redraw.
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
  
      console.log("Timeline created. Calling updateGlobalEventLabels() directly.");
      updateGlobalEventLabels(); 

      function updateBottomTimeAxis() {
        console.log("Updating bottom time axis...");
        // Get current timeline window.
        const windowRange = timeline.getWindow();
        const start = windowRange.start;
        const end = windowRange.end;
        console.log("Timeline window:", start, end);
      
        const timelineRect = container.getBoundingClientRect();
        const timelineWidth = timelineRect.width;
        console.log("Timeline width:", timelineWidth);
      
        // Get bottom axis container.
        const bottomAxisContainer = document.getElementById('bottom-time-axis');
        if (!bottomAxisContainer) return;
        bottomAxisContainer.innerHTML = ''; // Clear previous labels
      
        // Determine range in years.
        const startYear = start.getFullYear();
        const endYear = end.getFullYear();
      
        // Decide on an interval: every 10 years if range > 50, else every year.
        const interval = (endYear - startYear) > 50 ? 10 : 1;
      
        for (let year = startYear; year <= endYear; year += interval) {
          const labelDate = new Date(year, 0, 1);
          // Only add labels within the window:
          if (labelDate < start || labelDate > end) continue;
      
          // Calculate left offset proportionally.
          const leftOffset = ((labelDate.getTime() - start.getTime()) / (end.getTime() - start.getTime())) * timelineWidth;
          
          const labelElem = document.createElement('div');
          labelElem.className = 'bottom-axis-label';
          labelElem.innerText = year;
          labelElem.style.left = leftOffset + 'px';
          labelElem.style.top = '0px'; // You can adjust this if needed
      
          // Ensure each label is displayed as a block (redundant for div, but explicit):
          labelElem.style.display = 'block';
      
          bottomAxisContainer.appendChild(labelElem);
        }
      }
      
  
      // Call updateBottomTimeAxis once after timeline creation.
      updateBottomTimeAxis();
  
      // Attach updateBottomTimeAxis to timeline range changes (if desired)
      timeline.on('rangechanged', updateBottomTimeAxis);
  
    })
    .catch(error => {
      console.error("Error loading historical figures:", error);
    });
  
  // Define the function to update global event labels.
  function updateGlobalEventLabels() {
    console.log("updateGlobalEventLabels() called");
    const containerRect = container.getBoundingClientRect();
    const labelsContainer = document.getElementById('global-events-labels');
    if (!labelsContainer) {
      console.log("No global events labels container found.");
      return;
    }
    
    // Clear existing labels.
    labelsContainer.innerHTML = '';
    
    // Select all custom time marker elements.
    const markerElements = document.querySelectorAll('#timeline-container .vis-custom-time');
    console.log("Found " + markerElements.length + " custom time markers.");
    
    markerElements.forEach(marker => {
      const markerRect = marker.getBoundingClientRect();
      const leftPos = markerRect.left - containerRect.left + markerRect.width / 2;
      const labelText = marker.getAttribute('data-label') || 'Global Event';
    
      const label = document.createElement('div');
      label.className = 'global-event-label';
      label.innerText = labelText;
      label.style.left = leftPos + 'px';
      label.style.top = '0px';
      labelsContainer.appendChild(label);
    });
  }  



  // Show/hide the "Add Historical Figure" form and CSV import form based on authentication.
  firebase.auth().onAuthStateChanged(user => {
    const figureFormSection = document.getElementById('figure-form-section');
    if (figureFormSection) {
      figureFormSection.classList.toggle('hidden', !user);
    }
  
    const csvImportSection = document.getElementById('csv-import-section');
    if (csvImportSection) {
      csvImportSection.classList.toggle('hidden', !user);
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
  
  // Retrieve global events from Firestore and add custom time markers.
  firebase.firestore().collection("globalEvents")
    .get()
    .then(snapshot => {
      snapshot.forEach(doc => {
        const event = doc.data();
        if (event.eventDate && timeline) {
          const eventDate = new Date(event.eventDate);
          timeline.addCustomTime(eventDate, doc.id);
  
          // Delay slightly to ensure the marker is rendered.
          setTimeout(() => {
            const markerElement = document.querySelector(`#timeline-container .vis-custom-time[data-id="${doc.id}"]`);
            if (markerElement) {
              markerElement.setAttribute('data-label', event.eventName);
            }
          }, 200);
        }
      });
    })
    .catch(error => {
      console.error("Error loading global events:", error);
    });
  
  // CSV Import Functionality
  document.getElementById("csvImportForm").addEventListener("submit", function(e) {
    e.preventDefault();
    const fileInput = document.getElementById("csvFile");
    const dataType = document.getElementById("csvDataType").value; // "historicalFigures" or "globalEvents"
    const file = fileInput.files[0];
    if (!file) {
      document.getElementById("csvFeedback").innerText = "Please select a CSV file.";
      return;
    }
  
    Papa.parse(file, {
      header: true, // Assumes the CSV file has headers
      skipEmptyLines: true,
      complete: function(results) {
        console.log("Parsed CSV data:", results.data);
  
        if (dataType === "historicalFigures") {
          // Process each row as a historical figure.
          results.data.forEach(row => {
            // Expected CSV columns: dateOfBirth, dateOfDeath, description, groups, imageURL, name, nationality, region
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
          // Process each row as a global event.
          results.data.forEach(row => {
            // Expected CSV columns: category, createdOn, description, eventDate, eventName, imgURL, region, significance
            const eventName = row.eventName;
            const eventDate = row.eventDate;
            const description = row.description;
            const category = row.category;
            const region = row.region;
            const significance = row.significance;
            
            // Use current date for createdOn (or format as needed)
            const createdOn = new Date().toISOString().slice(0, 10); // YYYY-MM-DD format
      
            firebase.firestore().collection("globalEvents").add({
              eventName: eventName,
              eventDate: eventDate,
              description: description,
              category: category,
              region: region,
              significance: significance,
              createdOn: createdOn
              // imgURL is not populated
            }).then(() => {
              console.log(`Added global event: ${eventName}`);
            }).catch(error => {
              console.error("Error adding global event:", error);
            });
          });
        }
        
        document.getElementById("csvFeedback").innerText = "CSV import completed successfully.";
        // Optionally, reload the page or update the timeline dynamically.
        // window.location.reload();
      },
      error: function(err) {
        console.error("Error parsing CSV:", err);
        document.getElementById("csvFeedback").innerText = "Error parsing CSV file.";
      }
    });
  });
});
