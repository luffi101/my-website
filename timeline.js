// timeline.js

// Define groups (Y-axis categories)
const groups = [
  { id: 1, content: 'Politics' },
  { id: 2, content: 'Science' },
  { id: 3, content: 'Economy' }
];

// Define historical figures (blocks) using full ISO date strings for consistency.
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
  // Add more historical figures as needed...
];

document.addEventListener('DOMContentLoaded', function() {
  const container = document.getElementById('timeline-container');

  // Milliseconds per year (using 365.25 days/year for average)
  const msPerYear = 31557600000;

  // Desired conditions for George Washington's block (67 years lifespan):
  // Zoom In: When zoomed in, the visible time span should be no less than 134 years (so his block is at most half the container width).
  const zoomMin = 134 * msPerYear;

  // Zoom Out: We want his block to be at least 1 inch wide.
  // Assume 1 inch ≈ 96px. Let containerWidth be the pixel width of the timeline container.
  const containerWidth = container.offsetWidth;
  const zoomMax = (67 * msPerYear * containerWidth) / 96;

  const options = {
    orientation: 'top',         // Labels above the blocks.
    showCurrentTime: false,
    zoomMin: zoomMin,           // Minimum visible span (cannot zoom in further than 134 years).
    zoomMax: zoomMax,           // Maximum visible span (cannot zoom out beyond this value).
    // Set timeline bounds.
    min: new Date("0001-01-01"),
    max: new Date("2025-12-31"),
    stack: false,
    groupOrder: 'content',      // Order groups alphabetically.
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
