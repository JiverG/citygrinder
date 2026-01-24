/**
 * CityGrinder - HexGrinder Integration
 *
 * Handles integration between CityGrinder and the HexGrinder hex map system.
 * Enables clicking on settlement hexes to enter/explore cities.
 *
 * @package CityGrinder
 * @version 1.0.0
 */

(function($) {
    'use strict';

    /**
     * HexGrinder Integration Class
     */
    class HexGrinderIntegration {
        constructor() {
            this.config = window.citygrinder_hexgrinder || {};
            this.settlementTypes = this.config.settlement_types || [];
            this.strings = this.config.strings || {};
            this.activeHex = null;
            this.cityModal = null;

            this.init();
        }

        /**
         * Initialize integration
         */
        init() {
            this.bindEvents();
            this.createCityModal();
            this.injectSettlementMarkers();
        }

        /**
         * Bind event handlers
         */
        bindEvents() {
            const self = this;

            // Listen for hex click events from HexGrinder
            $(document).on('hexgrinder:hex:click', function(e, hexData) {
                self.handleHexClick(hexData);
            });

            // Listen for hex hover events
            $(document).on('hexgrinder:hex:hover', function(e, hexData) {
                self.handleHexHover(hexData);
            });

            // Handle "Enter Settlement" button clicks
            $(document).on('click', '[data-action="enter-settlement"]', function(e) {
                e.preventDefault();
                const $btn = $(this);
                self.enterSettlement({
                    hexId: $btn.data('hex-id'),
                    hexX: $btn.data('hex-x'),
                    hexY: $btn.data('hex-y'),
                    terrain: $btn.data('terrain')
                });
            });

            // Handle city modal close
            $(document).on('click', '.citygrinder-modal-close, .citygrinder-modal-overlay', function(e) {
                if (e.target === this) {
                    self.closeCityModal();
                }
            });

            // Handle modal actions
            $(document).on('click', '.citygrinder-modal-action', function(e) {
                e.preventDefault();
                const action = $(this).data('action');
                self.handleModalAction(action);
            });

            // Keyboard events
            $(document).on('keydown', function(e) {
                if (e.key === 'Escape' && self.cityModal) {
                    self.closeCityModal();
                }
            });

            // Integration with HexGrinder's panel system
            $(document).on('hexgrinder:panel:rendered', function(e, panelData) {
                self.enhanceHexPanel(panelData);
            });
        }

        /**
         * Handle hex click
         * @param {Object} hexData - Data about the clicked hex
         */
        handleHexClick(hexData) {
            if (!this.isSettlementHex(hexData)) {
                return;
            }

            this.activeHex = hexData;
            this.checkHexCity(hexData);
        }

        /**
         * Handle hex hover
         * @param {Object} hexData - Data about the hovered hex
         */
        handleHexHover(hexData) {
            if (!this.isSettlementHex(hexData)) {
                return;
            }

            // Could add preview functionality here
        }

        /**
         * Check if hex has an existing city
         * @param {Object} hexData - Hex data
         */
        checkHexCity(hexData) {
            const self = this;

            $.ajax({
                url: this.config.ajax_url,
                type: 'POST',
                data: {
                    action: 'citygrinder_check_hex_city',
                    nonce: this.config.nonce,
                    hex_id: hexData.id
                },
                success: function(response) {
                    if (response.success) {
                        if (response.data.has_city) {
                            self.showCityModal('existing', response.data.city, hexData);
                        } else {
                            self.showCityModal('new', null, hexData);
                        }
                    }
                },
                error: function(xhr, status, error) {
                    console.error('CityGrinder: Failed to check hex city', error);
                }
            });
        }

        /**
         * Enter settlement (generate or load city)
         * @param {Object} hexInfo - Information about the hex
         */
        enterSettlement(hexInfo) {
            const self = this;

            $.ajax({
                url: this.config.ajax_url,
                type: 'POST',
                data: {
                    action: 'citygrinder_from_hex',
                    nonce: this.config.nonce,
                    hex_id: hexInfo.hexId,
                    hex_x: hexInfo.hexX,
                    hex_y: hexInfo.hexY,
                    terrain: hexInfo.terrain
                },
                beforeSend: function() {
                    self.showLoading();
                },
                success: function(response) {
                    if (response.success) {
                        if (response.data.action === 'load') {
                            // City exists, redirect to explorer
                            window.location.href = response.data.redirect_url;
                        } else if (response.data.action === 'generate') {
                            // Generate new city, redirect with params
                            window.location.href = response.data.redirect_url;
                        }
                    } else {
                        self.hideLoading();
                        self.showError(response.data.message || 'Failed to enter settlement');
                    }
                },
                error: function(xhr, status, error) {
                    self.hideLoading();
                    self.showError('Network error. Please try again.');
                    console.error('CityGrinder: Failed to enter settlement', error);
                }
            });
        }

        /**
         * Check if hex is a settlement type
         * @param {Object} hexData - Hex data
         * @returns {boolean}
         */
        isSettlementHex(hexData) {
            const terrain = hexData.terrain || hexData.type || '';

            if (this.settlementTypes.includes(terrain)) {
                return true;
            }

            // Check features array
            const features = hexData.features || [];
            for (const feature of features) {
                if (this.settlementTypes.includes(feature)) {
                    return true;
                }
            }

            return false;
        }

        /**
         * Create the city modal element
         */
        createCityModal() {
            if ($('#citygrinder-hex-modal').length) {
                return;
            }

            const modalHtml = `
                <div id="citygrinder-hex-modal" class="citygrinder-modal" style="display: none;">
                    <div class="citygrinder-modal-overlay"></div>
                    <div class="citygrinder-modal-container">
                        <button type="button" class="citygrinder-modal-close">&times;</button>
                        <div class="citygrinder-modal-header">
                            <h2 class="citygrinder-modal-title"></h2>
                            <div class="citygrinder-modal-subtitle"></div>
                        </div>
                        <div class="citygrinder-modal-body">
                            <div class="citygrinder-modal-preview">
                                <canvas id="citygrinder-modal-canvas"></canvas>
                            </div>
                            <div class="citygrinder-modal-info"></div>
                        </div>
                        <div class="citygrinder-modal-footer">
                            <button type="button" class="cg-btn citygrinder-modal-action" data-action="cancel">
                                Cancel
                            </button>
                            <button type="button" class="cg-btn cg-btn--primary citygrinder-modal-action" data-action="enter">
                                Enter Settlement
                            </button>
                        </div>
                    </div>
                </div>
            `;

            $('body').append(modalHtml);
            this.cityModal = $('#citygrinder-hex-modal');
        }

        /**
         * Show city modal
         * @param {string} mode - 'existing' or 'new'
         * @param {Object|null} cityData - Existing city data
         * @param {Object} hexData - Hex data
         */
        showCityModal(mode, cityData, hexData) {
            if (!this.cityModal) {
                this.createCityModal();
            }

            const $modal = this.cityModal;
            const terrain = hexData.terrain || hexData.type || 'settlement';
            const terrainLabel = terrain.charAt(0).toUpperCase() + terrain.slice(1);

            if (mode === 'existing' && cityData) {
                // Show existing city info
                $modal.find('.citygrinder-modal-title').text(cityData.city_name);
                $modal.find('.citygrinder-modal-subtitle').text(`${terrainLabel} - Pop. ${this.formatNumber(cityData.population)}`);
                $modal.find('.citygrinder-modal-action[data-action="enter"]').text(this.strings.view_city || 'View City');

                // Show city preview
                this.renderCityPreview(cityData);

                // Show city info
                $modal.find('.citygrinder-modal-info').html(`
                    <dl class="citygrinder-info-list">
                        <dt>Type</dt>
                        <dd>${this.capitalizeFirst(cityData.city_type)}</dd>
                        <dt>Population</dt>
                        <dd>${this.formatNumber(cityData.population)}</dd>
                    </dl>
                `);

                $modal.attr('data-mode', 'existing');
                $modal.attr('data-city-id', cityData.city_id);
            } else {
                // Show new city prompt
                $modal.find('.citygrinder-modal-title').text(terrainLabel);
                $modal.find('.citygrinder-modal-subtitle').text('Unexplored Settlement');
                $modal.find('.citygrinder-modal-action[data-action="enter"]').text(this.strings.enter_settlement || 'Enter Settlement');

                // Hide preview for new cities
                $modal.find('.citygrinder-modal-preview').hide();

                // Show prompt
                $modal.find('.citygrinder-modal-info').html(`
                    <p class="citygrinder-prompt">
                        This settlement has not been explored yet.
                        Enter to generate and explore its streets and buildings.
                    </p>
                `);

                $modal.attr('data-mode', 'new');
                $modal.removeAttr('data-city-id');
            }

            // Store hex data
            $modal.data('hex', hexData);

            // Show modal
            $modal.fadeIn(200);
            $('body').addClass('citygrinder-modal-open');
        }

        /**
         * Close city modal
         */
        closeCityModal() {
            if (this.cityModal) {
                this.cityModal.fadeOut(200, function() {
                    $('body').removeClass('citygrinder-modal-open');
                });
            }
        }

        /**
         * Handle modal action
         * @param {string} action - Action name
         */
        handleModalAction(action) {
            const $modal = this.cityModal;
            const mode = $modal.attr('data-mode');
            const hexData = $modal.data('hex');

            switch (action) {
                case 'enter':
                    if (mode === 'existing') {
                        const cityId = $modal.attr('data-city-id');
                        window.location.href = `${this.config.explorer_url}?city_id=${cityId}`;
                    } else {
                        this.enterSettlement({
                            hexId: hexData.id,
                            hexX: hexData.x,
                            hexY: hexData.y,
                            terrain: hexData.terrain || hexData.type
                        });
                    }
                    break;

                case 'cancel':
                    this.closeCityModal();
                    break;
            }
        }

        /**
         * Render city preview in modal
         * @param {Object} cityData - City data
         */
        renderCityPreview(cityData) {
            const $modal = this.cityModal;
            const $preview = $modal.find('.citygrinder-modal-preview');
            const $canvas = $modal.find('#citygrinder-modal-canvas');

            if (!window.CityGenerator || !window.CityRenderer) {
                $preview.hide();
                return;
            }

            $preview.show();

            // Set canvas size
            $canvas.attr({
                width: 300,
                height: 200
            });

            // Generate and render preview
            try {
                const generator = new CityGenerator({
                    seed: cityData.seed,
                    cityType: cityData.city_type,
                    sizeClass: 'town' // Use smaller size for preview
                });

                const city = generator.generate();
                const renderer = new CityRenderer($canvas[0]);
                renderer.setCity(city);
            } catch (error) {
                console.error('CityGrinder: Failed to render preview', error);
                $preview.hide();
            }
        }

        /**
         * Enhance HexGrinder panel with city info
         * @param {Object} panelData - Panel data from HexGrinder
         */
        enhanceHexPanel(panelData) {
            if (!panelData || !this.isSettlementHex(panelData.hex)) {
                return;
            }

            // The PHP side handles adding the button, but we can enhance it here
            const $panel = $(panelData.element);
            const $citySection = $panel.find('.citygrinder-hex-action');

            if ($citySection.length) {
                $citySection.addClass('citygrinder-enhanced');
            }
        }

        /**
         * Inject settlement markers on hex map
         */
        injectSettlementMarkers() {
            // This would add visual indicators on the hex map for cities
            // Implementation depends on HexGrinder's marker system

            $(document).on('hexgrinder:map:rendered', function(e, mapData) {
                // Add city markers for hexes with existing cities
                // This would require fetching city data for visible hexes
            });
        }

        /**
         * Show loading state
         */
        showLoading() {
            if (!$('#citygrinder-loading').length) {
                $('body').append(`
                    <div id="citygrinder-loading" class="citygrinder-loading">
                        <div class="citygrinder-loading-spinner"></div>
                        <div class="citygrinder-loading-text">Entering settlement...</div>
                    </div>
                `);
            }
            $('#citygrinder-loading').fadeIn(200);
        }

        /**
         * Hide loading state
         */
        hideLoading() {
            $('#citygrinder-loading').fadeOut(200);
        }

        /**
         * Show error message
         * @param {string} message - Error message
         */
        showError(message) {
            // Use HexGrinder's notification system if available
            if (window.HexGrinder && HexGrinder.notify) {
                HexGrinder.notify(message, 'error');
            } else {
                alert(message);
            }
        }

        /**
         * Format number with commas
         * @param {number} num - Number to format
         * @returns {string}
         */
        formatNumber(num) {
            return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        }

        /**
         * Capitalize first letter
         * @param {string} str - String to capitalize
         * @returns {string}
         */
        capitalizeFirst(str) {
            return str.charAt(0).toUpperCase() + str.slice(1);
        }
    }

    // Initialize when document is ready
    $(document).ready(function() {
        // Only initialize if HexGrinder is present
        if (window.HexGrinder || $('[data-hexgrinder]').length) {
            window.CityGrinderHexIntegration = new HexGrinderIntegration();
        }
    });

})(jQuery);
