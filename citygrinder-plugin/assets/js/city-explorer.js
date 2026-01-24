/**
 * CityGrinder - City Explorer
 *
 * Exploration interface for interacting with generated cities.
 * Handles tooltips, selection, and detail views.
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

            this.init();
        }

        /**
         * Initialize explorer
         */
        init() {
            this.bindEvents();
        }

        /**
         * Bind event handlers
         */
        bindEvents() {
            // Canvas interaction for hover/click
            if (this.app.canvas) {
                this.app.canvas.addEventListener('mousemove', (e) => this.onCanvasMouseMove(e));
                this.app.canvas.addEventListener('click', (e) => this.onCanvasClick(e));
            }

            // District list interaction
            this.container.querySelectorAll('.district-list').forEach(list => {
                list.addEventListener('click', (e) => {
                    const item = e.target.closest('.district-item');
                    if (item) {
                        this.selectDistrict(parseInt(item.dataset.districtId));
                    }
                });
            });

            // POI list interaction
            this.container.querySelectorAll('.poi-list').forEach(list => {
                list.addEventListener('click', (e) => {
                    const item = e.target.closest('.poi-item');
                    if (item) {
                        this.selectPOI(parseInt(item.dataset.poiId));
                    }
                });
            });
        }

        /**
         * Handle canvas mouse move for hover effects
         * @param {MouseEvent} e - Mouse event
         */
        onCanvasMouseMove(e) {
            if (!this.app.currentCity || !this.app.renderer) return;

            const pos = this.getWorldPosition(e);
            const element = this.hitTest(pos.x, pos.y);

            if (element !== this.hoveredElement) {
                this.hoveredElement = element;

                if (element) {
                    this.showTooltip(e, element);
                    this.app.canvas.style.cursor = 'pointer';
                } else {
                    this.hideTooltip();
                    this.app.canvas.style.cursor = this.app.renderer.isDragging ? 'grabbing' : 'grab';
                }
            } else if (element && this.tooltip) {
                // Update tooltip position
                this.updateTooltipPosition(e);
            }
        }

        /**
         * Handle canvas click for selection
         * @param {MouseEvent} e - Mouse event
         */
        onCanvasClick(e) {
            if (!this.app.currentCity) return;

            const pos = this.getWorldPosition(e);
            const element = this.hitTest(pos.x, pos.y);

            if (element) {
                switch (element.type) {
                    case 'district':
                        this.selectDistrict(element.id);
                        break;
                    case 'building':
                        this.selectBuilding(element.id);
                        break;
                    case 'poi':
                        this.selectPOI(element.id);
                        break;
                }
            } else {
                this.clearSelection();
            }
        }

        /**
         * Convert screen position to world position
         * @param {MouseEvent} e - Mouse event
         * @returns {Object}
         */
        getWorldPosition(e) {
            const rect = this.app.canvas.getBoundingClientRect();
            const view = this.app.renderer.view;

            const screenX = e.clientX - rect.left;
            const screenY = e.clientY - rect.top;

            return {
                x: (screenX - view.x) / view.zoom,
                y: (screenY - view.y) / view.zoom
            };
        }

        /**
         * Hit test at world position
         * @param {number} x - World X
         * @param {number} y - World Y
         * @returns {Object|null}
         */
        hitTest(x, y) {
            const city = this.app.currentCity;
            if (!city) return null;

            // Check POIs first (highest priority)
            for (let i = 0; i < city.pois.length; i++) {
                const poi = city.pois[i];
                const dist = Math.hypot(poi.x - x, poi.y - y);
                if (dist < 15) {
                    return { type: 'poi', id: i, data: poi };
                }
            }

            // Check buildings
            for (let i = 0; i < city.buildings.length; i++) {
                const building = city.buildings[i];
                if (this.pointInPolygon(x, y, building.footprint)) {
                    return { type: 'building', id: i, data: building };
                }
            }

            // Check districts
            for (let i = 0; i < city.districts.length; i++) {
                const district = city.districts[i];
                if (this.pointInPolygon(x, y, district.polygon)) {
                    return { type: 'district', id: i, data: district };
                }
            }

            return null;
        }

        /**
         * Point in polygon test
         * @param {number} x - Point X
         * @param {number} y - Point Y
         * @param {Array} polygon - Polygon points
         * @returns {boolean}
         */
        pointInPolygon(x, y, polygon) {
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

        /**
         * Select a district
         * @param {number} districtId - District index
         */
        selectDistrict(districtId) {
            this.clearSelection();
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
            this.clearSelection();
            this.selectedBuilding = buildingId;

            const building = this.app.currentCity.buildings[buildingId];
            if (building && this.app.renderer) {
                this.app.renderer.focusOnPoint(building.x, building.y);
            }

            this.showBuildingDetails(buildingId);
        }

        /**
         * Select a POI
         * @param {number} poiId - POI index
         */
        selectPOI(poiId) {
            this.clearSelection();
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
         * Clear all selections
         */
        clearSelection() {
            this.selectedDistrict = null;
            this.selectedBuilding = null;
            this.selectedPOI = null;

            this.container.querySelectorAll('.district-item.active, .poi-item.active').forEach(item => {
                item.classList.remove('active');
            });
        }

        /**
         * Show district details
         * @param {number} districtId - District index
         */
        showDistrictDetails(districtId) {
            const district = this.app.currentCity.districts[districtId];
            if (!district) return;

            // Could show in a detail panel
            console.log('District details:', district);
        }

        /**
         * Show building details
         * @param {number} buildingId - Building index
         */
        showBuildingDetails(buildingId) {
            const building = this.app.currentCity.buildings[buildingId];
            if (!building) return;

            console.log('Building details:', building);
        }

        /**
         * Show POI details
         * @param {number} poiId - POI index
         */
        showPOIDetails(poiId) {
            const poi = this.app.currentCity.pois[poiId];
            if (!poi) return;

            console.log('POI details:', poi);
        }

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
                    contentEl.textContent = `Type: ${element.data.type}`;
                    break;
                case 'building':
                    titleEl.textContent = element.data.name || this.formatBuildingType(element.data.type);
                    contentEl.textContent = `In ${this.getDistrictName(element.data.districtId)}`;
                    break;
                case 'poi':
                    titleEl.textContent = element.data.name;
                    contentEl.textContent = element.data.description || element.data.type;
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

        /**
         * Format building type for display
         * @param {string} type - Building type
         * @returns {string}
         */
        formatBuildingType(type) {
            return type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ');
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
    }

    // Export
    window.CityExplorer = CityExplorer;

})(window);
