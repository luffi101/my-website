// timeline.js

// Define groups (Y-axis categories)
const groups = [
    { id: 1, content: 'Politics' },
    { id: 2, content: 'Science' },
    { id: 3, content: 'Economy' }
  ];
  
  // Define historical figures (blocks). For more robust date handling, consider using full date strings or Date objects.
  const items = [
    {
      id: 1,
      group: 1, // Politics
      content: 'George Washington',
      start: '1732-01-01', // Birth date as a full date string
      end: '1799-12-31'   // Death date
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
    
    const options = {
      orientation: 'top', // Place labels above blocks
      showCurrentTime: false,
      zoomMin: 1000 * 60 * 60 * 24 * 365 * 50, // Minimum zoom level (50 years)
      stack: false,
      groupOrder: 'content', // Order groups by name
      tooltip: {
        delay: 100,
        followMouse: true
      },
      margin: {
        item: { horizontal: 0, vertical: 5 }
      }
    };
  
    // Create the timeline instance.
    const timeline = new vis.Timeline(container, items, groups, options);
  });
  