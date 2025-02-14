// timeline.js

// Define groups (Y-axis categories)
const groups = [
  { id: 1, content: 'Politics' },
  { id: 2, content: 'Science' },
  { id: 3, content: 'Economy' }
];

// Define historical figures (blocks) using full ISO date strings for reliable parsing.
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

  // Desired conditions using George Washington's 67-year lifespan:
  // When zooming in, we want his block to span at most 1/3 of the container width.
  // That means the minimum visible time span should be: 67 * 3 = 201 years.
  const zoomMin = 201 * msPerYear;

  // When zooming out, we want his block to remain at least ~1 inch wide.
  // Assuming 1 inch is ~96px and container width is dynamic:
  const containerWidth = container.offsetWidth;
  // Visible span (years) such that 67 years equals 1 inch:
  // (67 / visibleSpan) * containerWidth = 96 => visibleSpan = (67 * containerWidth) / 96.
  const zoomMax = (67 * msPerYear * containerWidth) / 96;

  const options = {
    orientation: 'top',           // Place labels above blocks
    showCurrentTime: false,
    zoomMin: zoomMin,             // Minimum visible time span (~201 years)
    zoomMax: zoomMax,             // Maximum visible time span (calculated dynamically)
    // Set timeline bounds.
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
