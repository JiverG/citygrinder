/**
 * CityGrinder - City Explorer
 *
 * Exploration interface for interacting with generated cities.
 * Provides detailed views, notes, and interactive exploration.
 *
 * @package CityGrinder
 * @version 1.0.0
 */

(function(window) {
    'use strict';

    /**
     * City Explorer Class
     * Provides interactive exploration of generated cities
     */
    class CityExplorer {
        /**
         * Constructor
         * @param {CityGrinderApp} app - Parent application instance
         */
        constructor(app) {
            this.app = app;
            this.container = app.container;
            this.tooltip = app.tooltip;

            // Selection state
            this.selectedDistrict = null;
            this.selectedBuilding = null;
            this.selectedPOI = null;

            // Hover state
            this.hoveredElement = null;

            // Notes system
            this.notes = new Map();
            this.editingNote = null;

            // Detail panel
            this.detailPanel = null;

            // Exploration history
            this.history = [];
            this.historyIndex = -1;

            this.init();
        }

        /**
         * Initialize explorer
         */
        init() {
            this.createDetailPanel();
            this.createNoteModal();
            this.bindEvents();
            this.loadNotes();
        }

        /**
         * Create the detail panel element
         */
        createDetailPanel() {
            const existing = this.container.querySelector('.citygrinder-detail-panel');
            if (existing) {
                this.detailPanel = existing;
                return;
            }

            const panel = document.createElement('div');
            panel.className = 'citygrinder-detail-panel';
            panel.innerHTML = `
                <div class="detail-panel-header">
                    <button type="button" class="detail-panel-back" title="Back" style="display: none;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M19 12H5M12 19l-7-7 7-7"/>
                        </svg>
                    </button>
                    <h3 class="detail-panel-title"></h3>
                    <button type="button" class="detail-panel-close" title="Close">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 6L6 18M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
                <div class="detail-panel-body"></div>
                <div class="detail-panel-footer"></div>
            `;

            this.container.appendChild(panel);
            this.detailPanel = panel;
        }

        /**
         * Create note editing modal
         */
        createNoteModal() {
            if (document.getElementById('citygrinder-note-modal')) {
                return;
            }

            const modal = document.createElement('div');
            modal.id = 'citygrinder-note-modal';
            modal.className = 'cg-modal';
            modal.style.display = 'none';
            modal.innerHTML = `
                <div class="cg-modal__backdrop"></div>
                <div class="cg-modal__content">
                    <div class="cg-modal__header">
                        <h3 class="cg-modal__title">Add Note</h3>
                        <button type="button" class="cg-modal__close">&times;</button>
                    </div>
                    <div class="cg-modal__body">
                        <div class="cg-form">
                            <div class="cg-form-group">
                                <label class="cg-label" for="note-title">Title</label>
                                <input type="text" id="note-title" class="cg-input" placeholder="Note title">
                            </div>
                            <div class="cg-form-group">
                                <label class="cg-label" for="note-content">Notes</label>
                                <textarea id="note-content" class="cg-textarea" rows="5" placeholder="Write your notes here..."></textarea>
                            </div>
                            <div class="cg-form-group">
                                <label class="cg-label" for="note-category">Category</label>
                                <select id="note-category" class="cg-select">
                                    <option value="general">General</option>
                                    <option value="quest">Quest</option>
                                    <option value="npc">NPC</option>
                                    <option value="treasure">Treasure</option>
                                    <option value="danger">Danger</option>
                                    <option value="custom">Custom</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div class="cg-modal__footer">
                        <button type="button" class="cg-btn note-delete-btn" style="display: none;">Delete</button>
                        <div style="flex: 1;"></div>
                        <button type="button" class="cg-btn note-cancel-btn">Cancel</button>
                        <button type="button" class="cg-btn cg-btn--primary note-save-btn">Save Note</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);
            this.noteModal = modal;
        }

        /**
         * Bind event handlers
         */
        bindEvents() {
            const self = this;

            // Canvas interaction for hover/click
            if (this.app.canvas) {
                this.app.canvas.addEventListener('mousemove', (e) => this.onCanvasMouseMove(e));
                this.app.canvas.addEventListener('click', (e) => this.onCanvasClick(e));
                this.app.canvas.addEventListener('dblclick', (e) => this.onCanvasDoubleClick(e));

                // Custom event from renderer
                this.app.canvas.addEventListener('elementSelected', (e) => {
                    this.onElementSelected(e.detail);
                });
            }

            // District list interaction
            this.container.addEventListener('click', (e) => {
                const districtItem = e.target.closest('.district-item');
                if (districtItem) {
                    this.selectDistrict(parseInt(districtItem.dataset.districtId));
                    return;
                }

                const poiItem = e.target.closest('.poi-item');
                if (poiItem) {
                    this.selectPOI(parseInt(poiItem.dataset.poiId));
                    return;
                }
            });

            // Detail panel events
            if (this.detailPanel) {
                this.detailPanel.querySelector('.detail-panel-close').addEventListener('click', () => {
                    this.closeDetailPanel();
                });

                this.detailPanel.querySelector('.detail-panel-back').addEventListener('click', () => {
                    this.goBack();
                });

                // Delegate clicks in panel body
                this.detailPanel.querySelector('.detail-panel-body').addEventListener('click', (e) => {
                    const addNoteBtn = e.target.closest('.add-note-btn');
                    if (addNoteBtn) {
                        this.openNoteModal();
                        return;
                    }

                    const editNoteBtn = e.target.closest('.edit-note-btn');
                    if (editNoteBtn) {
                        const noteId = editNoteBtn.dataset.noteId;
                        this.openNoteModal(noteId);
                        return;
                    }
                });
            }

            // Note modal events
            if (this.noteModal) {
                const closeBtn = this.noteModal.querySelector('.cg-modal__close');
                const backdrop = this.noteModal.querySelector('.cg-modal__backdrop');
                const cancelBtn = this.noteModal.querySelector('.note-cancel-btn');
                const saveBtn = this.noteModal.querySelector('.note-save-btn');
                const deleteBtn = this.noteModal.querySelector('.note-delete-btn');

                closeBtn.addEventListener('click', () => this.closeNoteModal());
                backdrop.addEventListener('click', () => this.closeNoteModal());
                cancelBtn.addEventListener('click', () => this.closeNoteModal());
                saveBtn.addEventListener('click', () => this.saveNote());
                deleteBtn.addEventListener('click', () => this.deleteNote());
            }

            // Keyboard shortcuts
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    if (this.noteModal && this.noteModal.style.display !== 'none') {
                        this.closeNoteModal();
                    } else if (this.detailPanel && this.detailPanel.classList.contains('open')) {
                        this.closeDetailPanel();
                    }
                }

                // Navigate with arrow keys when detail panel is open
                if (this.detailPanel && this.detailPanel.classList.contains('open')) {
                    if (e.key === 'ArrowLeft' && this.historyIndex > 0) {
                        this.goBack();
                    }
                }
            });
        }

        /**
         * Handle canvas mouse move for hover effects
         * @param {MouseEvent} e - Mouse event
         */
        onCanvasMouseMove(e) {
            if (!this.app.currentCity || !this.app.renderer) return;
            if (this.app.renderer.isDragging) return;

            const rect = this.app.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const element = this.app.renderer.getElementAt(x, y);

            if (element !== this.hoveredElement) {
                this.hoveredElement = element;

                if (element) {
                    this.showTooltip(e, element);
                } else {
                    this.hideTooltip();
                }
            } else if (element && this.tooltip) {
                this.updateTooltipPosition(e);
            }
        }

        /**
         * Handle canvas click for selection
         * @param {MouseEvent} e - Mouse event
         */
        onCanvasClick(e) {
            // Let renderer handle selection
        }

        /**
         * Handle canvas double-click
         * @param {MouseEvent} e - Mouse event
         */
        onCanvasDoubleClick(e) {
            // Renderer handles zoom/focus on double-click
        }

        /**
         * Handle element selected from renderer
         * @param {Object} element - Selected element
         */
        onElementSelected(element) {
            if (!element) {
                this.clearSelection();
                return;
            }

            switch (element.type) {
                case 'district':
                    this.selectDistrict(this.getDistrictIndex(element.data));
                    break;
                case 'building':
                    this.selectBuilding(this.getBuildingIndex(element.data));
                    break;
                case 'poi':
                    this.selectPOI(this.getPOIIndex(element.data));
                    break;
            }
        }

        /**
         * Get district index from data
         * @param {Object} district
         * @returns {number}
         */
        getDistrictIndex(district) {
            return this.app.currentCity.districts.findIndex(d => d === district);
        }

        /**
         * Get building index from data
         * @param {Object} building
         * @returns {number}
         */
        getBuildingIndex(building) {
            return this.app.currentCity.buildings.findIndex(b => b === building);
        }

        /**
         * Get POI index from data
         * @param {Object} poi
         * @returns {number}
         */
        getPOIIndex(poi) {
            return this.app.currentCity.pois.findIndex(p => p === poi);
        }

        /**
         * Select a district
         * @param {number} districtId - District index
         */
        selectDistrict(districtId) {
            this.pushHistory({ type: 'district', id: districtId });
            this.clearSelectionUI();
            this.selectedDistrict = districtId;

            // Update list UI
            this.container.querySelectorAll('.district-item').forEach((item, i) => {
                item.classList.toggle('active', i === districtId);
            });

            // Focus renderer
            if (this.app.renderer) {
                this.app.renderer.focusOnDistrict(districtId);
            }

            // Show district details
            this.showDistrictDetails(districtId);
        }

        /**
         * Select a building
         * @param {number} buildingId - Building index
         */
        selectBuilding(buildingId) {
            if (buildingId < 0) return;

            this.pushHistory({ type: 'building', id: buildingId });
            this.clearSelectionUI();
            this.selectedBuilding = buildingId;

            const building = this.app.currentCity.buildings[buildingId];
            if (building && this.app.renderer) {
                this.app.renderer.focusOnPoint(building.x, building.y);
                this.app.renderer.setZoom(2);
            }

            this.showBuildingDetails(buildingId);
        }

        /**
         * Select a POI
         * @param {number} poiId - POI index
         */
        selectPOI(poiId) {
            this.pushHistory({ type: 'poi', id: poiId });
            this.clearSelectionUI();
            this.selectedPOI = poiId;

            // Update list UI
            this.container.querySelectorAll('.poi-item').forEach((item, i) => {
                item.classList.toggle('active', i === poiId);
            });

            if (this.app.renderer) {
                this.app.renderer.focusOnPOI(poiId);
            }

            this.showPOIDetails(poiId);
        }

        /**
         * Push item to history
         * @param {Object} item
         */
        pushHistory(item) {
            this.history = this.history.slice(0, this.historyIndex + 1);
            this.history.push(item);
            this.historyIndex = this.history.length - 1;
            this.updateBackButton();
        }

        /**
         * Go back in history
         */
        goBack() {
            if (this.historyIndex <= 0) return;

            this.historyIndex--;
            const item = this.history[this.historyIndex];

            switch (item.type) {
                case 'district':
                    this.selectedDistrict = item.id;
                    this.showDistrictDetails(item.id);
                    break;
                case 'building':
                    this.selectedBuilding = item.id;
                    this.showBuildingDetails(item.id);
                    break;
                case 'poi':
                    this.selectedPOI = item.id;
                    this.showPOIDetails(item.id);
                    break;
            }

            this.updateBackButton();
        }

        /**
         * Update back button visibility
         */
        updateBackButton() {
            if (!this.detailPanel) return;
            const backBtn = this.detailPanel.querySelector('.detail-panel-back');
            backBtn.style.display = this.historyIndex > 0 ? '' : 'none';
        }

        /**
         * Clear selection UI
         */
        clearSelectionUI() {
            this.container.querySelectorAll('.district-item.active, .poi-item.active').forEach(item => {
                item.classList.remove('active');
            });
        }

        /**
         * Clear all selections
         */
        clearSelection() {
            this.selectedDistrict = null;
            this.selectedBuilding = null;
            this.selectedPOI = null;
            this.clearSelectionUI();
            this.closeDetailPanel();
        }

        /**
         * Show district details
         * @param {number} districtId - District index
         */
        showDistrictDetails(districtId) {
            const district = this.app.currentCity.districts[districtId];
            if (!district) return;

            const notes = this.getNotesForElement('district', districtId);
            const buildings = this.app.currentCity.buildings.filter(b => b.districtId === districtId);
            const pois = this.app.currentCity.pois.filter(p => {
                // Check if POI is in this district
                return this.isPointInDistrict(p.x, p.y, district);
            });

            const districtColor = this.getDistrictColor(district.type);

            const html = `
                <div class="detail-section">
                    <div class="detail-type-badge" style="background: ${districtColor};">
                        ${this.capitalize(district.type)} District
                    </div>
                    <dl class="detail-info-list">
                        <dt>Buildings</dt>
                        <dd>${buildings.length}</dd>
                        <dt>Points of Interest</dt>
                        <dd>${pois.length}</dd>
                    </dl>
                </div>

                ${pois.length > 0 ? `
                <div class="detail-section">
                    <h4 class="detail-section-title">Points of Interest</h4>
                    <ul class="detail-poi-list">
                        ${pois.map((poi, i) => `
                            <li class="detail-poi-item" data-poi-index="${this.getPOIIndex(poi)}">
                                <span class="poi-icon">${this.getPOIIcon(poi.type)}</span>
                                <span class="poi-name">${poi.name}</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
                ` : ''}

                <div class="detail-section">
                    <h4 class="detail-section-title">
                        Notes
                        <button type="button" class="cg-btn cg-btn--sm add-note-btn">+ Add</button>
                    </h4>
                    ${notes.length > 0 ? `
                        <ul class="detail-notes-list">
                            ${notes.map(note => this.renderNoteItem(note)).join('')}
                        </ul>
                    ` : `
                        <p class="detail-empty">No notes yet. Click "Add" to create one.</p>
                    `}
                </div>
            `;

            this.openDetailPanel(district.name, html);
        }

        /**
         * Show building details
         * @param {number} buildingId - Building index
         */
        showBuildingDetails(buildingId) {
            const building = this.app.currentCity.buildings[buildingId];
            if (!building) return;

            const district = this.app.currentCity.districts[building.districtId];
            const notes = this.getNotesForElement('building', buildingId);
            const buildingName = building.name || this.formatBuildingType(building.type);

            const html = `
                <div class="detail-section">
                    <div class="detail-type-badge detail-type-badge--building">
                        ${this.capitalize(building.type)}
                    </div>
                    <dl class="detail-info-list">
                        <dt>District</dt>
                        <dd class="clickable" data-district-id="${building.districtId}">
                            ${district ? district.name : 'Unknown'}
                        </dd>
                        <dt>Size</dt>
                        <dd>${Math.round(building.width)} x ${Math.round(building.height)}</dd>
                    </dl>
                </div>

                <div class="detail-section">
                    <h4 class="detail-section-title">
                        Notes
                        <button type="button" class="cg-btn cg-btn--sm add-note-btn">+ Add</button>
                    </h4>
                    ${notes.length > 0 ? `
                        <ul class="detail-notes-list">
                            ${notes.map(note => this.renderNoteItem(note)).join('')}
                        </ul>
                    ` : `
                        <p class="detail-empty">No notes yet. Click "Add" to create one.</p>
                    `}
                </div>
            `;

            this.openDetailPanel(buildingName, html);
        }

        /**
         * Show POI details
         * @param {number} poiId - POI index
         */
        showPOIDetails(poiId) {
            const poi = this.app.currentCity.pois[poiId];
            if (!poi) return;

            const notes = this.getNotesForElement('poi', poiId);

            const html = `
                <div class="detail-section">
                    <div class="detail-type-badge detail-type-badge--poi">
                        ${this.getPOIIcon(poi.type)} ${this.capitalize(poi.type)}
                    </div>
                    ${poi.description ? `
                        <p class="detail-description">${poi.description}</p>
                    ` : ''}
                    <dl class="detail-info-list">
                        <dt>Importance</dt>
                        <dd>${this.capitalize(poi.importance || 'minor')}</dd>
                    </dl>
                </div>

                <div class="detail-section">
                    <h4 class="detail-section-title">
                        Notes
                        <button type="button" class="cg-btn cg-btn--sm add-note-btn">+ Add</button>
                    </h4>
                    ${notes.length > 0 ? `
                        <ul class="detail-notes-list">
                            ${notes.map(note => this.renderNoteItem(note)).join('')}
                        </ul>
                    ` : `
                        <p class="detail-empty">No notes yet. Click "Add" to create one.</p>
                    `}
                </div>
            `;

            this.openDetailPanel(poi.name, html);
        }

        /**
         * Render a note item
         * @param {Object} note
         * @returns {string}
         */
        renderNoteItem(note) {
            return `
                <li class="detail-note-item" data-note-id="${note.id}">
                    <div class="note-header">
                        <span class="note-category note-category--${note.category}">${note.category}</span>
                        <span class="note-title">${note.title}</span>
                        <button type="button" class="edit-note-btn" data-note-id="${note.id}" title="Edit">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                        </button>
                    </div>
                    <div class="note-content">${note.content}</div>
                </li>
            `;
        }

        /**
         * Open detail panel
         * @param {string} title
         * @param {string} html
         */
        openDetailPanel(title, html) {
            if (!this.detailPanel) return;

            this.detailPanel.querySelector('.detail-panel-title').textContent = title;
            this.detailPanel.querySelector('.detail-panel-body').innerHTML = html;
            this.detailPanel.classList.add('open');
            this.updateBackButton();

            // Bind clickable elements
            this.detailPanel.querySelectorAll('[data-district-id]').forEach(el => {
                el.addEventListener('click', () => {
                    this.selectDistrict(parseInt(el.dataset.districtId));
                });
            });

            this.detailPanel.querySelectorAll('[data-poi-index]').forEach(el => {
                el.addEventListener('click', () => {
                    this.selectPOI(parseInt(el.dataset.poiIndex));
                });
            });
        }

        /**
         * Close detail panel
         */
        closeDetailPanel() {
            if (this.detailPanel) {
                this.detailPanel.classList.remove('open');
            }
            this.history = [];
            this.historyIndex = -1;
        }

        /**
         * Check if point is in district
         * @param {number} x
         * @param {number} y
         * @param {Object} district
         * @returns {boolean}
         */
        isPointInDistrict(x, y, district) {
            if (!district.polygon) return false;
            return this.pointInPolygon(x, y, district.polygon);
        }

        /**
         * Point in polygon test
         * @param {number} x - Point X
         * @param {number} y - Point Y
         * @param {Array} polygon - Polygon points
         * @returns {boolean}
         */
        pointInPolygon(x, y, polygon) {
            if (!polygon || polygon.length < 3) return false;

            let inside = false;
            const n = polygon.length;

            for (let i = 0, j = n - 1; i < n; j = i++) {
                const xi = polygon[i].x, yi = polygon[i].y;
                const xj = polygon[j].x, yj = polygon[j].y;

                if (((yi > y) !== (yj > y)) &&
                    (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
                    inside = !inside;
                }
            }

            return inside;
        }

        // =====================================================================
        // NOTES SYSTEM
        // =====================================================================

        /**
         * Load notes from storage
         */
        loadNotes() {
            if (!this.app.currentCity) return;

            const seed = this.app.currentCity.seed;
            const stored = localStorage.getItem(`citygrinder_notes_${seed}`);

            if (stored) {
                try {
                    const data = JSON.parse(stored);
                    this.notes = new Map(data);
                } catch (e) {
                    console.error('Failed to load notes:', e);
                }
            }
        }

        /**
         * Save notes to storage
         */
        saveNotesToStorage() {
            if (!this.app.currentCity) return;

            const seed = this.app.currentCity.seed;
            const data = Array.from(this.notes.entries());
            localStorage.setItem(`citygrinder_notes_${seed}`, JSON.stringify(data));
        }

        /**
         * Get notes for an element
         * @param {string} type
         * @param {number} id
         * @returns {Array}
         */
        getNotesForElement(type, id) {
            const key = `${type}_${id}`;
            return this.notes.get(key) || [];
        }

        /**
         * Get current element key
         * @returns {string|null}
         */
        getCurrentElementKey() {
            if (this.selectedDistrict !== null) {
                return `district_${this.selectedDistrict}`;
            }
            if (this.selectedBuilding !== null) {
                return `building_${this.selectedBuilding}`;
            }
            if (this.selectedPOI !== null) {
                return `poi_${this.selectedPOI}`;
            }
            return null;
        }

        /**
         * Open note modal
         * @param {string|null} noteId - Existing note ID to edit
         */
        openNoteModal(noteId = null) {
            if (!this.noteModal) return;

            const elementKey = this.getCurrentElementKey();
            if (!elementKey && !noteId) return;

            const titleInput = this.noteModal.querySelector('#note-title');
            const contentInput = this.noteModal.querySelector('#note-content');
            const categorySelect = this.noteModal.querySelector('#note-category');
            const deleteBtn = this.noteModal.querySelector('.note-delete-btn');
            const modalTitle = this.noteModal.querySelector('.cg-modal__title');

            if (noteId) {
                // Editing existing note
                const notes = this.notes.get(elementKey) || [];
                const note = notes.find(n => n.id === noteId);

                if (note) {
                    titleInput.value = note.title;
                    contentInput.value = note.content;
                    categorySelect.value = note.category;
                    deleteBtn.style.display = '';
                    modalTitle.textContent = 'Edit Note';
                    this.editingNote = { key: elementKey, id: noteId };
                }
            } else {
                // New note
                titleInput.value = '';
                contentInput.value = '';
                categorySelect.value = 'general';
                deleteBtn.style.display = 'none';
                modalTitle.textContent = 'Add Note';
                this.editingNote = { key: elementKey, id: null };
            }

            this.noteModal.style.display = 'flex';
            titleInput.focus();
        }

        /**
         * Close note modal
         */
        closeNoteModal() {
            if (this.noteModal) {
                this.noteModal.style.display = 'none';
            }
            this.editingNote = null;
        }

        /**
         * Save current note
         */
        saveNote() {
            if (!this.editingNote) return;

            const titleInput = this.noteModal.querySelector('#note-title');
            const contentInput = this.noteModal.querySelector('#note-content');
            const categorySelect = this.noteModal.querySelector('#note-category');

            const title = titleInput.value.trim();
            const content = contentInput.value.trim();
            const category = categorySelect.value;

            if (!title) {
                titleInput.focus();
                return;
            }

            const key = this.editingNote.key;
            let notes = this.notes.get(key) || [];

            if (this.editingNote.id) {
                // Update existing
                const index = notes.findIndex(n => n.id === this.editingNote.id);
                if (index >= 0) {
                    notes[index] = { ...notes[index], title, content, category, updated: Date.now() };
                }
            } else {
                // Create new
                notes.push({
                    id: `note_${Date.now()}`,
                    title,
                    content,
                    category,
                    created: Date.now(),
                    updated: Date.now()
                });
            }

            this.notes.set(key, notes);
            this.saveNotesToStorage();
            this.closeNoteModal();

            // Refresh current view
            this.refreshCurrentView();
        }

        /**
         * Delete current note
         */
        deleteNote() {
            if (!this.editingNote || !this.editingNote.id) return;

            if (!confirm('Delete this note?')) return;

            const key = this.editingNote.key;
            let notes = this.notes.get(key) || [];
            notes = notes.filter(n => n.id !== this.editingNote.id);

            if (notes.length > 0) {
                this.notes.set(key, notes);
            } else {
                this.notes.delete(key);
            }

            this.saveNotesToStorage();
            this.closeNoteModal();
            this.refreshCurrentView();
        }

        /**
         * Refresh current detail view
         */
        refreshCurrentView() {
            if (this.selectedDistrict !== null) {
                this.showDistrictDetails(this.selectedDistrict);
            } else if (this.selectedBuilding !== null) {
                this.showBuildingDetails(this.selectedBuilding);
            } else if (this.selectedPOI !== null) {
                this.showPOIDetails(this.selectedPOI);
            }
        }

        // =====================================================================
        // TOOLTIP
        // =====================================================================

        /**
         * Show tooltip
         * @param {MouseEvent} e - Mouse event
         * @param {Object} element - Hovered element
         */
        showTooltip(e, element) {
            if (!this.tooltip) return;

            const titleEl = this.tooltip.querySelector('.cg-tooltip__title');
            const contentEl = this.tooltip.querySelector('.cg-tooltip__content');

            switch (element.type) {
                case 'district':
                    titleEl.textContent = element.data.name;
                    contentEl.textContent = `${this.capitalize(element.data.type)} District`;
                    break;
                case 'building':
                    titleEl.textContent = element.data.name || this.formatBuildingType(element.data.type);
                    contentEl.textContent = `In ${this.getDistrictName(element.data.districtId)}`;
                    break;
                case 'poi':
                    titleEl.textContent = element.data.name;
                    contentEl.textContent = element.data.description || this.capitalize(element.data.type);
                    break;
            }

            this.tooltip.style.display = 'block';
            this.updateTooltipPosition(e);
        }

        /**
         * Update tooltip position
         * @param {MouseEvent} e - Mouse event
         */
        updateTooltipPosition(e) {
            if (!this.tooltip) return;

            const offset = 15;
            let x = e.clientX + offset;
            let y = e.clientY + offset;

            // Keep tooltip in viewport
            const rect = this.tooltip.getBoundingClientRect();
            if (x + rect.width > window.innerWidth) {
                x = e.clientX - rect.width - offset;
            }
            if (y + rect.height > window.innerHeight) {
                y = e.clientY - rect.height - offset;
            }

            this.tooltip.style.left = x + 'px';
            this.tooltip.style.top = y + 'px';
        }

        /**
         * Hide tooltip
         */
        hideTooltip() {
            if (this.tooltip) {
                this.tooltip.style.display = 'none';
            }
        }

        // =====================================================================
        // UTILITY METHODS
        // =====================================================================

        /**
         * Format building type for display
         * @param {string} type - Building type
         * @returns {string}
         */
        formatBuildingType(type) {
            return type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ');
        }

        /**
         * Capitalize string
         * @param {string} str
         * @returns {string}
         */
        capitalize(str) {
            return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
        }

        /**
         * Get district name by ID
         * @param {number} districtId - District index
         * @returns {string}
         */
        getDistrictName(districtId) {
            const district = this.app.currentCity?.districts?.[districtId];
            return district?.name || 'Unknown';
        }

        /**
         * Get district color
         * @param {string} type
         * @returns {string}
         */
        getDistrictColor(type) {
            const colors = {
                market: '#f6e05e',
                residential: '#68d391',
                noble: '#9f7aea',
                craftsmen: '#fc8181',
                temple: '#90cdf4',
                docks: '#63b3ed',
                slums: '#a0aec0',
                military: '#f687b3'
            };
            return colors[type] || colors.residential;
        }

        /**
         * Get POI icon
         * @param {string} type
         * @returns {string}
         */
        getPOIIcon(type) {
            const icons = {
                landmark: '★',
                market: '◆',
                temple: '✦',
                guild_hall: '⚒',
                tavern: '⚑',
                gate: '⌂',
                well: '○',
                fountain: '◇'
            };
            return icons[type] || '•';
        }
    }

    // Export
    window.CityExplorer = CityExplorer;

})(window);
