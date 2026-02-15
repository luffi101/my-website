/**
 * Historical Timeline - Enhanced JavaScript
 * Handles interactivity, modals, search, pan/zoom, and collision-free stacking
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

    // Viewport state
    this.fullStart = this.config.timeRange.start;
    this.fullEnd = this.config.timeRange.end;
    this.viewStart = this.fullStart;
    this.viewEnd = this.fullEnd;
    this.minViewSpan = 180;
    this.maxViewSpan = 2600;

    // Pan state
    this.isPanning = false;
    this.panStartX = 0;
    this.panStartViewStart = 0;
    this.panStartViewEnd = 0;
    this.panDragDistance = 0;

    // Stacking cache: { regionName: [{ figure, row }] }
    this.stackingCache = {};

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
      zoomInBtn.addEventListener('click', () => this.handleZoom(-0.2));
    }
    if (zoomOutBtn) {
      zoomOutBtn.addEventListener('click', () => this.handleZoom(0.2));
    }

    // Mouse wheel zoom on timeline card
    const timelineCard = document.querySelector('.timeline-card');
    if (timelineCard) {
      timelineCard.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.15 : -0.15;
        // Zoom centered on cursor position
        const rect = timelineCard.getBoundingClientRect();
        const fraction = (e.clientX - rect.left) / rect.width;
        this.handleZoom(delta, fraction);
      }, { passive: false });
    }

    // Close modal on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeModal();
      }
    });
  }

  setupPanListeners() {
    const timelineCard = document.querySelector('.timeline-card');
    if (!timelineCard) return;

    timelineCard.style.cursor = 'grab';

    const onMouseDown = (e) => {
      // Ignore clicks on buttons, modals, etc.
      if (e.target.closest('.modal-overlay') || e.target.closest('button')) return;
      this.isPanning = true;
      this.panStartX = e.clientX;
      this.panStartViewStart = this.viewStart;
      this.panStartViewEnd = this.viewEnd;
      this.panDragDistance = 0;
      timelineCard.classList.add('panning');
    };

    const onMouseMove = (e) => {
      if (!this.isPanning) return;
      const dx = e.clientX - this.panStartX;
      this.panDragDistance = Math.abs(dx);

      // Convert pixel delta to year delta
      const trackEl = document.querySelector('.timeline-track');
      if (!trackEl) return;
      const trackWidth = trackEl.getBoundingClientRect().width;
      const viewSpan = this.panStartViewEnd - this.panStartViewStart;
      const yearDelta = -(dx / trackWidth) * viewSpan;

      this.viewStart = this.panStartViewStart + yearDelta;
      this.viewEnd = this.panStartViewEnd + yearDelta;
      this.clampViewport();
      this.renderViewport();
    };

    const onMouseUp = () => {
      if (!this.isPanning) return;
      this.isPanning = false;
      timelineCard.classList.remove('panning');
    };

    timelineCard.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
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
          </div>
        </div>
      </div>
    `).join('');

    timelineGrid.innerHTML = gridHTML;
  }

  // --- Viewport-relative positioning ---

  getViewportPosition(year) {
    const viewSpan = this.viewEnd - this.viewStart;
    return ((year - this.viewStart) / viewSpan) * 100;
  }

  getViewportWidth(startYear, endYear) {
    const viewSpan = this.viewEnd - this.viewStart;
    return ((endYear - startYear) / viewSpan) * 100;
  }

  clampViewport() {
    const span = this.viewEnd - this.viewStart;
    const absMin = -500;
    const absMax = 2030;

    if (this.viewStart < absMin) {
      this.viewStart = absMin;
      this.viewEnd = absMin + span;
    }
    if (this.viewEnd > absMax) {
      this.viewEnd = absMax;
      this.viewStart = absMax - span;
    }
  }

  // --- Stacking algorithm ---

  computeStacking() {
    this.stackingCache = {};

    // Group filtered figures by region
    const byRegion = {};
    this.filteredFigures.forEach(figure => {
      if (!byRegion[figure.region]) byRegion[figure.region] = [];
      byRegion[figure.region].push(figure);
    });

    // For each region, sort by birth year and greedily assign rows
    for (const region of Object.keys(byRegion)) {
      const figures = byRegion[region].slice().sort((a, b) => a.birth - b.birth);
      const rows = []; // rows[i] = end year of last figure in that row

      const assignments = [];
      for (const fig of figures) {
        let placed = false;
        for (let r = 0; r < rows.length; r++) {
          // Add a small gap (2 years) to prevent visual overlap
          if (fig.birth >= rows[r] + 2) {
            rows[r] = fig.death;
            assignments.push({ figure: fig, row: r });
            placed = true;
            break;
          }
        }
        if (!placed) {
          rows.push(fig.death);
          assignments.push({ figure: fig, row: rows.length - 1 });
        }
      }

      this.stackingCache[region] = assignments;
    }
  }

  updateTrackHeights() {
    const viewSpan = this.viewEnd - this.viewStart;
    const barHeight = this.getScaledBarHeight();
    const barGap = 4;

    for (const region of this.config.regions) {
      const track = document.getElementById(`track-${region.replace(/\s+/g, '-')}`);
      if (!track) continue;

      const assignments = this.stackingCache[region] || [];
      let maxRow = 0;
      assignments.forEach(a => { if (a.row > maxRow) maxRow = a.row; });

      const rowCount = assignments.length > 0 ? maxRow + 1 : 1;
      const minH = rowCount * (barHeight + barGap) + 16;
      track.style.minHeight = Math.max(minH, 50) + 'px';
    }
  }

  getScaledBarHeight() {
    const viewSpan = this.viewEnd - this.viewStart;
    // Scale bar height: larger when zoomed in, smaller when zoomed out
    if (viewSpan < 100) return 22;
    if (viewSpan < 300) return 20;
    if (viewSpan < 600) return 18;
    if (viewSpan < 1000) return 16;
    return 14;
  }

  getScaledFontSize() {
    const viewSpan = this.viewEnd - this.viewStart;
    if (viewSpan < 100) return 0.8;
    if (viewSpan < 300) return 0.75;
    if (viewSpan < 600) return 0.7;
    if (viewSpan < 1000) return 0.65;
    return 0.6;
  }

  // --- Rendering ---

  // Build abbreviated name variants for a figure
  getNameVariants(name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      return {
        full: name,
        abbreviated: name,
        initials: name.charAt(0) + '.'
      };
    }
    const firstName = parts[0];
    const lastName = parts[parts.length - 1];
    return {
      full: name,
      abbreviated: firstName.charAt(0) + '. ' + lastName,
      initials: firstName.charAt(0) + '.' + lastName.charAt(0) + '.'
    };
  }

  renderFigure(figure, row) {
    const track = document.getElementById(`track-${figure.region.replace(/\s+/g, '-')}`);
    if (!track) return;

    const left = this.getViewportPosition(figure.birth);
    const widthPct = this.getViewportWidth(figure.birth, figure.death);

    // Viewport culling: skip if completely outside [-5%, 105%]
    if (left + widthPct < -5 || left > 105) return;

    // Compute approximate pixel width for tiered display
    const trackWidth = track.getBoundingClientRect().width || 800;
    const pixelWidth = (widthPct / 100) * trackWidth;

    const barHeight = this.getScaledBarHeight();
    const barGap = 4;
    const top = row * (barHeight + barGap) + 8;
    const fontSize = this.getScaledFontSize();

    const figureElement = document.createElement('div');
    figureElement.dataset.figureId = figure.id;
    figureElement.style.top = `${top}px`;
    figureElement.style.backgroundColor = figure.color;

    const yearDisplay = this.formatYear(figure.birth) + '-' + this.formatYear(figure.death);
    const variants = this.getNameVariants(figure.name);

    if (pixelWidth < 8) {
      // Dot mode: tiny colored circle with hover tooltip
      figureElement.className = 'figure-bar figure-dot';
      const dotSize = Math.max(barHeight * 0.6, 6);
      figureElement.style.left = `${left}%`;
      figureElement.style.width = `${dotSize}px`;
      figureElement.style.height = `${dotSize}px`;
      figureElement.style.top = `${top + (barHeight - dotSize) / 2}px`;
      figureElement.innerHTML = `<span class="figure-tooltip">${figure.name} (${yearDisplay})</span>`;
    } else if (pixelWidth < 40) {
      // Initials mode: show initials with tooltip
      figureElement.className = 'figure-bar';
      figureElement.style.left = `${left}%`;
      figureElement.style.width = `${widthPct}%`;
      figureElement.style.minWidth = '20px';
      figureElement.style.height = `${barHeight}px`;
      figureElement.innerHTML = `
        <div class="figure-content" style="font-size: ${fontSize}rem; justify-content: center;">
          <span class="figure-name">${variants.initials}</span>
        </div>
        <span class="figure-tooltip">${figure.name} (${yearDisplay})</span>
      `;
    } else if (pixelWidth < 80) {
      // Abbreviated mode: "B. Franklin"
      figureElement.className = 'figure-bar';
      figureElement.style.left = `${left}%`;
      figureElement.style.width = `${widthPct}%`;
      figureElement.style.height = `${barHeight}px`;
      figureElement.innerHTML = `
        <div class="figure-content" style="font-size: ${fontSize}rem;">
          <span class="figure-name">${variants.abbreviated}</span>
        </div>
        <span class="figure-tooltip">${figure.name} (${yearDisplay})</span>
      `;
    } else if (pixelWidth < 150) {
      // Medium mode: abbreviated name + years
      figureElement.className = 'figure-bar';
      figureElement.style.left = `${left}%`;
      figureElement.style.width = `${widthPct}%`;
      figureElement.style.height = `${barHeight}px`;
      figureElement.innerHTML = `
        <div class="figure-content" style="font-size: ${fontSize}rem;">
          <span class="figure-name">${variants.abbreviated}</span>
          <span class="figure-years">(${yearDisplay})</span>
        </div>
      `;
    } else {
      // Full mode: "Benjamin Franklin (1706-1790)"
      figureElement.className = 'figure-bar';
      figureElement.style.left = `${left}%`;
      figureElement.style.width = `${widthPct}%`;
      figureElement.style.height = `${barHeight}px`;
      figureElement.innerHTML = `
        <div class="figure-content" style="font-size: ${fontSize}rem;">
          <span class="figure-name">${variants.full}</span>
          <span class="figure-years">(${yearDisplay})</span>
        </div>
      `;
    }

    figureElement.addEventListener('click', (e) => {
      // Suppress click if it was a pan drag
      if (this.panDragDistance > 5) return;
      this.showFigureModal(figure);
    });

    track.appendChild(figureElement);
  }

  renderAllFigures() {
    // Clear existing figure bars from all tracks
    this.config.regions.forEach(region => {
      const track = document.getElementById(`track-${region.replace(/\s+/g, '-')}`);
      if (track) {
        const figureBars = track.querySelectorAll('.figure-bar');
        figureBars.forEach(bar => bar.remove());
      }
    });

    // Render from stacking cache
    for (const region of Object.keys(this.stackingCache)) {
      const assignments = this.stackingCache[region];
      for (const { figure, row } of assignments) {
        this.renderFigure(figure, row);
      }
    }
  }

  renderGridLines() {
    const viewSpan = this.viewEnd - this.viewStart;
    let interval;
    if (viewSpan <= 50) interval = 5;
    else if (viewSpan <= 150) interval = 10;
    else if (viewSpan <= 400) interval = 20;
    else if (viewSpan <= 800) interval = 50;
    else interval = 100;

    this.config.regions.forEach(region => {
      const track = document.getElementById(`track-${region.replace(/\s+/g, '-')}`);
      if (!track) return;

      // Remove old grid lines
      track.querySelectorAll('.grid-line').forEach(el => el.remove());

      const firstLine = Math.ceil(this.viewStart / interval) * interval;
      for (let year = firstLine; year <= this.viewEnd; year += interval) {
        const pos = this.getViewportPosition(year);
        if (pos < -1 || pos > 101) continue;
        const line = document.createElement('div');
        line.className = 'grid-line';
        line.style.left = `${pos}%`;
        track.appendChild(line);
      }
    });
  }

  renderYearMarkers() {
    const yearsContainer = document.getElementById('timeline-years');
    if (!yearsContainer) return;

    // Remove only year markers (keep event markers)
    yearsContainer.querySelectorAll('.year-marker').forEach(el => el.remove());

    const viewSpan = this.viewEnd - this.viewStart;
    let interval;
    if (viewSpan <= 50) interval = 5;
    else if (viewSpan <= 150) interval = 10;
    else if (viewSpan <= 400) interval = 20;
    else if (viewSpan <= 800) interval = 50;
    else interval = 100;

    const firstMarker = Math.ceil(this.viewStart / interval) * interval;
    const markersHTML = [];

    for (let year = firstMarker; year <= this.viewEnd; year += interval) {
      const position = this.getViewportPosition(year);
      if (position < -1 || position > 101) continue;
      const label = this.formatYear(year);
      markersHTML.push(`
        <div class="year-marker" style="left: ${position}%;">
          <div class="year-tick"></div>
          <span class="year-label">${label}</span>
        </div>
      `);
    }

    // Preserve event markers
    const eventMarkers = yearsContainer.querySelectorAll('.event-marker');
    const eventHTML = Array.from(eventMarkers).map(el => el.outerHTML).join('');

    yearsContainer.innerHTML = markersHTML.join('') + eventHTML;

    // Re-attach event marker click handlers
    this.reattachEventMarkerListeners();
  }

  reattachEventMarkerListeners() {
    const yearsContainer = document.getElementById('timeline-years');
    if (!yearsContainer) return;

    yearsContainer.querySelectorAll('.event-marker').forEach(marker => {
      const eventId = marker.dataset.eventId;
      const event = this.events.find(e => e.id === eventId);
      if (event) {
        marker.addEventListener('click', () => this.showEventModal(event));
      }
    });
  }

  renderAllEvents() {
    const yearsContainer = document.getElementById('timeline-years');
    if (!yearsContainer) return;

    // Remove old event markers
    yearsContainer.querySelectorAll('.event-marker').forEach(el => el.remove());

    this.events.forEach(event => {
      const position = this.getViewportPosition(event.year);
      // Cull events outside viewport
      if (position < -2 || position > 102) return;

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
    });
  }

  formatYear(year) {
    if (year < 0) return Math.abs(year) + ' BC';
    return String(year);
  }

  // --- Master render ---

  renderViewport() {
    this.renderAllFigures();
    this.renderGridLines();
    this.renderYearMarkers();
    this.renderAllEvents();
    this.updateTrackHeights();
    this.updateZoomDisplay();
  }

  updateZoomDisplay() {
    const fullSpan = this.fullEnd - this.fullStart;
    const viewSpan = this.viewEnd - this.viewStart;
    const percentage = Math.round((fullSpan / viewSpan) * 100);

    const zoomLevelDisplay = document.getElementById('zoom-level');
    if (zoomLevelDisplay) {
      zoomLevelDisplay.textContent = `${percentage}%`;
    }
  }

  // --- Zoom ---

  handleZoom(delta, centerFraction) {
    const viewSpan = this.viewEnd - this.viewStart;
    const change = viewSpan * delta;

    // Default to center if no fraction provided
    if (centerFraction === undefined) centerFraction = 0.5;

    const newStart = this.viewStart - change * centerFraction;
    const newEnd = this.viewEnd + change * (1 - centerFraction);
    const newSpan = newEnd - newStart;

    if (newSpan < this.minViewSpan || newSpan > this.maxViewSpan) return;

    this.viewStart = newStart;
    this.viewEnd = newEnd;
    this.clampViewport();
    this.computeStacking();
    this.renderViewport();
  }

  // --- Data loading ---

  loadFigures(figures) {
    this.figures = figures;
    this.filteredFigures = figures;
    this.computeStacking();
    this.renderViewport();
    this.setupPanListeners();
  }

  loadEvents(events) {
    this.events = events;
    this.renderViewport();
  }

  // --- Search ---

  handleSearch(searchTerm) {
    if (!searchTerm.trim()) {
      this.filteredFigures = this.figures;
    } else {
      this.filteredFigures = this.figures.filter(figure =>
        figure.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    this.computeStacking();
    this.renderViewport();
  }

  // --- Time range ---

  updateTimeRange(start, end) {
    this.config.timeRange = { start, end };
    this.fullStart = start;
    this.fullEnd = end;
    this.viewStart = start;
    this.viewEnd = end;
    this.renderTimelineStructure();
    this.computeStacking();
    this.renderViewport();
  }

  // --- Modals ---

  showFigureModal(figure) {
    const modal = this.createModal('figure', figure);
    document.body.appendChild(modal);

    const overlay = modal.querySelector('.modal-overlay');
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.closeModal();
      }
    });
  }

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

    const birthDisplay = this.formatYear(data.birth || data.year);
    const deathDisplay = data.death ? this.formatYear(data.death) : '';

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
                      <span>${birthDisplay} - ${deathDisplay}</span>
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
}

// Global reference — initialized from timeline.html after Firestore data is loaded.
let timelineManager;
