/**
 * CityGrinder Main Application
 *
 * Main entry point that initializes the city explorer interface.
 *
 * @package CityGrinder
 * @version 1.0.0
 */

(function(window, document, $) {
    'use strict';

    /**
     * Main CityGrinder Application Class
     */
    class CityGrinderApp {
        /**
         * Constructor
         * @param {HTMLElement} container - The main container element
         */
        constructor(container) {
            this.container = container;
            this.config = JSON.parse(container.dataset.config || '{}');

            // Components
            this.generator = null;
            this.renderer = null;
            this.explorer = null;

            // State
            this.currentCity = null;
            this.isDirty = false;

            // Elements
            this.canvas = container.querySelector('.citygrinder-canvas');
            this.loadingOverlay = container.querySelector('.citygrinder-loading');
            this.tooltip = container.querySelector('.cg-tooltip');

            this.init();
        }

        /**
         * Initialize the application
         */
        init() {
            this.bindEvents();
            this.initComponents();
            this.handleInitialLoad();
        }

        /**
         * Initialize sub-components
         */
        initComponents() {
            // Initialize generator (if available)
            if (typeof CityGenerator !== 'undefined') {
                this.generator = new CityGenerator();
            }

            // Initialize renderer (if available)
            if (typeof CityRenderer !== 'undefined' && this.canvas) {
                this.renderer = new CityRenderer(this.canvas);
            }

            // Initialize explorer (if available)
            if (typeof CityExplorer !== 'undefined') {
                this.explorer = new CityExplorer(this);
            }
        }

        /**
         * Bind event handlers
         */
        bindEvents() {
            // Toolbar actions
            this.container.addEventListener('click', (e) => {
                const action = e.target.closest('[data-action]');
                if (action) {
                    this.handleAction(action.dataset.action, action);
                }
            });

            // Layer toggles
            this.container.querySelectorAll('[name^="layer_"]').forEach(checkbox => {
                checkbox.addEventListener('change', (e) => {
                    this.handleLayerToggle(e.target.name.replace('layer_', ''), e.target.checked);
                });
            });

            // Form changes
            this.container.querySelectorAll('select, input').forEach(input => {
                input.addEventListener('change', () => {
                    this.isDirty = true;
                });
            });

            // Modal backdrop clicks
            document.querySelectorAll('.cg-modal__backdrop').forEach(backdrop => {
                backdrop.addEventListener('click', () => this.closeModals());
            });

            // Keyboard shortcuts
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.closeModals();
                }
            });
        }

        /**
         * Handle toolbar actions
         * @param {string} action - Action name
         * @param {HTMLElement} element - Clicked element
         */
        handleAction(action, element) {
            switch (action) {
                case 'generate':
                    this.generateCity();
                    break;

                case 'save':
                    this.openSaveModal();
                    break;

                case 'confirm-save':
                    this.saveCity();
                    break;

                case 'my-cities':
                    this.openLoadModal();
                    break;

                case 'export':
                    this.openExportModal();
                    break;

                case 'zoom-in':
                    this.renderer?.zoomIn();
                    break;

                case 'zoom-out':
                    this.renderer?.zoomOut();
                    break;

                case 'reset-view':
                    this.renderer?.resetView();
                    break;

                case 'close-modal':
                    this.closeModals();
                    break;

                case 'copy-share-url':
                    this.copyShareUrl();
                    break;

                case 'load-city':
                    const cityId = element.dataset.cityId;
                    if (cityId) {
                        this.loadCity(cityId);
                    }
                    break;

                case 'delete-city':
                    const deleteId = element.dataset.cityId;
                    if (deleteId && confirm(citygrinder_config.strings.delete_confirm)) {
                        this.deleteCity(deleteId);
                    }
                    break;
            }
        }

        /**
         * Handle initial page load
         */
        handleInitialLoad() {
            // Check for city_id in config or URL
            const urlParams = new URLSearchParams(window.location.search);
            const cityId = this.config.cityId || urlParams.get('city_id');
            const hexId = urlParams.get('hex_id');
            const shareToken = this.config.shareToken || urlParams.get('token');
            const seed = this.config.seed || urlParams.get('seed');

            if (cityId) {
                this.loadCity(cityId);
            } else if (shareToken) {
                this.loadSharedCity(shareToken);
            } else if (hexId) {
                this.loadOrGenerateFromHex(hexId);
            } else if (seed) {
                this.generateCity(seed);
            } else if (this.config.mode !== 'view') {
                // Auto-generate for generator mode
                this.generateCity();
            }
        }

        /**
         * Show loading overlay
         * @param {string} text - Loading text
         */
        showLoading(text = '') {
            if (this.loadingOverlay) {
                const textEl = this.loadingOverlay.querySelector('.loading-text');
                if (textEl && text) {
                    textEl.textContent = text;
                }
                this.loadingOverlay.style.display = 'flex';
            }
        }

        /**
         * Hide loading overlay
         */
        hideLoading() {
            if (this.loadingOverlay) {
                this.loadingOverlay.style.display = 'none';
            }
        }

        /**
         * Generate a new city
         * @param {string} seed - Optional seed
         */
        generateCity(seed = null) {
            this.showLoading(citygrinder_config.strings.generating);

            // Get generation parameters from form
            const cityType = this.container.querySelector('#cg-city-type')?.value ||
                           this.config.cityType ||
                           citygrinder_config.options.default_city_type;

            const sizeClass = this.container.querySelector('#cg-size-class')?.value ||
                            this.config.sizeClass ||
                            citygrinder_config.options.default_size_class;

            // Use provided seed or generate new
            const citySeed = seed || this.generateSeed();

            // Initialize generator with options
            if (this.generator) {
                this.generator = new CityGenerator({
                    seed: citySeed,
                    cityType: cityType,
                    sizeClass: sizeClass,
                    hasWalls: citygrinder_config.options.enable_walls,
                });

                // Generate city data
                this.currentCity = this.generator.generate();

                // Render the city
                if (this.renderer) {
                    this.renderer.setCity(this.currentCity);
                    this.renderer.render();
                }

                // Update UI
                this.updateCityInfo();
                this.updateDistrictList();
                this.updatePOIList();

                // Show save button
                const saveBtn = this.container.querySelector('[data-action="save"]');
                if (saveBtn) {
                    saveBtn.style.display = '';
                }

                this.isDirty = true;
            }

            this.hideLoading();
        }

        /**
         * Generate a random seed
         * @returns {string}
         */
        generateSeed() {
            return Math.random().toString(36).substring(2, 15) +
                   Math.random().toString(36).substring(2, 15);
        }

        /**
         * Update city info panel
         */
        updateCityInfo() {
            if (!this.currentCity) return;

            const city = this.currentCity;
            const fields = {
                'city_type': city.config?.cityType || '-',
                'size_class': city.config?.sizeClass || '-',
                'population': city.population?.toLocaleString() || '-',
                'district_count': city.districts?.length || '-',
                'seed': city.seed || '-',
            };

            Object.entries(fields).forEach(([field, value]) => {
                const el = this.container.querySelector(`[data-field="${field}"]`);
                if (el) {
                    el.textContent = value;
                }
            });

            // Update title
            const titleEl = this.container.querySelector('.city-name');
            if (titleEl && city.name) {
                titleEl.textContent = city.name;
            }
        }

        /**
         * Update district list in sidebar
         */
        updateDistrictList() {
            const list = this.container.querySelector('.district-list');
            if (!list || !this.currentCity?.districts) return;

            list.innerHTML = this.currentCity.districts.map((district, index) => `
                <li class="district-item" data-district-id="${index}">
                    <span class="district-color" data-type="${district.type}"></span>
                    <span class="district-name">${district.name}</span>
                    <span class="district-type">${district.type}</span>
                </li>
            `).join('');

            // Bind click handlers
            list.querySelectorAll('.district-item').forEach(item => {
                item.addEventListener('click', () => {
                    const id = parseInt(item.dataset.districtId);
                    this.focusDistrict(id);
                });
            });
        }

        /**
         * Update POI list in sidebar
         */
        updatePOIList() {
            const list = this.container.querySelector('.poi-list');
            if (!list || !this.currentCity?.pois) return;

            if (this.currentCity.pois.length === 0) {
                list.innerHTML = '<li class="poi-list-empty">No notable locations</li>';
                return;
            }

            list.innerHTML = this.currentCity.pois.map((poi, index) => `
                <li class="poi-item" data-poi-id="${index}">
                    <span class="poi-name">${poi.name}</span>
                </li>
            `).join('');

            // Bind click handlers
            list.querySelectorAll('.poi-item').forEach(item => {
                item.addEventListener('click', () => {
                    const id = parseInt(item.dataset.poiId);
                    this.focusPOI(id);
                });
            });
        }

        /**
         * Focus on a district
         * @param {number} districtId - District index
         */
        focusDistrict(districtId) {
            // Update active state in list
            this.container.querySelectorAll('.district-item').forEach((item, index) => {
                item.classList.toggle('active', index === districtId);
            });

            // Focus renderer on district
            if (this.renderer && this.currentCity?.districts[districtId]) {
                this.renderer.focusOnDistrict(districtId);
            }
        }

        /**
         * Focus on a POI
         * @param {number} poiId - POI index
         */
        focusPOI(poiId) {
            if (this.renderer && this.currentCity?.pois[poiId]) {
                this.renderer.focusOnPOI(poiId);
            }
        }

        /**
         * Handle layer toggle
         * @param {string} layer - Layer name
         * @param {boolean} visible - Visibility state
         */
        handleLayerToggle(layer, visible) {
            if (this.renderer) {
                this.renderer.setLayerVisibility(layer, visible);
            }
        }

        /**
         * Load a city by ID
         * @param {number} cityId - City ID
         */
        loadCity(cityId) {
            this.showLoading(citygrinder_config.strings.loading);

            $.ajax({
                url: citygrinder_config.ajax_url,
                method: 'POST',
                data: {
                    action: 'citygrinder_load',
                    nonce: citygrinder_config.nonce,
                    city_id: cityId,
                },
                success: (response) => {
                    if (response.success) {
                        this.setCity(response.data.city);
                        this.closeModals();
                    } else {
                        this.showError(response.data.message);
                    }
                },
                error: () => {
                    this.showError(citygrinder_config.strings.error);
                },
                complete: () => {
                    this.hideLoading();
                }
            });
        }

        /**
         * Load shared city by token
         * @param {string} token - Share token
         */
        loadSharedCity(token) {
            this.showLoading(citygrinder_config.strings.loading);

            $.ajax({
                url: citygrinder_config.ajax_url,
                method: 'POST',
                data: {
                    action: 'citygrinder_load',
                    nonce: citygrinder_config.nonce,
                    share_token: token,
                },
                success: (response) => {
                    if (response.success) {
                        this.setCity(response.data.city);
                    } else {
                        this.showError(response.data.message);
                    }
                },
                error: () => {
                    this.showError(citygrinder_config.strings.error);
                },
                complete: () => {
                    this.hideLoading();
                }
            });
        }

        /**
         * Set city data and render
         * @param {Object} cityData - City data from server
         */
        setCity(cityData) {
            // Regenerate from seed to get full city structure
            if (this.generator && cityData.seed) {
                this.generator = new CityGenerator({
                    seed: cityData.seed,
                    cityType: cityData.city_type,
                    sizeClass: cityData.size_class,
                    hasWalls: cityData.has_walls,
                    hasRiver: cityData.has_river,
                    isCoastal: cityData.is_coastal,
                });

                this.currentCity = this.generator.generate();
                this.currentCity.id = cityData.id;
                this.currentCity.name = cityData.name;

                // Render
                if (this.renderer) {
                    this.renderer.setCity(this.currentCity);
                    this.renderer.render();
                }

                // Update UI
                this.updateCityInfo();
                this.updateDistrictList();
                this.updatePOIList();
            }

            this.isDirty = false;
        }

        /**
         * Open save modal
         */
        openSaveModal() {
            const modal = document.getElementById('cg-modal-save');
            if (!modal || !this.currentCity) return;

            // Pre-fill form
            const nameInput = modal.querySelector('#cg-save-name');
            const typeSelect = modal.querySelector('#cg-save-type');
            const sizeSelect = modal.querySelector('#cg-save-size');
            const seedInput = modal.querySelector('#cg-save-seed');
            const idInput = modal.querySelector('#cg-save-id');

            if (nameInput) nameInput.value = this.currentCity.name || '';
            if (typeSelect) typeSelect.value = this.currentCity.config?.cityType || 'town';
            if (sizeSelect) sizeSelect.value = this.currentCity.config?.sizeClass || 'medium';
            if (seedInput) seedInput.value = this.currentCity.seed || '';
            if (idInput) idInput.value = this.currentCity.id || 0;

            modal.style.display = 'flex';
        }

        /**
         * Save city
         */
        saveCity() {
            if (!citygrinder_config.is_logged_in) {
                alert(citygrinder_config.strings.login_required);
                return;
            }

            const modal = document.getElementById('cg-modal-save');
            if (!modal) return;

            const data = {
                action: 'citygrinder_save',
                nonce: citygrinder_config.nonce,
                city_id: modal.querySelector('#cg-save-id')?.value || 0,
                name: modal.querySelector('#cg-save-name')?.value || 'Unnamed City',
                seed: modal.querySelector('#cg-save-seed')?.value || this.currentCity?.seed,
                city_type: modal.querySelector('#cg-save-type')?.value || 'town',
                size_class: modal.querySelector('#cg-save-size')?.value || 'medium',
                population: this.currentCity?.population || 0,
                has_walls: this.currentCity?.walls ? 1 : 0,
                city_data: this.currentCity,
            };

            this.showLoading(citygrinder_config.strings.saving);

            $.ajax({
                url: citygrinder_config.ajax_url,
                method: 'POST',
                data: data,
                success: (response) => {
                    if (response.success) {
                        this.currentCity.id = response.data.city_id;
                        this.currentCity.name = data.name;
                        this.isDirty = false;
                        this.closeModals();
                        this.updateCityInfo();
                    } else {
                        alert(response.data.message);
                    }
                },
                error: () => {
                    alert(citygrinder_config.strings.error);
                },
                complete: () => {
                    this.hideLoading();
                }
            });
        }

        /**
         * Open load modal
         */
        openLoadModal() {
            const modal = document.getElementById('cg-modal-load');
            if (!modal) return;

            modal.style.display = 'flex';
            this.loadCityList();
        }

        /**
         * Load city list
         */
        loadCityList() {
            const grid = document.getElementById('cg-cities-list');
            if (!grid) return;

            grid.innerHTML = `
                <div class="cg-loading">
                    <div class="loading-spinner"></div>
                    <div class="loading-text">${citygrinder_config.strings.loading}</div>
                </div>
            `;

            $.ajax({
                url: citygrinder_config.ajax_url,
                method: 'POST',
                data: {
                    action: 'citygrinder_list',
                    nonce: citygrinder_config.nonce,
                },
                success: (response) => {
                    if (response.success && response.data.cities.length > 0) {
                        grid.innerHTML = response.data.cities.map(city => `
                            <div class="city-card" data-action="load-city" data-city-id="${city.id}">
                                <div class="city-card__thumbnail">
                                    <div class="city-card__thumbnail-placeholder" data-seed="${city.seed}"></div>
                                </div>
                                <div class="city-card__content">
                                    <h3 class="city-card__title">${city.name}</h3>
                                    <div class="city-card__meta">
                                        <span class="city-card__type">${city.city_type}</span>
                                        <span class="city-card__population">${city.population.toLocaleString()} pop.</span>
                                    </div>
                                </div>
                            </div>
                        `).join('');
                    } else {
                        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">No saved cities yet.</p>';
                    }
                },
                error: () => {
                    grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center;">${citygrinder_config.strings.error}</p>`;
                }
            });
        }

        /**
         * Delete city
         * @param {number} cityId - City ID
         */
        deleteCity(cityId) {
            $.ajax({
                url: citygrinder_config.ajax_url,
                method: 'POST',
                data: {
                    action: 'citygrinder_delete',
                    nonce: citygrinder_config.nonce,
                    city_id: cityId,
                },
                success: (response) => {
                    if (response.success) {
                        this.loadCityList();
                    } else {
                        alert(response.data.message);
                    }
                }
            });
        }

        /**
         * Open export modal
         */
        openExportModal() {
            const modal = document.getElementById('cg-modal-export');
            if (modal) {
                modal.style.display = 'flex';
            }
        }

        /**
         * Close all modals
         */
        closeModals() {
            document.querySelectorAll('.cg-modal').forEach(modal => {
                modal.style.display = 'none';
            });
        }

        /**
         * Copy share URL to clipboard
         */
        copyShareUrl() {
            const input = document.getElementById('cg-share-url');
            if (input) {
                input.select();
                document.execCommand('copy');
            }
        }

        /**
         * Load or generate city from hex
         * @param {number} hexId - Hex ID
         */
        loadOrGenerateFromHex(hexId) {
            // This will be implemented in Phase 4 with HexGrinder integration
            console.log('Loading from hex:', hexId);
        }

        /**
         * Show error message
         * @param {string} message - Error message
         */
        showError(message) {
            alert(message);
            this.hideLoading();
        }
    }

    // Export to window
    window.CityGrinderApp = CityGrinderApp;

    // Auto-initialize on DOMContentLoaded
    document.addEventListener('DOMContentLoaded', function() {
        document.querySelectorAll('.citygrinder-container').forEach(container => {
            new CityGrinderApp(container);
        });
    });

})(window, document, jQuery);
