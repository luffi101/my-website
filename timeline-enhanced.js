/**
 * Historical Timeline - Enhanced JavaScript
 * Handles interactivity, modals, search, and rendering
 */

class TimelineManager {
  constructor(config) {
    this.config = {
      timeRange: config.timeRange || { start: 1640, end: 1820 },
      regions: config.regions || [
        'North America',
        'South America', 
        'Europe',
        'Africa',
        'Middle East',
        'East Asia',
        'Australia'
      ],
      categories: config.categories || [
        { name: 'Politics & Military', color: '#EF4444' },
        { name: 'Science', color: '#3B82F6' },
        { name: 'Economy', color: '#10B981' },
        { name: 'Arts, Musics & Cultural', color: '#EC4899' },
        { name: 'Literature', color: '#FBBF24' },
        { name: 'Philosophy & Religion', color: '#8B5CF6' },
        { name: 'Social & Cultural Movement', color: '#92400E' },
        { name: 'Exploration & Discovery', color: '#DC2626' }
      ]
    };
    
    this.figures = [];
    this.events = [];
    this.filteredFigures = [];
    this.zoomLevel = 1;
    
    this.init();
  }
  
  init() {
    this.setupEventListeners();
    this.renderLegend();
    this.renderTimelineStructure();
  }
  
  setupEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('timeline-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.handleSearch(e.target.value);
      });
    }
    
    // Zoom controls
    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');
    
    if (zoomInBtn) {
      zoomInBtn.addEventListener('click', () => this.handleZoom(0.25));
    }
    
    if (zoomOutBtn) {
      zoomOutBtn.addEventListener('click', () => this.handleZoom(-0.25));
    }
    
    // Close modal on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeModal();
      }
    });
  }
  
  renderLegend() {
    const legendContainer = document.getElementById('legend-items');
    if (!legendContainer) return;
    
    const legendHTML = this.config.categories.map(cat => `
      <div class="legend-item">
        <div class="legend-color" style="background-color: ${cat.color};"></div>
        <span class="legend-text">${cat.name}</span>
      </div>
    `).join('');
    
    legendContainer.innerHTML = legendHTML;
  }
  
  renderTimelineStructure() {
    const timelineGrid = document.getElementById('timeline-grid');
    if (!timelineGrid) return;
    
    const gridHTML = this.config.regions.map(region => `
      <div class="timeline-row" data-region="${region}">
        <div class="row-content">
          <div class="region-label">
            <svg class="region-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
            <span class="region-name">${region}</span>
          </div>
          <div class="timeline-track" id="track-${region.replace(/\s+/g, '-')}">
            ${this.renderGridLines()}
          </div>
        </div>
      </div>
    `).join('');
    
    timelineGrid.innerHTML = gridHTML;
  }
  
  renderGridLines() {
    const yearSpan = this.config.timeRange.end - this.config.timeRange.start;
    const gridLines = [];
    
    for (let i = 0; i <= Math.floor(yearSpan / 10); i++) {
      const position = (i * 10 / yearSpan) * 100;
      gridLines.push(`<div class="grid-line" style="left: ${position}%;"></div>`);
    }
    
    return gridLines.join('');
  }
  
  renderYearMarkers() {
    const yearsContainer = document.getElementById('timeline-years');
    if (!yearsContainer) return;
    
    const yearSpan = this.config.timeRange.end - this.config.timeRange.start;
    const markersHTML = [];
    
    for (let i = 0; i <= Math.floor(yearSpan / 10); i++) {
      const year = this.config.timeRange.start + (i * 10);
      const position = this.getPosition(year);
      
      markersHTML.push(`
        <div class="year-marker" style="left: ${position}%;">
          <div class="year-tick"></div>
          <span class="year-label">${year}</span>
        </div>
      `);
    }
    
    yearsContainer.innerHTML = markersHTML.join('');
  }
  
  // Calculate position percentage based on year
  getPosition(year) {
    const yearSpan = this.config.timeRange.end - this.config.timeRange.start;
    return ((year - this.config.timeRange.start) / yearSpan) * 100;
  }
  
  // Calculate width percentage based on birth and death years
  getWidth(birth, death) {
    const yearSpan = this.config.timeRange.end - this.config.timeRange.start;
    return ((death - birth) / yearSpan) * 100;
  }
  
  // Render a historical figure on the timeline
  renderFigure(figure, index) {
    const track = document.getElementById(`track-${figure.region.replace(/\s+/g, '-')}`);
    if (!track) return;
    
    const left = this.getPosition(figure.birth);
    const width = this.getWidth(figure.birth, figure.death);
    const top = index * 25 + 10; // Stack figures vertically
    
    const figureElement = document.createElement('div');
    figureElement.className = 'figure-bar';
    figureElement.style.left = `${left}%`;
    figureElement.style.width = `${width}%`;
    figureElement.style.top = `${top}px`;
    figureElement.style.backgroundColor = figure.color;
    figureElement.dataset.figureId = figure.id;
    
    figureElement.innerHTML = `
      <div class="figure-content">
        <span class="figure-name">${figure.name}</span>
        <span class="figure-years">(${figure.birth}-${figure.death})</span>
      </div>
    `;
    
    figureElement.addEventListener('click', () => this.showFigureModal(figure));
    
    track.appendChild(figureElement);
  }
  
  // Render an event marker on the timeline
  renderEvent(event) {
    const yearsContainer = document.getElementById('timeline-years');
    if (!yearsContainer) return;
    
    const position = this.getPosition(event.year);
    
    const eventElement = document.createElement('div');
    eventElement.className = 'event-marker';
    eventElement.style.left = `${position}%`;
    eventElement.style.backgroundColor = event.color;
    eventElement.dataset.eventId = event.id;
    
    eventElement.innerHTML = `
      <div class="event-dot" style="background-color: ${event.color};"></div>
    `;
    
    eventElement.addEventListener('click', () => this.showEventModal(event));
    
    yearsContainer.appendChild(eventElement);
  }
  
  // Load and render all figures from your Firestore data
  loadFigures(figures) {
    this.figures = figures;
    this.filteredFigures = figures;
    this.renderAllFigures();
  }
  
  // Load and render all events
  loadEvents(events) {
    this.events = events;
    this.renderYearMarkers();
    events.forEach(event => this.renderEvent(event));
  }
  
  renderAllFigures() {
    // Clear existing figures
    this.config.regions.forEach(region => {
      const track = document.getElementById(`track-${region.replace(/\s+/g, '-')}`);
      if (track) {
        // Remove all figure bars, keep grid lines
        const figureBars = track.querySelectorAll('.figure-bar');
        figureBars.forEach(bar => bar.remove());
      }
    });
    
    // Group figures by region
    const figuresByRegion = {};
    this.filteredFigures.forEach(figure => {
      if (!figuresByRegion[figure.region]) {
        figuresByRegion[figure.region] = [];
      }
      figuresByRegion[figure.region].push(figure);
    });
    
    // Render each region's figures
    Object.keys(figuresByRegion).forEach(region => {
      figuresByRegion[region].forEach((figure, index) => {
        this.renderFigure(figure, index);
      });
    });
  }
  
  // Search functionality
  handleSearch(searchTerm) {
    if (!searchTerm.trim()) {
      this.filteredFigures = this.figures;
    } else {
      this.filteredFigures = this.figures.filter(figure =>
        figure.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    this.renderAllFigures();
  }
  
  // Zoom functionality (for future implementation)
  handleZoom(delta) {
    this.zoomLevel = Math.max(0.5, Math.min(2, this.zoomLevel + delta));
    
    const zoomLevelDisplay = document.getElementById('zoom-level');
    if (zoomLevelDisplay) {
      zoomLevelDisplay.textContent = `${Math.round(this.zoomLevel * 100)}%`;
    }
    
    // TODO: Implement actual zoom transformation
    // This would involve scaling the timeline and adjusting positions
  }
  
  // Show modal with figure details
  showFigureModal(figure) {
    const modal = this.createModal('figure', figure);
    document.body.appendChild(modal);
    
    // Add click outside to close
    const overlay = modal.querySelector('.modal-overlay');
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.closeModal();
      }
    });
  }
  
  // Show modal with event details
  showEventModal(event) {
    const modal = this.createModal('event', event);
    document.body.appendChild(modal);
    
    const overlay = modal.querySelector('.modal-overlay');
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.closeModal();
      }
    });
  }
  
  createModal(type, data) {
    const modalDiv = document.createElement('div');
    modalDiv.id = 'timeline-modal';
    
    if (type === 'figure') {
      modalDiv.innerHTML = `
        <div class="modal-overlay">
          <div class="modal-content">
            <div class="modal-header">
              <div class="modal-title-row">
                <div class="modal-title-group">
                  <div class="modal-title-top">
                    <h2 class="modal-title">${data.name}</h2>
                    <div class="modal-category-badge" style="background-color: ${data.color};">
                      ${data.category}
                    </div>
                  </div>
                  <div class="modal-meta">
                    <div class="modal-meta-item">
                      <svg class="modal-section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                      </svg>
                      <span>${data.birth} - ${data.death}</span>
                    </div>
                    <div class="modal-meta-item">
                      <svg class="modal-section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                      </svg>
                      <span>${data.region}</span>
                    </div>
                  </div>
                </div>
                <button class="modal-close" onclick="timelineManager.closeModal()">
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
            </div>
            <div class="modal-body">
              ${data.description ? `
                <div class="modal-section">
                  <h3 class="modal-section-title">
                    <svg class="modal-section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                    </svg>
                    About
                  </h3>
                  <p class="modal-text">${data.description}</p>
                </div>
              ` : ''}
              ${data.achievements && data.achievements.length > 0 ? `
                <div class="modal-section">
                  <h3 class="modal-section-title">Key Achievements</h3>
                  <ul class="achievement-list">
                    ${data.achievements.map(achievement => `
                      <li class="achievement-item">
                        <span class="achievement-bullet"></span>
                        <span class="achievement-text">${achievement}</span>
                      </li>
                    `).join('')}
                  </ul>
                </div>
              ` : ''}
            </div>
          </div>
        </div>
      `;
    } else if (type === 'event') {
      modalDiv.innerHTML = `
        <div class="modal-overlay">
          <div class="modal-content">
            <div class="modal-header">
              <div class="modal-title-row">
                <div class="modal-title-group">
                  <div class="modal-title-top">
                    <div class="legend-color" style="background-color: ${data.color}; width: 0.75rem; height: 0.75rem; border-radius: 50%;"></div>
                    <h2 class="modal-title">${data.name}</h2>
                  </div>
                  <div class="modal-meta">
                    <div class="modal-meta-item">
                      <svg class="modal-section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                      </svg>
                      <span>${data.year}</span>
                    </div>
                  </div>
                </div>
                <button class="modal-close" onclick="timelineManager.closeModal()">
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
            </div>
            <div class="modal-body">
              <p class="modal-text">${data.description}</p>
            </div>
          </div>
        </div>
      `;
    }
    
    return modalDiv;
  }
  
  closeModal() {
    const modal = document.getElementById('timeline-modal');
    if (modal) {
      modal.remove();
    }
  }

  // Update the time range and re-render the grid structure.
  updateTimeRange(start, end) {
    this.config.timeRange = { start, end };
    this.renderTimelineStructure();
    this.renderYearMarkers();
  }
}

// Global reference — initialized from timeline.html after Firestore data is loaded.
let timelineManager;
