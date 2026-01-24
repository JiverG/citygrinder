/**
 * CityGrinder - City Renderer
 *
 * Canvas-based rendering engine for city visualization.
 * This is a basic implementation - will be enhanced in Phase 3.
 *
 * @package CityGrinder
 * @version 1.0.0
 */

(function(window) {
    'use strict';

    /**
     * City Renderer Class
     * Renders city data to an HTML5 canvas
     */
    class CityRenderer {
        /**
         * Constructor
         * @param {HTMLCanvasElement} canvas - Target canvas element
         */
        constructor(canvas) {
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d');

            this.city = null;

            // View state
            this.view = {
                x: 0,
                y: 0,
                zoom: 1,
                minZoom: 0.25,
                maxZoom: 4
            };

            // Layer visibility
            this.layers = {
                terrain: true,
                districts: true,
                streets: true,
                buildings: true,
                walls: true,
                labels: true,
                pois: true
            };

            // Colors (matching CSS variables)
            this.colors = {
                background: '#1a202c',
                water: '#4299e1',
                grass: '#48bb78',
                road: '#d69e2e',
                roadStroke: '#b7791f',
                building: '#718096',
                buildingStroke: '#4a5568',
                wall: '#4a5568',
                wallStroke: '#2d3748',
                gate: '#ed8936',
                text: '#e2e8f0',
                textShadow: '#1a202c',

                // District colors
                districts: {
                    market: '#f6e05e',
                    residential: '#68d391',
                    noble: '#9f7aea',
                    craftsmen: '#fc8181',
                    temple: '#90cdf4',
                    docks: '#63b3ed',
                    slums: '#a0aec0',
                    military: '#f687b3'
                }
            };

            // Interaction
            this.isDragging = false;
            this.lastMouse = { x: 0, y: 0 };
            this.hoveredElement = null;

            this.init();
        }

        /**
         * Initialize renderer
         */
        init() {
            this.resizeCanvas();
            this.bindEvents();
        }

        /**
         * Resize canvas to container
         */
        resizeCanvas() {
            const container = this.canvas.parentElement;
            const rect = container.getBoundingClientRect();

            this.canvas.width = rect.width;
            this.canvas.height = rect.height;

            if (this.city) {
                this.render();
            }
        }

        /**
         * Bind event handlers
         */
        bindEvents() {
            // Resize
            window.addEventListener('resize', () => this.resizeCanvas());

            // Mouse events for pan/zoom
            this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
            this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
            this.canvas.addEventListener('mouseup', () => this.onMouseUp());
            this.canvas.addEventListener('mouseleave', () => this.onMouseUp());
            this.canvas.addEventListener('wheel', (e) => this.onWheel(e));

            // Touch events
            this.canvas.addEventListener('touchstart', (e) => this.onTouchStart(e));
            this.canvas.addEventListener('touchmove', (e) => this.onTouchMove(e));
            this.canvas.addEventListener('touchend', () => this.onTouchEnd());
        }

        /**
         * Set city data
         * @param {Object} city - City data from generator
         */
        setCity(city) {
            this.city = city;
            this.resetView();
        }

        /**
         * Reset view to fit city
         */
        resetView() {
            if (!this.city) return;

            const bounds = this.city.bounds;
            const padding = 50;

            // Calculate zoom to fit
            const scaleX = (this.canvas.width - padding * 2) / bounds.width;
            const scaleY = (this.canvas.height - padding * 2) / bounds.height;
            this.view.zoom = Math.min(scaleX, scaleY, 1);

            // Center the city
            this.view.x = (this.canvas.width - bounds.width * this.view.zoom) / 2;
            this.view.y = (this.canvas.height - bounds.height * this.view.zoom) / 2;

            this.render();
        }

        /**
         * Main render function
         */
        render() {
            if (!this.city) {
                this.renderEmpty();
                return;
            }

            const ctx = this.ctx;

            // Clear canvas
            ctx.fillStyle = this.colors.background;
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            // Apply view transform
            ctx.save();
            ctx.translate(this.view.x, this.view.y);
            ctx.scale(this.view.zoom, this.view.zoom);

            // Draw layers in order
            if (this.layers.terrain) this.drawTerrain();
            if (this.layers.districts) this.drawDistricts();
            if (this.layers.streets) this.drawStreets();
            if (this.layers.buildings) this.drawBuildings();
            if (this.layers.walls) this.drawWalls();
            if (this.layers.pois) this.drawPOIs();
            if (this.layers.labels) this.drawLabels();

            ctx.restore();
        }

        /**
         * Render empty state
         */
        renderEmpty() {
            const ctx = this.ctx;
            ctx.fillStyle = this.colors.background;
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            ctx.fillStyle = this.colors.text;
            ctx.font = '16px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('Click "Generate" to create a city', this.canvas.width / 2, this.canvas.height / 2);
        }

        /**
         * Draw terrain (water features)
         */
        drawTerrain() {
            const ctx = this.ctx;
            const bounds = this.city.bounds;

            // Draw grass background
            ctx.fillStyle = this.colors.grass;
            ctx.fillRect(0, 0, bounds.width, bounds.height);

            // Draw water
            if (this.city.water) {
                ctx.fillStyle = this.colors.water;
                ctx.strokeStyle = this.colors.water;

                if (this.city.water.type === 'river') {
                    ctx.lineWidth = this.city.water.width;
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';

                    ctx.beginPath();
                    this.city.water.points.forEach((p, i) => {
                        if (i === 0) ctx.moveTo(p.x, p.y);
                        else ctx.lineTo(p.x, p.y);
                    });
                    ctx.stroke();
                } else if (this.city.water.type === 'coast') {
                    ctx.beginPath();
                    this.city.water.points.forEach((p, i) => {
                        if (i === 0) ctx.moveTo(p.x, p.y);
                        else ctx.lineTo(p.x, p.y);
                    });

                    // Close the coastal area
                    const side = this.city.water.side;
                    if (side === 0) {
                        ctx.lineTo(0, bounds.height);
                        ctx.lineTo(0, 0);
                    } else if (side === 1) {
                        ctx.lineTo(bounds.width, bounds.height);
                        ctx.lineTo(bounds.width, 0);
                    } else if (side === 2) {
                        ctx.lineTo(bounds.width, 0);
                        ctx.lineTo(0, 0);
                    } else {
                        ctx.lineTo(bounds.width, bounds.height);
                        ctx.lineTo(0, bounds.height);
                    }

                    ctx.closePath();
                    ctx.fill();
                }
            }
        }

        /**
         * Draw districts
         */
        drawDistricts() {
            const ctx = this.ctx;

            this.city.districts.forEach(district => {
                const color = this.colors.districts[district.type] || this.colors.districts.residential;

                ctx.fillStyle = this.hexToRgba(color, 0.3);
                ctx.strokeStyle = this.hexToRgba(color, 0.6);
                ctx.lineWidth = 2;

                ctx.beginPath();
                district.polygon.forEach((p, i) => {
                    if (i === 0) ctx.moveTo(p.x, p.y);
                    else ctx.lineTo(p.x, p.y);
                });
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            });
        }

        /**
         * Draw streets
         */
        drawStreets() {
            const ctx = this.ctx;

            this.city.streets.forEach(street => {
                ctx.strokeStyle = street.type === 'main' ? this.colors.road : this.colors.roadStroke;
                ctx.lineWidth = street.width;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';

                ctx.beginPath();
                street.points.forEach((p, i) => {
                    if (i === 0) ctx.moveTo(p.x, p.y);
                    else ctx.lineTo(p.x, p.y);
                });
                ctx.stroke();
            });
        }

        /**
         * Draw buildings
         */
        drawBuildings() {
            const ctx = this.ctx;

            this.city.buildings.forEach(building => {
                ctx.fillStyle = this.colors.building;
                ctx.strokeStyle = this.colors.buildingStroke;
                ctx.lineWidth = 1;

                ctx.beginPath();
                building.footprint.forEach((p, i) => {
                    if (i === 0) ctx.moveTo(p.x, p.y);
                    else ctx.lineTo(p.x, p.y);
                });
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            });
        }

        /**
         * Draw walls
         */
        drawWalls() {
            if (!this.city.walls) return;

            const ctx = this.ctx;
            const walls = this.city.walls;

            // Draw wall path
            ctx.strokeStyle = this.colors.wall;
            ctx.lineWidth = walls.thickness;
            ctx.lineCap = 'square';
            ctx.lineJoin = 'miter';

            ctx.beginPath();
            walls.path.forEach((p, i) => {
                if (i === 0) ctx.moveTo(p.x, p.y);
                else ctx.lineTo(p.x, p.y);
            });
            ctx.closePath();
            ctx.stroke();

            // Draw towers
            ctx.fillStyle = this.colors.wall;
            walls.towers.forEach(tower => {
                ctx.beginPath();
                ctx.arc(tower.x, tower.y, 10, 0, Math.PI * 2);
                ctx.fill();
            });

            // Draw gates
            ctx.fillStyle = this.colors.gate;
            walls.gates.forEach(gate => {
                ctx.beginPath();
                ctx.arc(gate.x, gate.y, 8, 0, Math.PI * 2);
                ctx.fill();
            });
        }

        /**
         * Draw POIs
         */
        drawPOIs() {
            const ctx = this.ctx;

            this.city.pois.forEach(poi => {
                // Draw marker
                ctx.fillStyle = this.colors.gate;
                ctx.beginPath();
                ctx.arc(poi.x, poi.y, 6, 0, Math.PI * 2);
                ctx.fill();

                ctx.strokeStyle = this.colors.text;
                ctx.lineWidth = 2;
                ctx.stroke();
            });
        }

        /**
         * Draw labels
         */
        drawLabels() {
            const ctx = this.ctx;

            // District names
            ctx.font = 'bold 14px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            this.city.districts.forEach(district => {
                // Text shadow
                ctx.fillStyle = this.colors.textShadow;
                ctx.fillText(district.name, district.center.x + 1, district.center.y + 1);

                // Text
                ctx.fillStyle = this.colors.text;
                ctx.fillText(district.name, district.center.x, district.center.y);
            });

            // POI names
            ctx.font = '12px sans-serif';
            this.city.pois.forEach(poi => {
                ctx.fillStyle = this.colors.textShadow;
                ctx.fillText(poi.name, poi.x + 1, poi.y - 14);

                ctx.fillStyle = this.colors.text;
                ctx.fillText(poi.name, poi.x, poi.y - 15);
            });
        }

        /**
         * Set layer visibility
         * @param {string} layer - Layer name
         * @param {boolean} visible - Visibility
         */
        setLayerVisibility(layer, visible) {
            if (this.layers.hasOwnProperty(layer)) {
                this.layers[layer] = visible;
                this.render();
            }
        }

        /**
         * Zoom in
         */
        zoomIn() {
            this.setZoom(this.view.zoom * 1.25);
        }

        /**
         * Zoom out
         */
        zoomOut() {
            this.setZoom(this.view.zoom / 1.25);
        }

        /**
         * Set zoom level
         * @param {number} zoom - Zoom level
         */
        setZoom(zoom) {
            const centerX = this.canvas.width / 2;
            const centerY = this.canvas.height / 2;

            // Get world coordinates of center before zoom
            const worldX = (centerX - this.view.x) / this.view.zoom;
            const worldY = (centerY - this.view.y) / this.view.zoom;

            // Apply zoom
            this.view.zoom = Math.max(this.view.minZoom, Math.min(this.view.maxZoom, zoom));

            // Adjust position to keep center
            this.view.x = centerX - worldX * this.view.zoom;
            this.view.y = centerY - worldY * this.view.zoom;

            this.render();
        }

        /**
         * Focus on district
         * @param {number} districtId - District index
         */
        focusOnDistrict(districtId) {
            const district = this.city.districts[districtId];
            if (!district) return;

            this.focusOnPoint(district.center.x, district.center.y);
        }

        /**
         * Focus on POI
         * @param {number} poiId - POI index
         */
        focusOnPOI(poiId) {
            const poi = this.city.pois[poiId];
            if (!poi) return;

            this.focusOnPoint(poi.x, poi.y);
        }

        /**
         * Focus on a point
         * @param {number} x - World X
         * @param {number} y - World Y
         */
        focusOnPoint(x, y) {
            this.view.x = this.canvas.width / 2 - x * this.view.zoom;
            this.view.y = this.canvas.height / 2 - y * this.view.zoom;
            this.render();
        }

        // =====================================================================
        // EVENT HANDLERS
        // =====================================================================

        onMouseDown(e) {
            this.isDragging = true;
            this.lastMouse = { x: e.clientX, y: e.clientY };
            this.canvas.style.cursor = 'grabbing';
        }

        onMouseMove(e) {
            if (this.isDragging) {
                const dx = e.clientX - this.lastMouse.x;
                const dy = e.clientY - this.lastMouse.y;

                this.view.x += dx;
                this.view.y += dy;

                this.lastMouse = { x: e.clientX, y: e.clientY };
                this.render();
            }
        }

        onMouseUp() {
            this.isDragging = false;
            this.canvas.style.cursor = 'grab';
        }

        onWheel(e) {
            e.preventDefault();

            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            // Get world coordinates of mouse before zoom
            const worldX = (mouseX - this.view.x) / this.view.zoom;
            const worldY = (mouseY - this.view.y) / this.view.zoom;

            // Apply zoom
            const newZoom = Math.max(this.view.minZoom, Math.min(this.view.maxZoom, this.view.zoom * delta));

            if (newZoom !== this.view.zoom) {
                this.view.zoom = newZoom;

                // Adjust position to zoom toward mouse
                this.view.x = mouseX - worldX * this.view.zoom;
                this.view.y = mouseY - worldY * this.view.zoom;

                this.render();
            }
        }

        onTouchStart(e) {
            if (e.touches.length === 1) {
                this.isDragging = true;
                this.lastMouse = {
                    x: e.touches[0].clientX,
                    y: e.touches[0].clientY
                };
            }
        }

        onTouchMove(e) {
            if (this.isDragging && e.touches.length === 1) {
                e.preventDefault();

                const dx = e.touches[0].clientX - this.lastMouse.x;
                const dy = e.touches[0].clientY - this.lastMouse.y;

                this.view.x += dx;
                this.view.y += dy;

                this.lastMouse = {
                    x: e.touches[0].clientX,
                    y: e.touches[0].clientY
                };

                this.render();
            }
        }

        onTouchEnd() {
            this.isDragging = false;
        }

        // =====================================================================
        // UTILITY METHODS
        // =====================================================================

        /**
         * Convert hex color to rgba
         * @param {string} hex - Hex color
         * @param {number} alpha - Alpha value
         * @returns {string}
         */
        hexToRgba(hex, alpha) {
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }
    }

    // Export
    window.CityRenderer = CityRenderer;

})(window);
