// timeline.js

// Define groups (Y-axis categories)
const groups = [
  { id: 1, content: 'Politics' },
  { id: 2, content: 'Science' },
  { id: 3, content: 'Economy' }
];

// Define historical figures (blocks). Use full ISO date strings for reliable parsing.
const items = [
  {
    id: 1,
    group: 1, // Politics
    content: 'George Washington',
    start: '1732-01-01', 
    end: '1799-12-31'
  },
  {
    id: 2,
    group: 2, // Science
    content: 'Isaac Newton',
    start: '1643-01-04',
    end: '1727-03-31'
  }
  // Add more historical figures as needed...
];

document.addEventListener('DOMContentLoaded', function() {
  const container = document.getElementById('timeline-container');

  const options = {
    orientation: 'top',           // Place labels above blocks
    showCurrentTime: false,
    // Set minimum zoom level: 50 years (in milliseconds)
    zoomMin: 1000 * 60 * 60 * 24 * 365 * 50,
    // Set maximum zoom level: 1000 years (in milliseconds; adjust as needed)
    zoomMax: 1000 * 60 * 60 * 24 * 365 * 1000,
    // Set the visible timeline bounds.
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

  // Initialize the timeline.
  const timeline = new vis.Timeline(container, items, groups, options);
});
