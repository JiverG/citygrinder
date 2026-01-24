/**
 * CityGrinder - City Renderer
 *
 * Canvas-based rendering engine for city visualization with
 * enhanced graphics, fill patterns, shadows, and interactive features.
 *
 * @package CityGrinder
 * @version 1.0.0
 */

(function(window) {
    'use strict';

    /**
     * City Renderer Class
     * Renders city data to an HTML5 canvas with professional graphics
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
                water: true,
                districts: true,
                streets: true,
                buildings: true,
                walls: true,
                bridges: true,
                labels: true,
                pois: true,
                grid: false
            };

            // Rendering style
            this.style = {
                mode: 'color', // 'color', 'parchment', 'blueprint', 'fantasy'
                shadows: true,
                patterns: true,
                antiAlias: true
            };

            // Color themes
            this.themes = {
                color: {
                    background: '#1a202c',
                    water: '#4299e1',
                    waterDark: '#2b6cb0',
                    grass: '#48bb78',
                    grassDark: '#38a169',
                    road: '#d69e2e',
                    roadStroke: '#b7791f',
                    building: '#718096',
                    buildingStroke: '#4a5568',
                    buildingRoof: '#a0aec0',
                    wall: '#4a5568',
                    wallStroke: '#2d3748',
                    gate: '#ed8936',
                    tower: '#553c24',
                    bridge: '#8b7355',
                    text: '#e2e8f0',
                    textShadow: '#1a202c',
                    grid: 'rgba(255, 255, 255, 0.1)',
                    districts: {
                        market: { fill: '#f6e05e', stroke: '#d69e2e', pattern: 'cobblestone' },
                        residential: { fill: '#68d391', stroke: '#38a169', pattern: 'grass' },
                        noble: { fill: '#9f7aea', stroke: '#805ad5', pattern: 'marble' },
                        craftsmen: { fill: '#fc8181', stroke: '#e53e3e', pattern: 'cobblestone' },
                        temple: { fill: '#90cdf4', stroke: '#4299e1', pattern: 'marble' },
                        docks: { fill: '#63b3ed', stroke: '#3182ce', pattern: 'wood' },
                        slums: { fill: '#a0aec0', stroke: '#718096', pattern: 'dirt' },
                        military: { fill: '#f687b3', stroke: '#d53f8c', pattern: 'stone' }
                    },
                    buildings: {
                        house: { fill: '#8b7355', stroke: '#6b5344', roof: '#a0522d' },
                        shop: { fill: '#9f8170', stroke: '#7d6658', roof: '#b87333' },
                        workshop: { fill: '#8b4513', stroke: '#5d2e0c', roof: '#6b3e26' },
                        tavern: { fill: '#d2691e', stroke: '#a0522d', roof: '#8b4513' },
                        temple: { fill: '#f5f5dc', stroke: '#d4c896', roof: '#daa520' },
                        manor: { fill: '#f5f5f5', stroke: '#c0c0c0', roof: '#4a4a4a' },
                        barracks: { fill: '#696969', stroke: '#4a4a4a', roof: '#2f4f4f' },
                        warehouse: { fill: '#a9a9a9', stroke: '#808080', roof: '#696969' },
                        dock_building: { fill: '#deb887', stroke: '#d2b48c', roof: '#8b7355' },
                        shack: { fill: '#a0522d', stroke: '#8b4513', roof: '#6b4423' }
                    }
                },
                parchment: {
                    background: '#f4e4bc',
                    water: '#8cb4d2',
                    waterDark: '#6a9fc4',
                    grass: '#c9b896',
                    grassDark: '#b8a785',
                    road: '#8b7355',
                    roadStroke: '#6b5344',
                    building: '#5c4a37',
                    buildingStroke: '#3d2f24',
                    buildingRoof: '#7d6658',
                    wall: '#4a3728',
                    wallStroke: '#2d2219',
                    gate: '#8b4513',
                    tower: '#4a3728',
                    bridge: '#6b5344',
                    text: '#2d2219',
                    textShadow: '#f4e4bc',
                    grid: 'rgba(0, 0, 0, 0.1)',
                    districts: {
                        market: { fill: '#e6d5a8', stroke: '#c9b896', pattern: 'hatch' },
                        residential: { fill: '#d4c4a8', stroke: '#b8a785', pattern: 'dots' },
                        noble: { fill: '#d8c8b8', stroke: '#c0b0a0', pattern: 'crosshatch' },
                        craftsmen: { fill: '#c9b896', stroke: '#b8a785', pattern: 'hatch' },
                        temple: { fill: '#e0d0c0', stroke: '#d0c0b0', pattern: 'crosshatch' },
                        docks: { fill: '#c8d8e8', stroke: '#a8c8e0', pattern: 'lines' },
                        slums: { fill: '#b8a898', stroke: '#a09080', pattern: 'dots' },
                        military: { fill: '#d0c0b0', stroke: '#c0b0a0', pattern: 'hatch' }
                    },
                    buildings: {
                        house: { fill: '#5c4a37', stroke: '#3d2f24', roof: '#7d6658' },
                        shop: { fill: '#6b5344', stroke: '#4a3728', roof: '#8b7355' },
                        workshop: { fill: '#5c4a37', stroke: '#3d2f24', roof: '#6b5344' },
                        tavern: { fill: '#7d6658', stroke: '#5c4a37', roof: '#8b7355' },
                        temple: { fill: '#8b7355', stroke: '#6b5344', roof: '#a08060' },
                        manor: { fill: '#9f8f7f', stroke: '#8b7b6b', roof: '#7d6d5d' },
                        barracks: { fill: '#5c4a37', stroke: '#3d2f24', roof: '#4a3728' },
                        warehouse: { fill: '#6b5b4b', stroke: '#5c4a37', roof: '#7d6d5d' },
                        dock_building: { fill: '#7d6d5d', stroke: '#6b5b4b', roof: '#8b7b6b' },
                        shack: { fill: '#5c4a37', stroke: '#4a3728', roof: '#6b5344' }
                    }
                },
                blueprint: {
                    background: '#1a3a5c',
                    water: '#4a7a9c',
                    waterDark: '#3a6a8c',
                    grass: '#2a5a7c',
                    grassDark: '#1a4a6c',
                    road: '#6a9abc',
                    roadStroke: '#5a8aac',
                    building: '#ffffff',
                    buildingStroke: '#8abadc',
                    buildingRoof: '#aacaec',
                    wall: '#ffffff',
                    wallStroke: '#8abadc',
                    gate: '#ffd700',
                    tower: '#ffffff',
                    bridge: '#aacaec',
                    text: '#ffffff',
                    textShadow: '#1a3a5c',
                    grid: 'rgba(138, 186, 220, 0.3)',
                    districts: {
                        market: { fill: 'transparent', stroke: '#8abadc', pattern: 'none' },
                        residential: { fill: 'transparent', stroke: '#8abadc', pattern: 'none' },
                        noble: { fill: 'transparent', stroke: '#aacaec', pattern: 'none' },
                        craftsmen: { fill: 'transparent', stroke: '#8abadc', pattern: 'none' },
                        temple: { fill: 'transparent', stroke: '#aacaec', pattern: 'none' },
                        docks: { fill: 'transparent', stroke: '#6a9abc', pattern: 'none' },
                        slums: { fill: 'transparent', stroke: '#6a9abc', pattern: 'none' },
                        military: { fill: 'transparent', stroke: '#aacaec', pattern: 'none' }
                    },
                    buildings: {
                        house: { fill: 'transparent', stroke: '#ffffff', roof: 'transparent' },
                        shop: { fill: 'transparent', stroke: '#ffffff', roof: 'transparent' },
                        workshop: { fill: 'transparent', stroke: '#ffffff', roof: 'transparent' },
                        tavern: { fill: 'transparent', stroke: '#ffffff', roof: 'transparent' },
                        temple: { fill: 'transparent', stroke: '#ffd700', roof: 'transparent' },
                        manor: { fill: 'transparent', stroke: '#aacaec', roof: 'transparent' },
                        barracks: { fill: 'transparent', stroke: '#ffffff', roof: 'transparent' },
                        warehouse: { fill: 'transparent', stroke: '#ffffff', roof: 'transparent' },
                        dock_building: { fill: 'transparent', stroke: '#ffffff', roof: 'transparent' },
                        shack: { fill: 'transparent', stroke: '#6a9abc', roof: 'transparent' }
                    }
                },
                fantasy: {
                    background: '#2d1f1a',
                    water: '#3498db',
                    waterDark: '#2980b9',
                    grass: '#27ae60',
                    grassDark: '#1e8449',
                    road: '#d4a574',
                    roadStroke: '#a67c52',
                    building: '#8b7355',
                    buildingStroke: '#5d4037',
                    buildingRoof: '#a0522d',
                    wall: '#5d4037',
                    wallStroke: '#3e2723',
                    gate: '#f39c12',
                    tower: '#4a3728',
                    bridge: '#8b7355',
                    text: '#ecf0f1',
                    textShadow: '#2d1f1a',
                    grid: 'rgba(255, 255, 255, 0.1)',
                    districts: {
                        market: { fill: '#f1c40f', stroke: '#d4ac0d', pattern: 'cobblestone' },
                        residential: { fill: '#2ecc71', stroke: '#27ae60', pattern: 'grass' },
                        noble: { fill: '#9b59b6', stroke: '#8e44ad', pattern: 'marble' },
                        craftsmen: { fill: '#e74c3c', stroke: '#c0392b', pattern: 'cobblestone' },
                        temple: { fill: '#3498db', stroke: '#2980b9', pattern: 'marble' },
                        docks: { fill: '#1abc9c', stroke: '#16a085', pattern: 'wood' },
                        slums: { fill: '#7f8c8d', stroke: '#6c7a7a', pattern: 'dirt' },
                        military: { fill: '#e91e63', stroke: '#c2185b', pattern: 'stone' }
                    },
                    buildings: {
                        house: { fill: '#8b7355', stroke: '#5d4037', roof: '#a0522d' },
                        shop: { fill: '#9f8170', stroke: '#7d6658', roof: '#b87333' },
                        workshop: { fill: '#795548', stroke: '#5d4037', roof: '#6b4423' },
                        tavern: { fill: '#d4a574', stroke: '#a67c52', roof: '#8d6e63' },
                        temple: { fill: '#ecf0f1', stroke: '#bdc3c7', roof: '#f39c12' },
                        manor: { fill: '#f5f5f5', stroke: '#bdc3c7', roof: '#34495e' },
                        barracks: { fill: '#607d8b', stroke: '#455a64', roof: '#37474f' },
                        warehouse: { fill: '#9e9e9e', stroke: '#757575', roof: '#616161' },
                        dock_building: { fill: '#a1887f', stroke: '#8d6e63', roof: '#6d4c41' },
                        shack: { fill: '#795548', stroke: '#5d4037', roof: '#4e342e' }
                    }
                }
            };

            // Active theme colors
            this.colors = this.themes.color;

            // Patterns cache
            this.patterns = {};

            // Interaction state
            this.isDragging = false;
            this.lastMouse = { x: 0, y: 0 };
            this.hoveredElement = null;
            this.selectedElement = null;

            // Animation
            this.animationFrame = null;
            this.animationTime = 0;

            this.init();
        }

        /**
         * Initialize renderer
         */
        init() {
            this.resizeCanvas();
            this.bindEvents();
            this.createPatterns();
        }

        /**
         * Create fill patterns
         */
        createPatterns() {
            const patternCanvas = document.createElement('canvas');
            const patternCtx = patternCanvas.getContext('2d');

            // Cobblestone pattern
            patternCanvas.width = 20;
            patternCanvas.height = 20;
            patternCtx.fillStyle = '#808080';
            patternCtx.fillRect(0, 0, 20, 20);
            patternCtx.strokeStyle = '#606060';
            patternCtx.lineWidth = 1;
            // Draw stone shapes
            patternCtx.beginPath();
            patternCtx.moveTo(0, 10);
            patternCtx.lineTo(10, 10);
            patternCtx.moveTo(10, 0);
            patternCtx.lineTo(10, 10);
            patternCtx.moveTo(5, 10);
            patternCtx.lineTo(5, 20);
            patternCtx.moveTo(15, 10);
            patternCtx.lineTo(15, 20);
            patternCtx.stroke();
            this.patterns.cobblestone = this.ctx.createPattern(patternCanvas, 'repeat');

            // Grass pattern
            patternCanvas.width = 16;
            patternCanvas.height = 16;
            patternCtx.fillStyle = '#48bb78';
            patternCtx.fillRect(0, 0, 16, 16);
            patternCtx.fillStyle = '#38a169';
            for (let i = 0; i < 8; i++) {
                const x = Math.random() * 16;
                const y = Math.random() * 16;
                patternCtx.fillRect(x, y, 2, 3);
            }
            this.patterns.grass = this.ctx.createPattern(patternCanvas, 'repeat');

            // Marble pattern
            patternCanvas.width = 30;
            patternCanvas.height = 30;
            patternCtx.fillStyle = '#f0f0f0';
            patternCtx.fillRect(0, 0, 30, 30);
            patternCtx.strokeStyle = '#d0d0d0';
            patternCtx.lineWidth = 0.5;
            patternCtx.beginPath();
            patternCtx.moveTo(0, 15);
            patternCtx.bezierCurveTo(10, 10, 20, 20, 30, 15);
            patternCtx.moveTo(0, 25);
            patternCtx.bezierCurveTo(10, 30, 20, 20, 30, 25);
            patternCtx.stroke();
            this.patterns.marble = this.ctx.createPattern(patternCanvas, 'repeat');

            // Wood pattern
            patternCanvas.width = 20;
            patternCanvas.height = 8;
            patternCtx.fillStyle = '#8b7355';
            patternCtx.fillRect(0, 0, 20, 8);
            patternCtx.strokeStyle = '#6b5344';
            patternCtx.lineWidth = 1;
            patternCtx.beginPath();
            patternCtx.moveTo(0, 4);
            patternCtx.lineTo(20, 4);
            patternCtx.stroke();
            this.patterns.wood = this.ctx.createPattern(patternCanvas, 'repeat');

            // Dirt pattern
            patternCanvas.width = 12;
            patternCanvas.height = 12;
            patternCtx.fillStyle = '#a0522d';
            patternCtx.fillRect(0, 0, 12, 12);
            patternCtx.fillStyle = '#8b4513';
            for (let i = 0; i < 6; i++) {
                const x = Math.random() * 12;
                const y = Math.random() * 12;
                patternCtx.beginPath();
                patternCtx.arc(x, y, 1, 0, Math.PI * 2);
                patternCtx.fill();
            }
            this.patterns.dirt = this.ctx.createPattern(patternCanvas, 'repeat');

            // Stone pattern
            patternCanvas.width = 24;
            patternCanvas.height = 24;
            patternCtx.fillStyle = '#808080';
            patternCtx.fillRect(0, 0, 24, 24);
            patternCtx.strokeStyle = '#606060';
            patternCtx.lineWidth = 1;
            patternCtx.strokeRect(2, 2, 20, 10);
            patternCtx.strokeRect(12, 14, 10, 8);
            patternCtx.strokeRect(2, 14, 8, 8);
            this.patterns.stone = this.ctx.createPattern(patternCanvas, 'repeat');

            // Hatch pattern (for parchment)
            patternCanvas.width = 8;
            patternCanvas.height = 8;
            patternCtx.fillStyle = 'transparent';
            patternCtx.clearRect(0, 0, 8, 8);
            patternCtx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
            patternCtx.lineWidth = 1;
            patternCtx.beginPath();
            patternCtx.moveTo(0, 8);
            patternCtx.lineTo(8, 0);
            patternCtx.stroke();
            this.patterns.hatch = this.ctx.createPattern(patternCanvas, 'repeat');

            // Crosshatch pattern
            patternCanvas.width = 8;
            patternCanvas.height = 8;
            patternCtx.fillStyle = 'transparent';
            patternCtx.clearRect(0, 0, 8, 8);
            patternCtx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
            patternCtx.lineWidth = 1;
            patternCtx.beginPath();
            patternCtx.moveTo(0, 8);
            patternCtx.lineTo(8, 0);
            patternCtx.moveTo(0, 0);
            patternCtx.lineTo(8, 8);
            patternCtx.stroke();
            this.patterns.crosshatch = this.ctx.createPattern(patternCanvas, 'repeat');

            // Dots pattern
            patternCanvas.width = 8;
            patternCanvas.height = 8;
            patternCtx.fillStyle = 'transparent';
            patternCtx.clearRect(0, 0, 8, 8);
            patternCtx.fillStyle = 'rgba(0, 0, 0, 0.1)';
            patternCtx.beginPath();
            patternCtx.arc(4, 4, 1, 0, Math.PI * 2);
            patternCtx.fill();
            this.patterns.dots = this.ctx.createPattern(patternCanvas, 'repeat');

            // Lines pattern
            patternCanvas.width = 8;
            patternCanvas.height = 8;
            patternCtx.fillStyle = 'transparent';
            patternCtx.clearRect(0, 0, 8, 8);
            patternCtx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
            patternCtx.lineWidth = 1;
            patternCtx.beginPath();
            patternCtx.moveTo(0, 4);
            patternCtx.lineTo(8, 4);
            patternCtx.stroke();
            this.patterns.lines = this.ctx.createPattern(patternCanvas, 'repeat');

            // Water wave pattern
            patternCanvas.width = 30;
            patternCanvas.height = 20;
            patternCtx.fillStyle = '#4299e1';
            patternCtx.fillRect(0, 0, 30, 20);
            patternCtx.strokeStyle = '#63b3ed';
            patternCtx.lineWidth = 1;
            patternCtx.beginPath();
            patternCtx.moveTo(0, 5);
            patternCtx.bezierCurveTo(7, 2, 15, 8, 30, 5);
            patternCtx.moveTo(0, 15);
            patternCtx.bezierCurveTo(10, 12, 20, 18, 30, 15);
            patternCtx.stroke();
            this.patterns.water = this.ctx.createPattern(patternCanvas, 'repeat');
        }

        /**
         * Set rendering style/theme
         * @param {string} mode - Theme mode
         */
        setStyle(mode) {
            if (this.themes[mode]) {
                this.style.mode = mode;
                this.colors = this.themes[mode];
                this.render();
            }
        }

        /**
         * Resize canvas to container
         */
        resizeCanvas() {
            const container = this.canvas.parentElement;
            const rect = container.getBoundingClientRect();

            // Handle high DPI displays
            const dpr = window.devicePixelRatio || 1;
            this.canvas.width = rect.width * dpr;
            this.canvas.height = rect.height * dpr;
            this.canvas.style.width = rect.width + 'px';
            this.canvas.style.height = rect.height + 'px';

            this.ctx.scale(dpr, dpr);
            this.displayWidth = rect.width;
            this.displayHeight = rect.height;

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
            this.canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
            this.canvas.addEventListener('click', (e) => this.onClick(e));
            this.canvas.addEventListener('dblclick', (e) => this.onDoubleClick(e));

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
            this.selectedElement = null;
            this.hoveredElement = null;
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
            const scaleX = (this.displayWidth - padding * 2) / bounds.width;
            const scaleY = (this.displayHeight - padding * 2) / bounds.height;
            this.view.zoom = Math.min(scaleX, scaleY, 1);

            // Center the city
            this.view.x = (this.displayWidth - bounds.width * this.view.zoom) / 2;
            this.view.y = (this.displayHeight - bounds.height * this.view.zoom) / 2;

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
            ctx.fillRect(0, 0, this.displayWidth, this.displayHeight);

            // Apply view transform
            ctx.save();
            ctx.translate(this.view.x, this.view.y);
            ctx.scale(this.view.zoom, this.view.zoom);

            // Enable anti-aliasing
            if (this.style.antiAlias) {
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
            }

            // Draw layers in order
            if (this.layers.terrain) this.drawTerrain();
            if (this.layers.grid) this.drawGrid();
            if (this.layers.water) this.drawWater();
            if (this.layers.districts) this.drawDistricts();
            if (this.layers.streets) this.drawStreets();
            if (this.layers.bridges) this.drawBridges();
            if (this.layers.buildings) this.drawBuildings();
            if (this.layers.walls) this.drawWalls();
            if (this.layers.pois) this.drawPOIs();
            if (this.layers.labels) this.drawLabels();

            // Draw selection/hover highlights
            this.drawHighlights();

            ctx.restore();

            // Draw UI overlay
            this.drawOverlay();
        }

        /**
         * Render empty state
         */
        renderEmpty() {
            const ctx = this.ctx;
            ctx.fillStyle = this.colors.background;
            ctx.fillRect(0, 0, this.displayWidth, this.displayHeight);

            ctx.fillStyle = this.colors.text;
            ctx.font = '16px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('Click "Generate" to create a city', this.displayWidth / 2, this.displayHeight / 2);
        }

        /**
         * Draw terrain (grass background)
         */
        drawTerrain() {
            const ctx = this.ctx;
            const bounds = this.city.bounds;

            // Draw grass background with gradient
            const gradient = ctx.createRadialGradient(
                bounds.centerX, bounds.centerY, 0,
                bounds.centerX, bounds.centerY, Math.max(bounds.width, bounds.height)
            );
            gradient.addColorStop(0, this.colors.grass);
            gradient.addColorStop(1, this.colors.grassDark);

            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, bounds.width, bounds.height);

            // Add grass pattern overlay
            if (this.style.patterns && this.patterns.grass && this.style.mode !== 'blueprint') {
                ctx.globalAlpha = 0.2;
                ctx.fillStyle = this.patterns.grass;
                ctx.fillRect(0, 0, bounds.width, bounds.height);
                ctx.globalAlpha = 1;
            }
        }

        /**
         * Draw grid overlay
         */
        drawGrid() {
            const ctx = this.ctx;
            const bounds = this.city.bounds;
            const gridSize = 50;

            ctx.strokeStyle = this.colors.grid;
            ctx.lineWidth = 1 / this.view.zoom;

            ctx.beginPath();
            for (let x = 0; x <= bounds.width; x += gridSize) {
                ctx.moveTo(x, 0);
                ctx.lineTo(x, bounds.height);
            }
            for (let y = 0; y <= bounds.height; y += gridSize) {
                ctx.moveTo(0, y);
                ctx.lineTo(bounds.width, y);
            }
            ctx.stroke();
        }

        /**
         * Draw water features (rivers, coast)
         */
        drawWater() {
            if (!this.city.water) return;

            const ctx = this.ctx;
            const water = this.city.water;
            const bounds = this.city.bounds;

            // Water gradient
            const waterGradient = ctx.createLinearGradient(0, 0, bounds.width, bounds.height);
            waterGradient.addColorStop(0, this.colors.water);
            waterGradient.addColorStop(1, this.colors.waterDark);

            ctx.fillStyle = waterGradient;
            ctx.strokeStyle = this.colors.waterDark;

            if (water.type === 'river') {
                // Draw river shadow
                if (this.style.shadows) {
                    ctx.save();
                    ctx.translate(3, 3);
                    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
                    ctx.lineWidth = water.width + 4;
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';

                    ctx.beginPath();
                    this.drawBezierPath(water.points);
                    ctx.stroke();
                    ctx.restore();
                }

                // Draw river
                ctx.lineWidth = water.width;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.strokeStyle = waterGradient;

                ctx.beginPath();
                this.drawBezierPath(water.points);
                ctx.stroke();

                // Draw river edge
                ctx.lineWidth = 2;
                ctx.strokeStyle = this.colors.waterDark;
                ctx.beginPath();
                this.drawBezierPath(water.points);
                ctx.stroke();

            } else if (water.type === 'coast') {
                ctx.beginPath();
                this.drawBezierPath(water.points);

                // Close the coastal area
                const side = water.side;
                const last = water.points[water.points.length - 1];
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

                // Draw coastline
                ctx.strokeStyle = this.colors.waterDark;
                ctx.lineWidth = 3;
                ctx.beginPath();
                this.drawBezierPath(water.points);
                ctx.stroke();
            }
        }

        /**
         * Draw smooth bezier path through points
         * @param {Array} points
         */
        drawBezierPath(points) {
            if (!points || points.length < 2) return;

            const ctx = this.ctx;
            ctx.moveTo(points[0].x, points[0].y);

            if (points.length === 2) {
                ctx.lineTo(points[1].x, points[1].y);
                return;
            }

            // Use quadratic curves for smooth path
            for (let i = 1; i < points.length - 1; i++) {
                const xc = (points[i].x + points[i + 1].x) / 2;
                const yc = (points[i].y + points[i + 1].y) / 2;
                ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
            }

            // Last point
            const last = points[points.length - 1];
            ctx.lineTo(last.x, last.y);
        }

        /**
         * Draw districts
         */
        drawDistricts() {
            const ctx = this.ctx;

            this.city.districts.forEach(district => {
                const districtStyle = this.colors.districts[district.type] ||
                    this.colors.districts.residential;

                // District fill
                ctx.fillStyle = this.hexToRgba(districtStyle.fill, 0.25);
                ctx.strokeStyle = districtStyle.stroke;
                ctx.lineWidth = 2;

                ctx.beginPath();
                this.drawPolygonPath(district.polygon);
                ctx.closePath();
                ctx.fill();

                // Pattern overlay
                if (this.style.patterns && districtStyle.pattern &&
                    this.patterns[districtStyle.pattern]) {
                    ctx.globalAlpha = 0.15;
                    ctx.fillStyle = this.patterns[districtStyle.pattern];
                    ctx.fill();
                    ctx.globalAlpha = 1;
                }

                // District border
                ctx.strokeStyle = districtStyle.stroke;
                ctx.setLineDash([5, 5]);
                ctx.stroke();
                ctx.setLineDash([]);
            });
        }

        /**
         * Draw polygon path
         * @param {Array} polygon
         */
        drawPolygonPath(polygon) {
            if (!polygon || polygon.length < 3) return;

            const ctx = this.ctx;
            ctx.moveTo(polygon[0].x, polygon[0].y);
            for (let i = 1; i < polygon.length; i++) {
                ctx.lineTo(polygon[i].x, polygon[i].y);
            }
        }

        /**
         * Draw streets
         */
        drawStreets() {
            const ctx = this.ctx;

            // Sort streets by type (draw main roads last)
            const sortedStreets = [...this.city.streets].sort((a, b) => {
                const order = { alley: 0, secondary: 1, main: 2 };
                return (order[a.type] || 0) - (order[b.type] || 0);
            });

            sortedStreets.forEach(street => {
                const width = street.width || (street.type === 'main' ? 8 : street.type === 'secondary' ? 5 : 3);

                // Draw road shadow
                if (this.style.shadows && street.type === 'main') {
                    ctx.save();
                    ctx.translate(2, 2);
                    ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
                    ctx.lineWidth = width + 2;
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';

                    ctx.beginPath();
                    street.points.forEach((p, i) => {
                        if (i === 0) ctx.moveTo(p.x, p.y);
                        else ctx.lineTo(p.x, p.y);
                    });
                    ctx.stroke();
                    ctx.restore();
                }

                // Road base
                ctx.strokeStyle = street.type === 'main' ? this.colors.road :
                    street.type === 'secondary' ? this.colors.roadStroke :
                        this.hexToRgba(this.colors.roadStroke, 0.7);
                ctx.lineWidth = width;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';

                ctx.beginPath();
                street.points.forEach((p, i) => {
                    if (i === 0) ctx.moveTo(p.x, p.y);
                    else ctx.lineTo(p.x, p.y);
                });
                ctx.stroke();

                // Road edge for main roads
                if (street.type === 'main') {
                    ctx.strokeStyle = this.colors.roadStroke;
                    ctx.lineWidth = width + 2;
                    ctx.beginPath();
                    street.points.forEach((p, i) => {
                        if (i === 0) ctx.moveTo(p.x, p.y);
                        else ctx.lineTo(p.x, p.y);
                    });
                    ctx.stroke();

                    // Inner road
                    ctx.strokeStyle = this.colors.road;
                    ctx.lineWidth = width - 2;
                    ctx.beginPath();
                    street.points.forEach((p, i) => {
                        if (i === 0) ctx.moveTo(p.x, p.y);
                        else ctx.lineTo(p.x, p.y);
                    });
                    ctx.stroke();
                }
            });
        }

        /**
         * Draw bridges
         */
        drawBridges() {
            if (!this.city.bridges || this.city.bridges.length === 0) return;

            const ctx = this.ctx;

            this.city.bridges.forEach(bridge => {
                ctx.save();
                ctx.translate(bridge.x, bridge.y);
                ctx.rotate(bridge.angle);

                // Bridge shadow
                if (this.style.shadows) {
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
                    ctx.fillRect(
                        -bridge.length / 2 + 2,
                        -bridge.width / 2 + 2,
                        bridge.length,
                        bridge.width
                    );
                }

                // Bridge base
                ctx.fillStyle = this.colors.bridge;
                ctx.strokeStyle = this.colors.wallStroke;
                ctx.lineWidth = 2;

                ctx.fillRect(
                    -bridge.length / 2,
                    -bridge.width / 2,
                    bridge.length,
                    bridge.width
                );
                ctx.strokeRect(
                    -bridge.length / 2,
                    -bridge.width / 2,
                    bridge.length,
                    bridge.width
                );

                // Bridge rails
                ctx.strokeStyle = this.colors.wall;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(-bridge.length / 2, -bridge.width / 2);
                ctx.lineTo(bridge.length / 2, -bridge.width / 2);
                ctx.moveTo(-bridge.length / 2, bridge.width / 2);
                ctx.lineTo(bridge.length / 2, bridge.width / 2);
                ctx.stroke();

                ctx.restore();
            });
        }

        /**
         * Draw buildings
         */
        drawBuildings() {
            const ctx = this.ctx;

            // Sort buildings by Y position for pseudo-3D effect
            const sortedBuildings = [...this.city.buildings].sort((a, b) => a.y - b.y);

            sortedBuildings.forEach(building => {
                const buildingStyle = this.colors.buildings[building.type] ||
                    this.colors.buildings.house;

                // Building shadow
                if (this.style.shadows) {
                    ctx.save();
                    ctx.translate(3, 3);
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
                    ctx.beginPath();
                    this.drawPolygonPath(building.footprint);
                    ctx.closePath();
                    ctx.fill();
                    ctx.restore();
                }

                // Building base
                ctx.fillStyle = buildingStyle.fill;
                ctx.strokeStyle = buildingStyle.stroke;
                ctx.lineWidth = 1;

                ctx.beginPath();
                this.drawPolygonPath(building.footprint);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Roof indication (lighter interior)
                if (buildingStyle.roof !== 'transparent' && this.style.mode !== 'blueprint') {
                    ctx.fillStyle = this.hexToRgba(buildingStyle.roof, 0.3);
                    ctx.beginPath();
                    this.drawInsetPolygon(building.footprint, 2);
                    ctx.closePath();
                    ctx.fill();
                }
            });
        }

        /**
         * Draw inset polygon (for roof effect)
         * @param {Array} polygon
         * @param {number} inset
         */
        drawInsetPolygon(polygon, inset) {
            if (!polygon || polygon.length < 3) return;

            const ctx = this.ctx;

            // Calculate centroid
            let cx = 0, cy = 0;
            polygon.forEach(p => { cx += p.x; cy += p.y; });
            cx /= polygon.length;
            cy /= polygon.length;

            // Draw inset polygon
            polygon.forEach((p, i) => {
                const dx = cx - p.x;
                const dy = cy - p.y;
                const len = Math.hypot(dx, dy);
                const nx = p.x + (dx / len) * inset;
                const ny = p.y + (dy / len) * inset;

                if (i === 0) ctx.moveTo(nx, ny);
                else ctx.lineTo(nx, ny);
            });
        }

        /**
         * Draw walls and fortifications
         */
        drawWalls() {
            if (!this.city.walls) return;

            const ctx = this.ctx;
            const walls = this.city.walls;

            // Draw wall shadow
            if (this.style.shadows) {
                ctx.save();
                ctx.translate(4, 4);
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
                ctx.lineWidth = walls.thickness + 4;
                ctx.lineCap = 'square';
                ctx.lineJoin = 'miter';

                ctx.beginPath();
                walls.path.forEach((p, i) => {
                    if (i === 0) ctx.moveTo(p.x, p.y);
                    else ctx.lineTo(p.x, p.y);
                });
                ctx.closePath();
                ctx.stroke();
                ctx.restore();
            }

            // Draw wall base
            ctx.strokeStyle = this.colors.wall;
            ctx.lineWidth = walls.thickness + 4;
            ctx.lineCap = 'square';
            ctx.lineJoin = 'miter';

            ctx.beginPath();
            walls.path.forEach((p, i) => {
                if (i === 0) ctx.moveTo(p.x, p.y);
                else ctx.lineTo(p.x, p.y);
            });
            ctx.closePath();
            ctx.stroke();

            // Draw wall top
            ctx.strokeStyle = this.colors.wallStroke;
            ctx.lineWidth = walls.thickness;

            ctx.beginPath();
            walls.path.forEach((p, i) => {
                if (i === 0) ctx.moveTo(p.x, p.y);
                else ctx.lineTo(p.x, p.y);
            });
            ctx.closePath();
            ctx.stroke();

            // Draw crenellations (for non-blueprint styles)
            if (this.style.mode !== 'blueprint') {
                this.drawCrenellations(walls.path);
            }

            // Draw towers
            walls.towers.forEach(tower => {
                const radius = tower.radius || 10;

                // Tower shadow
                if (this.style.shadows) {
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
                    ctx.beginPath();
                    ctx.arc(tower.x + 3, tower.y + 3, radius + 2, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Tower base
                ctx.fillStyle = this.colors.tower;
                ctx.strokeStyle = this.colors.wallStroke;
                ctx.lineWidth = 2;

                ctx.beginPath();
                ctx.arc(tower.x, tower.y, radius + 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                // Tower top
                ctx.fillStyle = this.colors.wall;
                ctx.beginPath();
                ctx.arc(tower.x, tower.y, radius - 2, 0, Math.PI * 2);
                ctx.fill();

                // Tower crenellations
                if (this.style.mode !== 'blueprint') {
                    ctx.fillStyle = this.colors.tower;
                    for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
                        const x = tower.x + Math.cos(a) * (radius + 1);
                        const y = tower.y + Math.sin(a) * (radius + 1);
                        ctx.fillRect(x - 2, y - 2, 4, 4);
                    }
                }
            });

            // Draw gates
            walls.gates.forEach(gate => {
                // Gate opening
                ctx.fillStyle = this.colors.road;
                ctx.strokeStyle = this.colors.gate;
                ctx.lineWidth = 3;

                ctx.beginPath();
                ctx.arc(gate.x, gate.y, 10, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                // Gate arch
                ctx.strokeStyle = this.colors.gate;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(gate.x, gate.y, 12, 0, Math.PI * 2);
                ctx.stroke();
            });
        }

        /**
         * Draw wall crenellations
         * @param {Array} path
         */
        drawCrenellations(path) {
            const ctx = this.ctx;
            const spacing = 8;

            ctx.fillStyle = this.colors.wall;

            for (let i = 0; i < path.length; i++) {
                const p1 = path[i];
                const p2 = path[(i + 1) % path.length];

                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;
                const len = Math.hypot(dx, dy);
                const steps = Math.floor(len / spacing);

                const nx = -dy / len;
                const ny = dx / len;

                for (let j = 0; j < steps; j += 2) {
                    const t = j / steps;
                    const x = p1.x + dx * t;
                    const y = p1.y + dy * t;

                    ctx.fillRect(x + nx * 3 - 2, y + ny * 3 - 2, 4, 4);
                }
            }
        }

        /**
         * Draw Points of Interest
         */
        drawPOIs() {
            const ctx = this.ctx;

            this.city.pois.forEach(poi => {
                const isHovered = this.hoveredElement &&
                    this.hoveredElement.type === 'poi' &&
                    this.hoveredElement.data === poi;
                const isSelected = this.selectedElement &&
                    this.selectedElement.type === 'poi' &&
                    this.selectedElement.data === poi;

                const radius = isHovered || isSelected ? 8 : 6;

                // Marker shadow
                if (this.style.shadows) {
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
                    ctx.beginPath();
                    ctx.arc(poi.x + 2, poi.y + 2, radius, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Marker background
                ctx.fillStyle = isSelected ? '#fff' : this.colors.gate;
                ctx.beginPath();
                ctx.arc(poi.x, poi.y, radius, 0, Math.PI * 2);
                ctx.fill();

                // Marker border
                ctx.strokeStyle = isSelected ? this.colors.gate : this.colors.text;
                ctx.lineWidth = 2;
                ctx.stroke();

                // Icon based on POI type
                ctx.fillStyle = isSelected ? this.colors.gate : this.colors.text;
                ctx.font = `${radius}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

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

                const icon = icons[poi.type] || '•';
                ctx.fillText(icon, poi.x, poi.y);
            });
        }

        /**
         * Draw labels
         */
        drawLabels() {
            const ctx = this.ctx;

            // Only show labels at sufficient zoom
            if (this.view.zoom < 0.5) return;

            // City name (always visible)
            if (this.city.name && this.view.zoom >= 0.3) {
                ctx.font = 'bold 20px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                const x = this.city.bounds.centerX;
                const y = -20;

                // Text outline
                ctx.strokeStyle = this.colors.textShadow;
                ctx.lineWidth = 4;
                ctx.lineJoin = 'round';
                ctx.strokeText(this.city.name, x, y);

                ctx.fillStyle = this.colors.text;
                ctx.fillText(this.city.name, x, y);
            }

            // District names
            if (this.view.zoom >= 0.6) {
                ctx.font = 'bold 14px sans-serif';

                this.city.districts.forEach(district => {
                    // Text outline
                    ctx.strokeStyle = this.colors.textShadow;
                    ctx.lineWidth = 3;
                    ctx.lineJoin = 'round';
                    ctx.strokeText(district.name, district.center.x, district.center.y);

                    ctx.fillStyle = this.colors.text;
                    ctx.fillText(district.name, district.center.x, district.center.y);
                });
            }

            // POI names (only when zoomed in or hovered)
            if (this.view.zoom >= 1.0) {
                ctx.font = '11px sans-serif';

                this.city.pois.forEach(poi => {
                    const isHovered = this.hoveredElement &&
                        this.hoveredElement.type === 'poi' &&
                        this.hoveredElement.data === poi;

                    if (poi.importance === 'major' || isHovered || this.view.zoom >= 1.5) {
                        // Text outline
                        ctx.strokeStyle = this.colors.textShadow;
                        ctx.lineWidth = 2;
                        ctx.strokeText(poi.name, poi.x, poi.y - 15);

                        ctx.fillStyle = this.colors.text;
                        ctx.fillText(poi.name, poi.x, poi.y - 15);
                    }
                });
            }
        }

        /**
         * Draw selection/hover highlights
         */
        drawHighlights() {
            const ctx = this.ctx;

            // Hovered district
            if (this.hoveredElement && this.hoveredElement.type === 'district') {
                const district = this.hoveredElement.data;
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 3;
                ctx.setLineDash([5, 5]);

                ctx.beginPath();
                this.drawPolygonPath(district.polygon);
                ctx.closePath();
                ctx.stroke();
                ctx.setLineDash([]);
            }

            // Selected building
            if (this.selectedElement && this.selectedElement.type === 'building') {
                const building = this.selectedElement.data;
                ctx.strokeStyle = '#ffd700';
                ctx.lineWidth = 3;

                ctx.beginPath();
                this.drawPolygonPath(building.footprint);
                ctx.closePath();
                ctx.stroke();
            }
        }

        /**
         * Draw UI overlay (minimap, compass, etc.)
         */
        drawOverlay() {
            // Could add minimap, compass, scale bar here
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
         * Toggle layer visibility
         * @param {string} layer - Layer name
         */
        toggleLayer(layer) {
            if (this.layers.hasOwnProperty(layer)) {
                this.layers[layer] = !this.layers[layer];
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
            const centerX = this.displayWidth / 2;
            const centerY = this.displayHeight / 2;

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
            this.setZoom(2);
        }

        /**
         * Focus on a point
         * @param {number} x - World X
         * @param {number} y - World Y
         */
        focusOnPoint(x, y) {
            this.view.x = this.displayWidth / 2 - x * this.view.zoom;
            this.view.y = this.displayHeight / 2 - y * this.view.zoom;
            this.render();
        }

        /**
         * Export canvas to image
         * @param {string} format - Image format ('png' or 'jpeg')
         * @returns {string} Data URL
         */
        exportImage(format = 'png') {
            // Create export canvas at higher resolution
            const exportCanvas = document.createElement('canvas');
            const scale = 2;
            exportCanvas.width = this.city.bounds.width * scale;
            exportCanvas.height = this.city.bounds.height * scale;

            const exportCtx = exportCanvas.getContext('2d');
            exportCtx.scale(scale, scale);

            // Temporarily swap context
            const originalCtx = this.ctx;
            const originalView = { ...this.view };

            this.ctx = exportCtx;
            this.view = { x: 0, y: 0, zoom: 1, minZoom: 0.25, maxZoom: 4 };

            // Render to export canvas
            exportCtx.fillStyle = this.colors.background;
            exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

            // Draw all layers
            if (this.layers.terrain) this.drawTerrain();
            if (this.layers.water) this.drawWater();
            if (this.layers.districts) this.drawDistricts();
            if (this.layers.streets) this.drawStreets();
            if (this.layers.bridges) this.drawBridges();
            if (this.layers.buildings) this.drawBuildings();
            if (this.layers.walls) this.drawWalls();
            if (this.layers.pois) this.drawPOIs();
            if (this.layers.labels) this.drawLabels();

            // Restore original context
            this.ctx = originalCtx;
            this.view = originalView;

            return exportCanvas.toDataURL(`image/${format}`);
        }

        /**
         * Get element at screen position
         * @param {number} screenX
         * @param {number} screenY
         * @returns {Object|null}
         */
        getElementAt(screenX, screenY) {
            if (!this.city) return null;

            // Convert to world coordinates
            const worldX = (screenX - this.view.x) / this.view.zoom;
            const worldY = (screenY - this.view.y) / this.view.zoom;

            // Check POIs first (highest priority)
            for (const poi of this.city.pois) {
                const dist = Math.hypot(poi.x - worldX, poi.y - worldY);
                if (dist < 10) {
                    return { type: 'poi', data: poi };
                }
            }

            // Check buildings
            for (const building of this.city.buildings) {
                if (this.pointInPolygon({ x: worldX, y: worldY }, building.footprint)) {
                    return { type: 'building', data: building };
                }
            }

            // Check districts
            for (const district of this.city.districts) {
                if (this.pointInPolygon({ x: worldX, y: worldY }, district.polygon)) {
                    return { type: 'district', data: district };
                }
            }

            return null;
        }

        /**
         * Point in polygon test
         * @param {Object} point
         * @param {Array} polygon
         * @returns {boolean}
         */
        pointInPolygon(point, polygon) {
            if (!polygon || polygon.length < 3) return false;

            let inside = false;
            const n = polygon.length;

            for (let i = 0, j = n - 1; i < n; j = i++) {
                const xi = polygon[i].x, yi = polygon[i].y;
                const xj = polygon[j].x, yj = polygon[j].y;

                if (((yi > point.y) !== (yj > point.y)) &&
                    (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
                    inside = !inside;
                }
            }

            return inside;
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
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            if (this.isDragging) {
                const dx = e.clientX - this.lastMouse.x;
                const dy = e.clientY - this.lastMouse.y;

                this.view.x += dx;
                this.view.y += dy;

                this.lastMouse = { x: e.clientX, y: e.clientY };
                this.render();
            } else {
                // Update hover state
                const element = this.getElementAt(x, y);
                if (element !== this.hoveredElement) {
                    this.hoveredElement = element;
                    this.render();

                    // Update cursor
                    this.canvas.style.cursor = element ? 'pointer' : 'grab';
                }
            }
        }

        onMouseUp() {
            this.isDragging = false;
            this.canvas.style.cursor = this.hoveredElement ? 'pointer' : 'grab';
        }

        onClick(e) {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const element = this.getElementAt(x, y);
            this.selectedElement = element;
            this.render();

            // Dispatch custom event
            if (element) {
                this.canvas.dispatchEvent(new CustomEvent('elementSelected', {
                    detail: element
                }));
            }
        }

        onDoubleClick(e) {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const element = this.getElementAt(x, y);
            if (element) {
                if (element.type === 'district') {
                    this.focusOnPoint(element.data.center.x, element.data.center.y);
                    this.setZoom(1.5);
                } else if (element.type === 'poi') {
                    this.focusOnPoint(element.data.x, element.data.y);
                    this.setZoom(2);
                }
            }
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
            } else if (e.touches.length === 2) {
                // Pinch zoom start
                this.isPinching = true;
                this.lastPinchDist = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
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
            } else if (this.isPinching && e.touches.length === 2) {
                e.preventDefault();

                const dist = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );

                const scale = dist / this.lastPinchDist;
                this.setZoom(this.view.zoom * scale);
                this.lastPinchDist = dist;
            }
        }

        onTouchEnd() {
            this.isDragging = false;
            this.isPinching = false;
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
            if (hex === 'transparent') return 'transparent';
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }
    }

    // Export
    window.CityRenderer = CityRenderer;

})(window);
