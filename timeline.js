// timeline.js

// Define groups (Y-axis categories)
const groups = [
  { id: 1, content: 'Politics' },
  { id: 2, content: 'Science' },
  { id: 3, content: 'Economy' }
];

// Define historical figures (blocks). Use full date strings for reliable parsing.
const items = [
  {
    id: 1,
    group: 1, // Politics
    content: 'George Washington',
    start: '1732-01-01',  // Birth date
    end: '1799-12-31'     // Death date
  },
  {
    id: 2,
    group: 2, // Science
    content: 'Isaac Newton',
    start: '1643-01-04',
    end: '1727-03-31'
  }
  // Add more historical figures here...
];

document.addEventListener('DOMContentLoaded', function() {
  const container = document.getElementById('timeline-container');

  // Convert years to milliseconds.
  // One year is approximately 31,557,600,000 ms (using 365.25 days/year).
  const msPerYear = 31557600000;
  
  // Desired zoom limits based on George Washington's block:
  // Minimum visible span: ~134 years (Washington's block spans ~half the screen)
  // Maximum visible span: ~558 years (Washington's block spans ~1 inch)
  const zoomMin = 134 * msPerYear;  // ≈ 4.23e12 ms
  const zoomMax = 558 * msPerYear;  // ≈ 1.76e13 ms

  const options = {
    orientation: 'top',           // Place labels above blocks
    showCurrentTime: false,
    zoomMin: zoomMin,             // Minimum zoom: 134 years visible
    zoomMax: zoomMax,             // Maximum zoom: 558 years visible
    min: new Date("0001-01-01"),   // Timeline cannot scroll before year 1 CE
    max: new Date("2025-12-31"),   // Timeline cannot scroll after 2025
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
