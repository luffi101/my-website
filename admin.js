// admin.js — AdminManager class

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

class AdminManager {
  constructor() {
    this.ADMIN_EMAILS = ['luffi.101@gmail.com'];
    this.db = firebase.firestore();

    // Data
    this.figures = [];
    this.events = [];
    this.filteredData = [];

    // State
    this.activeTab = 'figures';
    this.sortColumn = '';
    this.sortDirection = 'asc';
    this.searchTerm = '';
    this.filterCategory = '';
    this.filterRegion = '';

    // Category colors (same as timeline)
    this.categoryColorMap = {
      'politics & military': '#e85d5d',
      'science': '#5a92e8',
      'economy': '#3dbf8e',
      'arts, musics & cultural': '#e066a8',
      'literature': '#f0be42',
      'philosophy & religion': '#9a74e8',
      'social & cultural movement': '#a05820',
      'exploration & discovery': '#14B8A6'
    };

    this.categories = [
      'Politics & Military',
      'Science',
      'Economy',
      'Arts, Musics & Cultural',
      'Literature',
      'Philosophy & Religion',
      'Social & Cultural Movement',
      'Exploration & Discovery'
    ];

    this.regions = [
      'North America', 'South America', 'Europe',
      'Africa', 'Middle East', 'East Asia', 'Australia'
    ];

    this.init();
  }

  init() {
    firebase.auth().onAuthStateChanged(user => {
      if (!user) {
        alert('You must be logged in to access the admin page.');
        window.location.href = 'index.html';
      } else if (!this.ADMIN_EMAILS.includes(user.email)) {
        alert('You do not have admin access.');
        window.location.href = 'index.html';
      } else {
        this.setupEventListeners();
        this.loadAll();
      }
    });
  }

  setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.admin-tab').forEach(tab => {
      tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
    });

    // Search
    document.getElementById('admin-search').addEventListener('input', (e) => {
      this.searchTerm = e.target.value.trim().toLowerCase();
      this.applyFilters();
    });

    // Filters
    document.getElementById('filter-category').addEventListener('change', (e) => {
      this.filterCategory = e.target.value;
      this.applyFilters();
    });
    document.getElementById('filter-region').addEventListener('change', (e) => {
      this.filterRegion = e.target.value;
      this.applyFilters();
    });

    // Add New
    document.getElementById('btn-add-new').addEventListener('click', () => this.openAddModal());

    // CSV Import
    document.getElementById('csv-file-input').addEventListener('change', (e) => {
      if (e.target.files[0]) {
        this.importCSV(e.target.files[0]);
        e.target.value = '';
      }
    });

    // CSV Export
    document.getElementById('btn-export-csv').addEventListener('click', () => this.exportCSV());
  }

  // ---- Data Loading ----

  async loadAll() {
    try {
      const [figuresSnap, eventsSnap] = await Promise.all([
        this.db.collection('historicalFigures').get(),
        this.db.collection('globalEvents').get()
      ]);

      this.figures = [];
      figuresSnap.forEach(doc => {
        this.figures.push({ id: doc.id, ...doc.data() });
      });

      this.events = [];
      eventsSnap.forEach(doc => {
        this.events.push({ id: doc.id, ...doc.data() });
      });

      this.applyFilters();
    } catch (error) {
      console.error('Error loading data:', error);
      this.showToast('Error loading data: ' + error.message, 'error');
    }
  }

  // ---- Filtering & Sorting ----

  applyFilters() {
    const data = this.activeTab === 'figures' ? this.figures : this.events;
    let filtered = [...data];

    // Search
    if (this.searchTerm) {
      filtered = filtered.filter(item => {
        const searchable = this.activeTab === 'figures'
          ? `${item.name} ${item.nationality} ${item.description} ${item.region}`
          : `${item.eventName} ${item.description} ${item.category} ${item.region}`;
        return searchable.toLowerCase().includes(this.searchTerm);
      });
    }

    // Category filter
    if (this.filterCategory) {
      filtered = filtered.filter(item => {
        if (this.activeTab === 'figures') {
          return item.groups && item.groups.some(g =>
            g.toLowerCase() === this.filterCategory.toLowerCase()
          );
        }
        return item.category && item.category.toLowerCase() === this.filterCategory.toLowerCase();
      });
    }

    // Region filter
    if (this.filterRegion) {
      filtered = filtered.filter(item =>
        item.region && item.region.toLowerCase() === this.filterRegion.toLowerCase()
      );
    }

    // Sort
    if (this.sortColumn) {
      filtered.sort((a, b) => {
        let aVal = a[this.sortColumn] || '';
        let bVal = b[this.sortColumn] || '';
        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();
        if (aVal < bVal) return this.sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return this.sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    this.filteredData = filtered;
    this.renderTable();
    this.renderStats();
  }

  handleSort(column) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.applyFilters();
  }

  // ---- Tab Switching ----

  switchTab(tab) {
    this.activeTab = tab;
    this.sortColumn = '';
    this.sortDirection = 'asc';
    this.searchTerm = '';
    this.filterCategory = '';
    this.filterRegion = '';

    document.getElementById('admin-search').value = '';
    document.getElementById('filter-category').value = '';
    document.getElementById('filter-region').value = '';

    // Toggle category filter visibility (only for figures)
    const categoryFilter = document.getElementById('filter-category');
    categoryFilter.style.display = tab === 'figures' ? '' : '';

    document.querySelectorAll('.admin-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tab);
    });

    this.applyFilters();
  }

  // ---- Rendering ----

  renderStats() {
    const total = this.activeTab === 'figures' ? this.figures.length : this.events.length;
    const shown = this.filteredData.length;
    const label = this.activeTab === 'figures' ? 'historical figures' : 'global events';
    const statsEl = document.getElementById('admin-stats');
    if (shown === total) {
      statsEl.innerHTML = `Showing <strong>${total}</strong> ${label}`;
    } else {
      statsEl.innerHTML = `Showing <strong>${shown}</strong> of <strong>${total}</strong> ${label}`;
    }
  }

  renderTable() {
    const thead = document.getElementById('admin-thead');
    const tbody = document.getElementById('admin-tbody');

    // Build columns based on active tab
    const columns = this.activeTab === 'figures'
      ? [
          { key: 'name', label: 'Name', sortable: true },
          { key: 'dateOfBirth', label: 'Born', sortable: true },
          { key: 'dateOfDeath', label: 'Died', sortable: true },
          { key: 'groups', label: 'Categories', sortable: false },
          { key: 'region', label: 'Region', sortable: true },
          { key: 'nationality', label: 'Nationality', sortable: true }
        ]
      : [
          { key: 'eventName', label: 'Event Name', sortable: true },
          { key: 'eventDate', label: 'Start Date', sortable: true },
          { key: 'eventEndDate', label: 'End Date', sortable: true },
          { key: 'category', label: 'Category', sortable: true },
          { key: 'region', label: 'Region', sortable: true },
          { key: 'significance', label: 'Significance', sortable: true }
        ];

    // Render thead
    let headerHtml = '<tr>';
    columns.forEach(col => {
      const sortClass = this.sortColumn === col.key
        ? (this.sortDirection === 'asc' ? 'sort-asc' : 'sort-desc')
        : '';
      const arrow = this.sortColumn === col.key
        ? (this.sortDirection === 'asc' ? '\u25B2' : '\u25BC')
        : '\u25B2';
      if (col.sortable) {
        headerHtml += `<th class="sortable ${sortClass}" data-column="${col.key}">
          ${escapeHtml(col.label)}<span class="sort-arrow">${arrow}</span>
        </th>`;
      } else {
        headerHtml += `<th>${escapeHtml(col.label)}</th>`;
      }
    });
    headerHtml += '<th>Actions</th></tr>';
    thead.innerHTML = headerHtml;

    // Attach sort handlers
    thead.querySelectorAll('th.sortable').forEach(th => {
      th.addEventListener('click', () => this.handleSort(th.dataset.column));
    });

    // Render tbody
    if (this.filteredData.length === 0) {
      tbody.innerHTML = `<tr class="admin-empty"><td colspan="${columns.length + 1}">No records found</td></tr>`;
      return;
    }

    let bodyHtml = '';
    this.filteredData.forEach(item => {
      bodyHtml += '<tr>';
      columns.forEach(col => {
        if (col.key === 'groups') {
          const groups = item.groups || [];
          const badges = groups.map(g => {
            const color = this.getCategoryColor(g);
            return `<span class="admin-badge admin-badge-category" style="background:${color}">${escapeHtml(g)}</span>`;
          }).join(' ');
          bodyHtml += `<td>${badges || '<span style="color:var(--color-text-muted)">None</span>'}</td>`;
        } else if (col.key === 'region') {
          bodyHtml += `<td><span class="admin-badge admin-badge-region">${escapeHtml(item.region || '')}</span></td>`;
        } else if (col.key === 'category' && this.activeTab === 'events') {
          const color = this.getCategoryColor(item.category);
          bodyHtml += `<td><span class="admin-badge admin-badge-category" style="background:${color}">${escapeHtml(item.category || '')}</span></td>`;
        } else {
          bodyHtml += `<td>${escapeHtml(item[col.key] || '')}</td>`;
        }
      });
      bodyHtml += `<td class="admin-actions">
        <button class="admin-btn admin-btn-secondary admin-btn-sm btn-edit" data-id="${item.id}">Edit</button>
        <button class="admin-btn admin-btn-danger admin-btn-sm btn-delete" data-id="${item.id}">Delete</button>
      </td></tr>`;
    });
    tbody.innerHTML = bodyHtml;

    // Attach action handlers
    tbody.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', () => this.openEditModal(btn.dataset.id));
    });
    tbody.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', () => this.openDeleteConfirm(btn.dataset.id));
    });
  }

  // ---- CRUD ----

  async addRecord(data) {
    const collection = this.activeTab === 'figures' ? 'historicalFigures' : 'globalEvents';
    try {
      await this.db.collection(collection).add(data);
      this.showToast('Record added successfully!', 'success');
      await this.loadAll();
    } catch (error) {
      console.error('Error adding record:', error);
      this.showToast('Error adding record: ' + error.message, 'error');
    }
  }

  async updateRecord(docId, data) {
    const collection = this.activeTab === 'figures' ? 'historicalFigures' : 'globalEvents';
    try {
      await this.db.collection(collection).doc(docId).update(data);
      this.showToast('Record updated successfully!', 'success');
      await this.loadAll();
    } catch (error) {
      console.error('Error updating record:', error);
      this.showToast('Error updating record: ' + error.message, 'error');
    }
  }

  async deleteRecord(docId) {
    const collection = this.activeTab === 'figures' ? 'historicalFigures' : 'globalEvents';
    try {
      await this.db.collection(collection).doc(docId).delete();
      this.showToast('Record deleted successfully!', 'success');
      await this.loadAll();
    } catch (error) {
      console.error('Error deleting record:', error);
      this.showToast('Error deleting record: ' + error.message, 'error');
    }
  }

  // ---- Modals ----

  openAddModal() {
    if (this.activeTab === 'figures') {
      this.openFigureModal(null);
    } else {
      this.openEventModal(null);
    }
  }

  openEditModal(docId) {
    const data = this.activeTab === 'figures'
      ? this.figures.find(f => f.id === docId)
      : this.events.find(e => e.id === docId);
    if (!data) return;

    if (this.activeTab === 'figures') {
      this.openFigureModal(data);
    } else {
      this.openEventModal(data);
    }
  }

  openFigureModal(figure) {
    const isEdit = !!figure;
    const title = isEdit ? 'Edit Historical Figure' : 'Add Historical Figure';

    const categoryCheckboxes = this.categories.map(cat => {
      const id = 'modal-cat-' + cat.replace(/[^a-zA-Z]/g, '');
      const checked = figure && figure.groups && figure.groups.includes(cat) ? 'checked' : '';
      return `<div class="admin-checkbox-item">
        <input type="checkbox" id="${id}" name="figureCategory" value="${escapeHtml(cat)}" ${checked}>
        <label for="${id}">${escapeHtml(cat)}</label>
      </div>`;
    }).join('');

    const regionOptions = this.regions.map(r => {
      const selected = figure && figure.region === r ? 'selected' : '';
      return `<option value="${escapeHtml(r)}" ${selected}>${escapeHtml(r)}</option>`;
    }).join('');

    const html = `
      <div class="modal-overlay" id="admin-modal">
        <div class="modal-content" style="max-width: 44rem;">
          <div class="modal-header">
            <div class="modal-title-row">
              <h2 class="modal-title">${title}</h2>
              <button class="modal-close" id="modal-close-btn">&times;</button>
            </div>
          </div>
          <form id="admin-form">
            <div class="modal-body">
              <div class="admin-form-group">
                <label class="admin-form-label" for="field-name">Name (Lastname, Firstname)</label>
                <input class="admin-form-input" type="text" id="field-name" required
                  placeholder="e.g., Franklin, Benjamin"
                  value="${escapeHtml(figure ? figure.name : '')}">
              </div>

              <div class="admin-form-row">
                <div class="admin-form-group">
                  <label class="admin-form-label" for="field-dob">Date of Birth</label>
                  <input class="admin-form-input" type="date" id="field-dob" required
                    value="${escapeHtml(figure ? figure.dateOfBirth : '')}">
                </div>
                <div class="admin-form-group">
                  <label class="admin-form-label" for="field-dod">Date of Death</label>
                  <input class="admin-form-input" type="date" id="field-dod" required
                    value="${escapeHtml(figure ? figure.dateOfDeath : '')}">
                </div>
              </div>

              <div class="admin-form-group">
                <label class="admin-form-label">Categories</label>
                <div class="admin-checkbox-grid">${categoryCheckboxes}</div>
              </div>

              <div class="admin-form-row">
                <div class="admin-form-group">
                  <label class="admin-form-label" for="field-region">Region</label>
                  <select class="admin-form-select" id="field-region" required>
                    <option value="">-- Select Region --</option>
                    ${regionOptions}
                  </select>
                </div>
                <div class="admin-form-group">
                  <label class="admin-form-label" for="field-nationality">Nationality</label>
                  <input class="admin-form-input" type="text" id="field-nationality"
                    value="${escapeHtml(figure ? figure.nationality : '')}">
                </div>
              </div>

              <div class="admin-form-group">
                <label class="admin-form-label" for="field-description">Description</label>
                <textarea class="admin-form-textarea" id="field-description" rows="3"
                  placeholder="Brief description...">${escapeHtml(figure ? figure.description : '')}</textarea>
              </div>

              <div class="admin-form-group">
                <label class="admin-form-label" for="field-image">Image URL</label>
                <input class="admin-form-input" type="url" id="field-image"
                  placeholder="https://..."
                  value="${escapeHtml(figure ? (figure.imageURL || figure.imageUrl || '') : '')}">
              </div>

              <!-- Timeline Preview -->
              <div class="admin-form-group">
                <label class="admin-form-label">Timeline Preview</label>
                <div class="admin-preview-bar" id="timeline-preview">
                  <span class="preview-label preview-label-start" id="preview-start"></span>
                  <div class="preview-fill" id="preview-fill"></div>
                  <span class="preview-label preview-label-end" id="preview-end"></span>
                </div>
              </div>
            </div>
            <div class="admin-modal-footer">
              <button type="button" class="admin-btn admin-btn-secondary" id="modal-cancel-btn">Cancel</button>
              <button type="submit" class="admin-btn admin-btn-primary">${isEdit ? 'Save Changes' : 'Add Figure'}</button>
            </div>
          </form>
        </div>
      </div>`;

    document.getElementById('modal-container').innerHTML = html;
    this.attachModalListeners(isEdit ? figure.id : null, 'figures');
    this.setupTimelinePreview();
    this.updateTimelinePreview();
  }

  openEventModal(event) {
    const isEdit = !!event;
    const title = isEdit ? 'Edit Global Event' : 'Add Global Event';

    const categoryOptions = this.categories.map(cat => {
      const selected = event && event.category === cat ? 'selected' : '';
      return `<option value="${escapeHtml(cat)}" ${selected}>${escapeHtml(cat)}</option>`;
    }).join('');

    const regionOptions = this.regions.map(r => {
      const selected = event && event.region === r ? 'selected' : '';
      return `<option value="${escapeHtml(r)}" ${selected}>${escapeHtml(r)}</option>`;
    }).join('');

    const html = `
      <div class="modal-overlay" id="admin-modal">
        <div class="modal-content" style="max-width: 44rem;">
          <div class="modal-header">
            <div class="modal-title-row">
              <h2 class="modal-title">${title}</h2>
              <button class="modal-close" id="modal-close-btn">&times;</button>
            </div>
          </div>
          <form id="admin-form">
            <div class="modal-body">
              <div class="admin-form-group">
                <label class="admin-form-label" for="field-event-name">Event Name</label>
                <input class="admin-form-input" type="text" id="field-event-name" required
                  value="${escapeHtml(event ? event.eventName : '')}">
              </div>

              <div class="admin-form-row">
                <div class="admin-form-group">
                  <label class="admin-form-label" for="field-event-date">Start Date</label>
                  <input class="admin-form-input" type="date" id="field-event-date" required
                    value="${escapeHtml(event ? event.eventDate : '')}">
                </div>
                <div class="admin-form-group">
                  <label class="admin-form-label" for="field-event-end">End Date</label>
                  <input class="admin-form-input" type="date" id="field-event-end"
                    value="${escapeHtml(event ? event.eventEndDate : '')}">
                </div>
              </div>

              <div class="admin-form-row">
                <div class="admin-form-group">
                  <label class="admin-form-label" for="field-event-category">Category</label>
                  <select class="admin-form-select" id="field-event-category">
                    <option value="">-- Select Category --</option>
                    ${categoryOptions}
                  </select>
                </div>
                <div class="admin-form-group">
                  <label class="admin-form-label" for="field-event-region">Region</label>
                  <select class="admin-form-select" id="field-event-region">
                    <option value="">-- Select Region --</option>
                    ${regionOptions}
                  </select>
                </div>
              </div>

              <div class="admin-form-group">
                <label class="admin-form-label" for="field-event-description">Description</label>
                <textarea class="admin-form-textarea" id="field-event-description" rows="3"
                  placeholder="Event description...">${escapeHtml(event ? event.description : '')}</textarea>
              </div>

              <div class="admin-form-group">
                <label class="admin-form-label" for="field-event-significance">Significance</label>
                <input class="admin-form-input" type="text" id="field-event-significance"
                  value="${escapeHtml(event ? event.significance || '' : '')}">
              </div>
            </div>
            <div class="admin-modal-footer">
              <button type="button" class="admin-btn admin-btn-secondary" id="modal-cancel-btn">Cancel</button>
              <button type="submit" class="admin-btn admin-btn-primary">${isEdit ? 'Save Changes' : 'Add Event'}</button>
            </div>
          </form>
        </div>
      </div>`;

    document.getElementById('modal-container').innerHTML = html;
    this.attachModalListeners(isEdit ? event.id : null, 'events');
  }

  openDeleteConfirm(docId) {
    const data = this.activeTab === 'figures'
      ? this.figures.find(f => f.id === docId)
      : this.events.find(e => e.id === docId);
    const name = data ? (data.name || data.eventName || 'this record') : 'this record';

    const html = `
      <div class="modal-overlay" id="admin-modal">
        <div class="modal-content" style="max-width: 28rem;">
          <div class="admin-confirm-body">
            <div class="admin-confirm-icon">!</div>
            <div class="admin-confirm-title">Delete Record</div>
            <div class="admin-confirm-text">
              Are you sure you want to delete <strong>${escapeHtml(name)}</strong>?
              This action cannot be undone.
            </div>
            <div style="display:flex;gap:0.5rem;justify-content:center;">
              <button class="admin-btn admin-btn-secondary" id="modal-cancel-btn">Cancel</button>
              <button class="admin-btn admin-btn-danger" id="confirm-delete-btn">Delete</button>
            </div>
          </div>
        </div>
      </div>`;

    document.getElementById('modal-container').innerHTML = html;

    document.getElementById('modal-cancel-btn').addEventListener('click', () => this.closeModal());
    document.getElementById('confirm-delete-btn').addEventListener('click', async () => {
      this.closeModal();
      await this.deleteRecord(docId);
    });

    // Close on overlay click
    document.getElementById('admin-modal').addEventListener('click', (e) => {
      if (e.target.id === 'admin-modal') this.closeModal();
    });
  }

  attachModalListeners(docId, type) {
    // Close handlers
    document.getElementById('modal-close-btn').addEventListener('click', () => this.closeModal());
    document.getElementById('modal-cancel-btn').addEventListener('click', () => this.closeModal());
    // Escape key
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        this.closeModal();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);

    // Form submit
    document.getElementById('admin-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = type === 'figures' ? this.collectFigureFormData() : this.collectEventFormData();

      this.closeModal();
      if (docId) {
        await this.updateRecord(docId, data);
      } else {
        await this.addRecord(data);
      }
    });
  }

  collectFigureFormData() {
    const categoryCheckboxes = document.querySelectorAll('input[name="figureCategory"]:checked');
    const groupsArr = Array.from(categoryCheckboxes).map(cb => cb.value);

    return {
      name: document.getElementById('field-name').value.trim(),
      dateOfBirth: document.getElementById('field-dob').value,
      dateOfDeath: document.getElementById('field-dod').value,
      groups: groupsArr,
      region: document.getElementById('field-region').value,
      nationality: document.getElementById('field-nationality').value.trim(),
      description: document.getElementById('field-description').value.trim(),
      imageURL: document.getElementById('field-image').value.trim()
    };
  }

  collectEventFormData() {
    return {
      eventName: document.getElementById('field-event-name').value.trim(),
      eventDate: document.getElementById('field-event-date').value,
      eventEndDate: document.getElementById('field-event-end').value,
      category: document.getElementById('field-event-category').value,
      region: document.getElementById('field-event-region').value,
      description: document.getElementById('field-event-description').value.trim(),
      significance: document.getElementById('field-event-significance').value.trim()
    };
  }

  closeModal() {
    document.getElementById('modal-container').innerHTML = '';
  }

  // ---- Timeline Preview ----

  setupTimelinePreview() {
    const dobInput = document.getElementById('field-dob');
    const dodInput = document.getElementById('field-dod');
    const catCheckboxes = document.querySelectorAll('input[name="figureCategory"]');

    if (dobInput) dobInput.addEventListener('change', () => this.updateTimelinePreview());
    if (dodInput) dodInput.addEventListener('change', () => this.updateTimelinePreview());
    catCheckboxes.forEach(cb => {
      cb.addEventListener('change', () => this.updateTimelinePreview());
    });
  }

  updateTimelinePreview() {
    const dobInput = document.getElementById('field-dob');
    const dodInput = document.getElementById('field-dod');
    const fill = document.getElementById('preview-fill');
    const startLabel = document.getElementById('preview-start');
    const endLabel = document.getElementById('preview-end');

    if (!dobInput || !dodInput || !fill) return;

    const dob = dobInput.value;
    const dod = dodInput.value;

    if (!dob || !dod) {
      fill.style.width = '0';
      startLabel.textContent = '';
      endLabel.textContent = '';
      return;
    }

    const birthYear = new Date(dob).getFullYear();
    const deathYear = new Date(dod).getFullYear();

    // Use a fixed reference range for preview (1400-2025)
    const rangeStart = 1400;
    const rangeEnd = 2025;
    const rangeSpan = rangeEnd - rangeStart;

    const leftPct = Math.max(0, ((birthYear - rangeStart) / rangeSpan) * 100);
    const widthPct = Math.max(1, ((deathYear - birthYear) / rangeSpan) * 100);

    // Get color from first selected category
    const checkedCat = document.querySelector('input[name="figureCategory"]:checked');
    const color = checkedCat ? this.getCategoryColor(checkedCat.value) : '#6B7280';

    fill.style.left = leftPct + '%';
    fill.style.width = widthPct + '%';
    fill.style.background = color;

    startLabel.textContent = birthYear;
    endLabel.textContent = deathYear;
  }

  // ---- CSV Import/Export ----

  importCSV(file) {
    const type = this.activeTab;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        let count = 0;
        const collection = type === 'figures' ? 'historicalFigures' : 'globalEvents';

        for (const row of results.data) {
          try {
            if (type === 'figures') {
              const groupsArr = row.groups ? row.groups.split(',').map(s => s.trim()) : [];
              await this.db.collection(collection).add({
                name: row.name || '',
                dateOfBirth: row.dateOfBirth || '',
                dateOfDeath: row.dateOfDeath || '',
                description: row.description || '',
                groups: groupsArr,
                imageURL: row.imageURL || '',
                nationality: row.nationality || '',
                region: row.region || 'unknown'
              });
            } else {
              await this.db.collection(collection).add({
                eventName: row.eventName || '',
                eventDate: row.eventDate || '',
                eventEndDate: row.eventEndDate || '',
                description: row.description || '',
                category: row.category || '',
                region: row.region || '',
                significance: row.significance || '',
                createdOn: new Date().toISOString().slice(0, 10)
              });
            }
            count++;
          } catch (error) {
            console.error('Error importing row:', error);
          }
        }

        this.showToast(`Imported ${count} records successfully!`, 'success');
        await this.loadAll();
      },
      error: (err) => {
        console.error('Error parsing CSV:', err);
        this.showToast('Error parsing CSV file.', 'error');
      }
    });
  }

  exportCSV() {
    const data = this.filteredData;
    if (data.length === 0) {
      this.showToast('No data to export.', 'error');
      return;
    }

    let csvData;
    if (this.activeTab === 'figures') {
      csvData = data.map(item => ({
        name: item.name || '',
        dateOfBirth: item.dateOfBirth || '',
        dateOfDeath: item.dateOfDeath || '',
        nationality: item.nationality || '',
        description: item.description || '',
        region: item.region || '',
        groups: (item.groups || []).join(', '),
        imageURL: item.imageURL || item.imageUrl || ''
      }));
    } else {
      csvData = data.map(item => ({
        eventName: item.eventName || '',
        eventDate: item.eventDate || '',
        eventEndDate: item.eventEndDate || '',
        description: item.description || '',
        category: item.category || '',
        region: item.region || '',
        significance: item.significance || ''
      }));
    }

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${this.activeTab === 'figures' ? 'historical_figures' : 'global_events'}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    this.showToast('CSV exported successfully!', 'success');
  }

  // ---- Helpers ----

  getCategoryColor(category) {
    if (!category) return '#6B7280';
    return this.categoryColorMap[category.trim().toLowerCase()] || '#6B7280';
  }

  showToast(message, type = 'success') {
    const existing = document.querySelector('.admin-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `admin-toast admin-toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 3000);
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  new AdminManager();
});
