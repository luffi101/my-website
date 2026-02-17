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
        { name: 'Visual Arts', color: '#EC4899' },
        { name: 'Music', color: '#F97316' },
        { name: 'Literature', color: '#FBBF24' },
        { name: 'Philosophy', color: '#8B5CF6' },
        { name: 'Religion', color: '#F59E0B' },
        { name: 'Exploration & Discovery', color: '#14B8A6' }
      ]
    };

    this.figures = [];
    this.events = [];
    this.filteredFigures = [];
    this.activeCategory = null; // null = show all

    // Viewport state
    this.fullStart = this.config.timeRange.start;
    this.fullEnd = this.config.timeRange.end;
    this.minViewSpan = 150;
    this.maxViewSpan = 800;

    // Clamp initial viewport to maxViewSpan, centered on midpoint
    const dataSpan = this.fullEnd - this.fullStart;
    if (dataSpan > this.maxViewSpan) {
      const mid = (this.fullStart + this.fullEnd) / 2;
      this.viewStart = mid - this.maxViewSpan / 2;
      this.viewEnd = mid + this.maxViewSpan / 2;
    } else {
      this.viewStart = this.fullStart;
      this.viewEnd = this.fullEnd;
    }

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

    const showAllBtn = `<button class="legend-item legend-show-all${!this.activeCategory ? ' legend-item-active' : ''}" data-category="__all__">Show All</button>`;

    const itemsHTML = this.config.categories.map(cat => {
      const isActive = this.activeCategory === cat.name;
      return `
        <button class="legend-item legend-filter-btn${isActive ? ' legend-item-active' : ''}" data-category="${cat.name}">
          <div class="legend-color" style="background-color: ${cat.color};"></div>
          <span class="legend-text">${cat.name}</span>
        </button>
      `;
    }).join('');

    legendContainer.innerHTML = showAllBtn + itemsHTML;

    // Attach click handlers
    legendContainer.querySelectorAll('[data-category]').forEach(btn => {
      btn.addEventListener('click', () => {
        const cat = btn.dataset.category;
        if (cat === '__all__' || this.activeCategory === cat) {
          this.activeCategory = null;
        } else {
          this.activeCategory = cat;
        }
        this.applyFilters();
        this.renderLegend();
      });
    });

    // Update filter status text
    this.updateFilterStatus();
  }

  updateFilterStatus() {
    const el = document.getElementById('filter-status');
    if (!el) return;
    if (!this.activeCategory) {
      el.textContent = `Showing: All categories (${this.filteredFigures.length} figures)`;
    } else {
      el.textContent = `Showing: ${this.activeCategory} (${this.filteredFigures.length} figures)`;
    }
  }

  applyFilters() {
    const searchInput = document.getElementById('timeline-search');
    const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : '';

    let result = this.figures;

    if (this.activeCategory) {
      result = result.filter(f => f.category === this.activeCategory);
    }
    if (searchTerm) {
      result = result.filter(f => f.name.toLowerCase().includes(searchTerm));
    }

    this.filteredFigures = result;
    this.computeStacking();
    this.renderViewport();
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
    const absMin = this.fullStart;
    const absMax = this.fullEnd;

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

    // Minimum display span so enlarged short-lived figures don't overlap
    const minSpan = this.getMinDisplaySpan();

    // For each region, sort by birth year and greedily assign rows
    for (const region of Object.keys(byRegion)) {
      const figures = byRegion[region].slice().sort((a, b) => a.birth - b.birth);
      const rows = []; // rows[i] = effective end year of last figure in that row

      const assignments = [];
      for (const fig of figures) {
        const effectiveEnd = Math.max(fig.death, fig.birth + minSpan);
        let placed = false;
        for (let r = 0; r < rows.length; r++) {
          // Add a small gap (2 years) to prevent visual overlap
          if (fig.birth >= rows[r] + 2) {
            rows[r] = effectiveEnd;
            assignments.push({ figure: fig, row: r });
            placed = true;
            break;
          }
        }
        if (!placed) {
          rows.push(effectiveEnd);
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

  getMinDisplaySpan() {
    // Minimum lifespan in years a figure bar will be rendered as.
    // Adapts to zoom level so buttons stay visible even when very zoomed out.
    const viewSpan = this.viewEnd - this.viewStart;
    const trackEl = document.querySelector('.timeline-track');
    const trackWidth = (trackEl && trackEl.getBoundingClientRect().width) || 800;

    // Year-based minimum (viewport capped at 1000 years)
    const minYears = 40;

    // Absolute pixel floor — never smaller than 50px
    const pixelFloorYears = (50 / trackWidth) * viewSpan;

    return Math.max(minYears, pixelFloorYears);
  }

  getScaledBarHeight() {
    const viewSpan = this.viewEnd - this.viewStart;
    // Scale bar height: larger when zoomed in, smaller when zoomed out
    if (viewSpan < 100) return 38;
    if (viewSpan < 300) return 36;
    if (viewSpan < 600) return 34;
    if (viewSpan < 1000) return 34;
    return 34;
  }

  getScaledFontSize() {
    const viewSpan = this.viewEnd - this.viewStart;
    if (viewSpan < 100) return 1.05;
    if (viewSpan < 300) return 1.0;
    if (viewSpan < 600) return 1.0;
    if (viewSpan < 1000) return 0.925;
    return 0.875;
  }

  getTextColor(bgColor) {
    const hex = bgColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#1e3a5f' : '#ffffff';
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
    const naturalWidthPct = this.getViewportWidth(figure.birth, figure.death);

    // Apply minimum display width
    const minSpan = this.getMinDisplaySpan();
    const minWidthPct = this.getViewportWidth(0, minSpan);
    const isStretched = naturalWidthPct < minWidthPct;
    const widthPct = Math.max(naturalWidthPct, minWidthPct);

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
    const textColor = this.getTextColor(figure.color);
    const yearsAlpha = textColor === '#ffffff' ? 'rgba(255,255,255,0.85)' : 'rgba(30,58,95,0.75)';

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
        <div class="figure-content" style="font-size: ${fontSize}rem; padding: 0 16px; line-height: 1.3; justify-content: center;">
          <span class="figure-name" style="color: ${textColor};">${variants.initials}</span>
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
        <div class="figure-content" style="font-size: ${fontSize}rem; padding: 0 16px; line-height: 1.3;">
          <span class="figure-name" style="color: ${textColor};">${variants.abbreviated}</span>
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
        <div class="figure-content" style="font-size: ${fontSize}rem; padding: 0 16px; line-height: 1.3;">
          <span class="figure-name" style="color: ${textColor};">${variants.abbreviated}</span>
          <span class="figure-years" style="color: ${yearsAlpha};">(${yearDisplay})</span>
        </div>
      `;
    } else {
      // Full mode: "Benjamin Franklin (1706-1790)"
      figureElement.className = 'figure-bar';
      figureElement.style.left = `${left}%`;
      figureElement.style.width = `${widthPct}%`;
      figureElement.style.height = `${barHeight}px`;
      figureElement.innerHTML = `
        <div class="figure-content" style="font-size: ${fontSize}rem; padding: 0 16px; line-height: 1.3;">
          <span class="figure-name" style="color: ${textColor};">${variants.full}</span>
          <span class="figure-years" style="color: ${yearsAlpha};">(${yearDisplay})</span>
        </div>
      `;
    }

    // Visual indicator for buttons stretched beyond actual lifespan
    if (isStretched && !figureElement.classList.contains('figure-dot')) {
      figureElement.style.borderStyle = 'dashed';
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
    else if (viewSpan <= 200) interval = 10;
    else if (viewSpan <= 500) interval = 25;
    else if (viewSpan <= 1000) interval = 50;
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
    const yearsBottom = document.getElementById('timeline-years-bottom');
    if (!yearsContainer) return;

    // Remove only year markers (keep event markers)
    yearsContainer.querySelectorAll('.year-marker').forEach(el => el.remove());
    if (yearsBottom) yearsBottom.querySelectorAll('.year-marker').forEach(el => el.remove());

    const viewSpan = this.viewEnd - this.viewStart;
    let interval;
    if (viewSpan <= 50) interval = 5;
    else if (viewSpan <= 200) interval = 10;
    else if (viewSpan <= 500) interval = 25;
    else if (viewSpan <= 1000) interval = 50;
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

    const markersStr = markersHTML.join('');

    // Preserve event markers
    const eventMarkers = yearsContainer.querySelectorAll('.event-marker');
    const eventHTML = Array.from(eventMarkers).map(el => el.outerHTML).join('');

    yearsContainer.innerHTML = markersStr + eventHTML;
    if (yearsBottom) yearsBottom.innerHTML = markersStr;

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
    this.updateViewportIndicator();
    this.updateFilterStatus();
  }

  updateViewportIndicator() {
    const startLabel = this.formatYear(Math.round(this.viewStart));
    const endLabel = this.formatYear(Math.round(this.viewEnd));
    const span = Math.round(this.viewEnd - this.viewStart);
    const text = `Viewing: ${startLabel} – ${endLabel}  (${span} years)`;

    const top = document.getElementById('viewport-range');
    const bottom = document.getElementById('viewport-range-bottom');
    if (top) top.textContent = text;
    if (bottom) bottom.textContent = text;
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

    let newStart = this.viewStart - change * centerFraction;
    let newEnd = this.viewEnd + change * (1 - centerFraction);
    let newSpan = newEnd - newStart;

    // Clamp span to limits instead of rejecting
    if (newSpan < this.minViewSpan) {
      const center = (newStart + newEnd) / 2;
      newStart = center - this.minViewSpan / 2;
      newEnd = center + this.minViewSpan / 2;
    } else if (newSpan > this.maxViewSpan) {
      const center = (newStart + newEnd) / 2;
      newStart = center - this.maxViewSpan / 2;
      newEnd = center + this.maxViewSpan / 2;
    }

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
    this.applyFilters();
  }

  // --- Time range ---

  updateTimeRange(start, end) {
    this.config.timeRange = { start, end };
    this.fullStart = start;
    this.fullEnd = end;

    // Clamp viewport to maxViewSpan, centered on midpoint
    const dataSpan = end - start;
    if (dataSpan > this.maxViewSpan) {
      const mid = (start + end) / 2;
      this.viewStart = mid - this.maxViewSpan / 2;
      this.viewEnd = mid + this.maxViewSpan / 2;
    } else {
      this.viewStart = start;
      this.viewEnd = end;
    }

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
