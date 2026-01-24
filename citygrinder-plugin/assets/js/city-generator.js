/**
 * CityGrinder - City Generator
 *
 * Procedural city generation engine.
 * This is a placeholder that will be fully implemented in Phase 2.
 *
 * @package CityGrinder
 * @version 1.0.0
 */

(function(window) {
    'use strict';

    /**
     * City Generator Class
     * Procedurally generates medieval fantasy cities from a seed
     */
    class CityGenerator {
        /**
         * Constructor
         * @param {Object} options - Generation options
         */
        constructor(options = {}) {
            this.seed = options.seed || this.generateSeed();
            this.rng = new Math.seedrandom(this.seed);

            this.config = {
                cityType: options.cityType || 'town',
                sizeClass: options.sizeClass || 'medium',
                hasWalls: options.hasWalls !== false,
                hasRiver: options.hasRiver || false,
                isCoastal: options.isCoastal || false,
                ...options
            };

            this.city = null;
        }

        /**
         * Generate a random seed
         * @returns {string}
         */
        generateSeed() {
            return Math.random().toString(36).substring(2, 15);
        }

        /**
         * Get a random number between 0 and 1
         * @returns {number}
         */
        random() {
            return this.rng();
        }

        /**
         * Get a random integer in range
         * @param {number} min - Minimum value
         * @param {number} max - Maximum value
         * @returns {number}
         */
        randomInt(min, max) {
            return Math.floor(this.random() * (max - min + 1)) + min;
        }

        /**
         * Get a random element from array
         * @param {Array} array - Source array
         * @returns {*}
         */
        randomChoice(array) {
            return array[Math.floor(this.random() * array.length)];
        }

        /**
         * Generate the city
         * @returns {Object} City data
         */
        generate() {
            // Initialize city structure
            this.city = {
                seed: this.seed,
                config: this.config,
                name: this.generateCityName(),
                bounds: this.calculateBounds(),
                districts: [],
                streets: [],
                buildings: [],
                walls: null,
                water: null,
                pois: [],
                population: 0
            };

            // Generation pipeline
            this.generateTerrain();
            this.generateDistricts();
            this.generateStreets();
            this.generateBuildings();

            if (this.config.hasWalls) {
                this.generateWalls();
            }

            this.generatePOIs();
            this.calculatePopulation();

            return this.city;
        }

        /**
         * Calculate city bounds based on size class
         * @returns {Object}
         */
        calculateBounds() {
            const sizes = {
                hamlet: { width: 200, height: 200 },
                village: { width: 400, height: 400 },
                town: { width: 600, height: 600 },
                city: { width: 900, height: 900 },
                metropolis: { width: 1200, height: 1200 }
            };

            const size = sizes[this.config.sizeClass] || sizes.town;
            return {
                x: 0,
                y: 0,
                width: size.width,
                height: size.height,
                centerX: size.width / 2,
                centerY: size.height / 2
            };
        }

        /**
         * Generate city name
         * @returns {string}
         */
        generateCityName() {
            const prefixes = ['North', 'South', 'East', 'West', 'Old', 'New', 'High', 'Low', 'Green', 'Black', 'White', 'Red', 'Gold', 'Silver', 'Iron'];
            const roots = ['haven', 'ford', 'bury', 'ton', 'wick', 'ham', 'bridge', 'field', 'dale', 'vale', 'wood', 'holm', 'gate', 'port', 'keep'];

            const usePrefix = this.random() > 0.5;
            const prefix = usePrefix ? this.randomChoice(prefixes) : '';
            const root = this.randomChoice(roots);

            return prefix + root.charAt(0).toUpperCase() + root.slice(1);
        }

        /**
         * Generate terrain features (water)
         */
        generateTerrain() {
            if (this.config.hasRiver) {
                this.city.water = this.generateRiver();
            } else if (this.config.isCoastal) {
                this.city.water = this.generateCoastline();
            }
        }

        /**
         * Generate a river
         * @returns {Object}
         */
        generateRiver() {
            const bounds = this.city.bounds;
            const points = [];

            // Start from edge
            let x = 0;
            let y = this.randomInt(bounds.height * 0.3, bounds.height * 0.7);
            points.push({ x, y });

            // Meander to other side
            const segments = this.randomInt(4, 8);
            for (let i = 0; i < segments; i++) {
                x = (i + 1) * (bounds.width / segments);
                y += this.randomInt(-50, 50);
                y = Math.max(50, Math.min(bounds.height - 50, y));
                points.push({ x, y });
            }

            return {
                type: 'river',
                points: points,
                width: this.randomInt(20, 40)
            };
        }

        /**
         * Generate a coastline
         * @returns {Object}
         */
        generateCoastline() {
            const bounds = this.city.bounds;
            const side = this.randomInt(0, 3);
            const points = [];
            const segments = 20;

            for (let i = 0; i <= segments; i++) {
                const t = i / segments;
                let x, y;
                const offset = (this.random() - 0.5) * 60;

                switch (side) {
                    case 0: x = bounds.width * 0.2 + offset; y = t * bounds.height; break;
                    case 1: x = bounds.width * 0.8 + offset; y = t * bounds.height; break;
                    case 2: x = t * bounds.width; y = bounds.height * 0.2 + offset; break;
                    case 3: x = t * bounds.width; y = bounds.height * 0.8 + offset; break;
                }
                points.push({ x, y });
            }

            return {
                type: 'coast',
                side: side,
                points: points
            };
        }

        /**
         * Generate districts
         */
        generateDistricts() {
            const bounds = this.city.bounds;
            const count = this.getDistrictCount();

            // Generate district centers using relaxed random distribution
            const centers = this.generateDistrictCenters(count);

            // District types based on position and random
            const types = ['market', 'residential', 'noble', 'craftsmen', 'temple', 'docks', 'slums', 'military'];

            // Create districts
            this.city.districts = centers.map((center, i) => {
                // Central district is usually market or noble
                let type;
                if (i === 0) {
                    type = this.random() > 0.5 ? 'market' : 'noble';
                } else {
                    type = this.randomChoice(types);
                }

                return {
                    id: i,
                    type: type,
                    name: this.generateDistrictName(type),
                    center: center,
                    polygon: this.generateDistrictPolygon(center, bounds, count),
                    area: 0 // Will be calculated after polygon
                };
            });

            // Calculate areas
            this.city.districts.forEach(district => {
                district.area = this.calculatePolygonArea(district.polygon);
            });
        }

        /**
         * Get district count based on size
         * @returns {number}
         */
        getDistrictCount() {
            const counts = {
                hamlet: 2,
                village: 3,
                town: 5,
                city: 8,
                metropolis: 12
            };
            return counts[this.config.sizeClass] || 5;
        }

        /**
         * Generate district center points
         * @param {number} count - Number of districts
         * @returns {Array}
         */
        generateDistrictCenters(count) {
            const bounds = this.city.bounds;
            const points = [];
            const margin = 60;

            // First point near center
            points.push({
                x: bounds.centerX + (this.random() - 0.5) * 50,
                y: bounds.centerY + (this.random() - 0.5) * 50
            });

            // Rest using Poisson-like distribution
            for (let i = 1; i < count; i++) {
                let best = null;
                let bestDist = 0;

                for (let j = 0; j < 30; j++) {
                    const candidate = {
                        x: margin + this.random() * (bounds.width - margin * 2),
                        y: margin + this.random() * (bounds.height - margin * 2)
                    };

                    const minDist = Math.min(...points.map(p =>
                        Math.hypot(p.x - candidate.x, p.y - candidate.y)
                    ));

                    if (minDist > bestDist) {
                        bestDist = minDist;
                        best = candidate;
                    }
                }

                points.push(best);
            }

            return points;
        }

        /**
         * Generate district polygon (simplified Voronoi)
         * @param {Object} center - District center
         * @param {Object} bounds - City bounds
         * @param {number} count - Total district count
         * @returns {Array}
         */
        generateDistrictPolygon(center, bounds, count) {
            // Simplified: create a rough polygon around center
            const radius = Math.min(bounds.width, bounds.height) / (count * 0.8);
            const sides = this.randomInt(5, 8);
            const polygon = [];

            for (let i = 0; i < sides; i++) {
                const angle = (i / sides) * Math.PI * 2;
                const r = radius * (0.7 + this.random() * 0.6);
                polygon.push({
                    x: center.x + Math.cos(angle) * r,
                    y: center.y + Math.sin(angle) * r
                });
            }

            return polygon;
        }

        /**
         * Generate district name
         * @param {string} type - District type
         * @returns {string}
         */
        generateDistrictName(type) {
            const prefixes = {
                market: ['Market', 'Trade', 'Merchant', 'Commerce', 'Guild'],
                residential: ['Common', 'Garden', 'Hearth', 'Home', 'Green'],
                noble: ['High', 'Noble', 'Crown', 'Silver', 'Royal'],
                craftsmen: ['Craft', 'Forge', 'Guild', 'Hammer', 'Anvil'],
                temple: ['Temple', 'Sacred', 'Divine', 'Holy', 'Blessed'],
                docks: ['Harbor', 'Dock', 'Port', 'Sailor', 'Fisher'],
                slums: ['Shadow', 'Outer', 'Lower', 'Mud', 'Beggar'],
                military: ['Garrison', 'Watch', 'Guard', 'Fort', 'Shield']
            };

            const suffixes = ['Quarter', 'Ward', 'District', 'Borough', 'End'];

            const prefix = this.randomChoice(prefixes[type] || prefixes.residential);
            const suffix = this.randomChoice(suffixes);

            return `${prefix} ${suffix}`;
        }

        /**
         * Generate street network
         */
        generateStreets() {
            this.city.streets = [];

            // Main roads connecting district centers
            const districts = this.city.districts;
            for (let i = 0; i < districts.length; i++) {
                for (let j = i + 1; j < districts.length; j++) {
                    const dist = Math.hypot(
                        districts[i].center.x - districts[j].center.x,
                        districts[i].center.y - districts[j].center.y
                    );

                    if (dist < this.city.bounds.width * 0.5) {
                        this.city.streets.push({
                            type: 'main',
                            points: [districts[i].center, districts[j].center],
                            width: 8
                        });
                    }
                }
            }

            // Secondary streets within districts
            districts.forEach(district => {
                const count = this.randomInt(2, 4);
                for (let i = 0; i < count; i++) {
                    const start = {
                        x: district.center.x + (this.random() - 0.5) * 80,
                        y: district.center.y + (this.random() - 0.5) * 80
                    };
                    const end = {
                        x: district.center.x + (this.random() - 0.5) * 80,
                        y: district.center.y + (this.random() - 0.5) * 80
                    };

                    this.city.streets.push({
                        type: 'secondary',
                        points: [start, end],
                        width: 4
                    });
                }
            });
        }

        /**
         * Generate buildings
         */
        generateBuildings() {
            this.city.buildings = [];

            this.city.districts.forEach(district => {
                const count = this.getBuildingCount(district);

                for (let i = 0; i < count; i++) {
                    const building = this.generateBuilding(district);
                    if (building) {
                        this.city.buildings.push(building);
                    }
                }
            });
        }

        /**
         * Get building count for district
         * @param {Object} district - District data
         * @returns {number}
         */
        getBuildingCount(district) {
            const base = {
                hamlet: 5,
                village: 15,
                town: 30,
                city: 50,
                metropolis: 80
            };

            const baseCount = base[this.config.sizeClass] || 30;
            return Math.floor(baseCount * (0.7 + this.random() * 0.6));
        }

        /**
         * Generate a building
         * @param {Object} district - Parent district
         * @returns {Object}
         */
        generateBuilding(district) {
            const x = district.center.x + (this.random() - 0.5) * 100;
            const y = district.center.y + (this.random() - 0.5) * 100;

            const width = this.randomInt(8, 20);
            const height = this.randomInt(8, 20);
            const rotation = this.random() * Math.PI * 0.25;

            const buildingTypes = {
                market: ['shop', 'warehouse', 'inn', 'tavern'],
                residential: ['house', 'house', 'house', 'apartment'],
                noble: ['mansion', 'estate', 'garden', 'villa'],
                craftsmen: ['workshop', 'smithy', 'tannery', 'house'],
                temple: ['shrine', 'chapel', 'hospice', 'house'],
                docks: ['warehouse', 'tavern', 'fishery', 'shack'],
                slums: ['shack', 'hovel', 'house', 'den'],
                military: ['barracks', 'armory', 'stable', 'house']
            };

            const type = this.randomChoice(buildingTypes[district.type] || buildingTypes.residential);

            return {
                districtId: district.id,
                x, y,
                width, height,
                rotation,
                type: type,
                footprint: this.generateBuildingFootprint(x, y, width, height, rotation)
            };
        }

        /**
         * Generate building footprint polygon
         * @param {number} x - Center X
         * @param {number} y - Center Y
         * @param {number} width - Width
         * @param {number} height - Height
         * @param {number} rotation - Rotation angle
         * @returns {Array}
         */
        generateBuildingFootprint(x, y, width, height, rotation) {
            const corners = [
                { x: -width/2, y: -height/2 },
                { x: width/2, y: -height/2 },
                { x: width/2, y: height/2 },
                { x: -width/2, y: height/2 }
            ];

            return corners.map(c => ({
                x: x + c.x * Math.cos(rotation) - c.y * Math.sin(rotation),
                y: y + c.x * Math.sin(rotation) + c.y * Math.cos(rotation)
            }));
        }

        /**
         * Generate walls
         */
        generateWalls() {
            const bounds = this.city.bounds;
            const margin = 25;

            // Simple rectangular walls
            const path = [
                { x: margin, y: margin },
                { x: bounds.width - margin, y: margin },
                { x: bounds.width - margin, y: bounds.height - margin },
                { x: margin, y: bounds.height - margin }
            ];

            // Gates on each side
            const gates = [
                { x: bounds.centerX, y: margin, direction: 'north' },
                { x: bounds.centerX, y: bounds.height - margin, direction: 'south' },
                { x: margin, y: bounds.centerY, direction: 'west' },
                { x: bounds.width - margin, y: bounds.centerY, direction: 'east' }
            ];

            // Towers at corners
            const towers = path.map(p => ({ x: p.x, y: p.y, type: 'corner' }));

            this.city.walls = {
                path: path,
                gates: gates,
                towers: towers,
                thickness: 6
            };
        }

        /**
         * Generate Points of Interest
         */
        generatePOIs() {
            this.city.pois = [];

            // Central landmark
            this.city.pois.push({
                type: 'landmark',
                name: this.generateLandmarkName(),
                x: this.city.bounds.centerX,
                y: this.city.bounds.centerY,
                description: 'The central landmark of the city'
            });

            // POIs based on districts
            this.city.districts.forEach(district => {
                if (district.type === 'temple') {
                    this.city.pois.push({
                        type: 'temple',
                        name: this.generateTempleName(),
                        x: district.center.x,
                        y: district.center.y,
                        districtId: district.id
                    });
                }

                if (district.type === 'market') {
                    this.city.pois.push({
                        type: 'market',
                        name: 'Central Market',
                        x: district.center.x,
                        y: district.center.y,
                        districtId: district.id
                    });
                }
            });
        }

        /**
         * Generate landmark name
         * @returns {string}
         */
        generateLandmarkName() {
            const types = ['Castle', 'Keep', 'Tower', 'Palace', 'Citadel', 'Hall'];
            const adjectives = ['Grand', 'Royal', 'Ancient', 'Great', 'Old', 'High'];
            return `The ${this.randomChoice(adjectives)} ${this.randomChoice(types)}`;
        }

        /**
         * Generate temple name
         * @returns {string}
         */
        generateTempleName() {
            const deities = ['Light', 'Sun', 'Moon', 'Stars', 'Dawn', 'Storm', 'Sea', 'Earth'];
            return `Temple of the ${this.randomChoice(deities)}`;
        }

        /**
         * Calculate city population
         */
        calculatePopulation() {
            const base = {
                hamlet: 50,
                village: 300,
                town: 2000,
                city: 10000,
                metropolis: 50000
            };

            const baseValue = base[this.config.sizeClass] || 2000;
            const variance = 0.8 + this.random() * 0.4;

            this.city.population = Math.floor(baseValue * variance);
        }

        /**
         * Calculate polygon area
         * @param {Array} polygon - Array of points
         * @returns {number}
         */
        calculatePolygonArea(polygon) {
            let area = 0;
            const n = polygon.length;

            for (let i = 0; i < n; i++) {
                const j = (i + 1) % n;
                area += polygon[i].x * polygon[j].y;
                area -= polygon[j].x * polygon[i].y;
            }

            return Math.abs(area / 2);
        }
    }

    // Export
    window.CityGenerator = CityGenerator;

})(window);
