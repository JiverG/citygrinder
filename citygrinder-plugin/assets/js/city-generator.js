/**
 * CityGrinder - City Generator
 *
 * Procedural city generation engine using Voronoi diagrams and
 * various procedural techniques to create medieval fantasy cities.
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

            // Initialize seeded random - seedrandom extends Math with seedrandom function
            if (typeof Math.seedrandom === 'function') {
                this.rng = new Math.seedrandom(this.seed);
            } else {
                // Fallback to simple seeded random if seedrandom not loaded
                console.warn('CityGrinder: seedrandom not loaded, using fallback');
                this.rng = this.createFallbackRng(this.seed);
            }

            this.config = {
                cityType: options.cityType || 'town',
                sizeClass: options.sizeClass || 'medium',
                hasWalls: options.hasWalls !== false,
                hasRiver: options.hasRiver || false,
                isCoastal: options.isCoastal || false,
                gridStyle: options.gridStyle || 'organic', // 'organic', 'grid', 'radial'
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
         * Create a fallback seeded random generator
         * Uses a simple mulberry32 algorithm
         * @param {string} seed - Seed string
         * @returns {function}
         */
        createFallbackRng(seed) {
            // Convert string seed to number
            let h = 0;
            for (let i = 0; i < seed.length; i++) {
                h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
            }

            // Mulberry32 PRNG
            return function() {
                h |= 0;
                h = h + 0x6D2B79F5 | 0;
                let t = Math.imul(h ^ h >>> 15, 1 | h);
                t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
                return ((t ^ t >>> 14) >>> 0) / 4294967296;
            };
        }

        /**
         * Get seeded random number between 0 and 1
         * @returns {number}
         */
        random() {
            return this.rng();
        }

        /**
         * Get random integer in range [min, max]
         * @param {number} min
         * @param {number} max
         * @returns {number}
         */
        randomInt(min, max) {
            return Math.floor(this.random() * (max - min + 1)) + min;
        }

        /**
         * Get random float in range [min, max]
         * @param {number} min
         * @param {number} max
         * @returns {number}
         */
        randomFloat(min, max) {
            return min + this.random() * (max - min);
        }

        /**
         * Get random element from array
         * @param {Array} array
         * @returns {*}
         */
        randomChoice(array) {
            return array[Math.floor(this.random() * array.length)];
        }

        /**
         * Shuffle array using Fisher-Yates
         * @param {Array} array
         * @returns {Array}
         */
        shuffle(array) {
            const result = [...array];
            for (let i = result.length - 1; i > 0; i--) {
                const j = Math.floor(this.random() * (i + 1));
                [result[i], result[j]] = [result[j], result[i]];
            }
            return result;
        }

        // =====================================================================
        // MAIN GENERATION
        // =====================================================================

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
                citadel: null,
                suburbs: [],
                water: null,
                bridges: [],
                pois: [],
                population: 0
            };

            // Generation pipeline
            this.generateTerrain();
            this.generateDistricts();

            // Generate walls before streets so streets can connect to gates
            if (this.config.hasWalls) {
                this.generateWalls();
            }

            this.generateStreets();

            // Generate central citadel (castle/keep)
            if (this.config.sizeClass !== 'hamlet') {
                this.generateCitadel();
            }

            // Generate buildings inside walls
            this.generateBuildings();

            // Generate suburb buildings outside walls
            if (this.config.hasWalls && this.config.sizeClass !== 'hamlet') {
                this.generateSuburbs();
            }

            if (this.city.water && this.city.water.type === 'river') {
                this.generateBridges();
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
                hamlet: { width: 250, height: 250, padding: 30 },
                village: { width: 400, height: 400, padding: 40 },
                town: { width: 600, height: 600, padding: 50 },
                city: { width: 900, height: 900, padding: 60 },
                metropolis: { width: 1200, height: 1200, padding: 80 }
            };

            const size = sizes[this.config.sizeClass] || sizes.town;
            return {
                x: 0,
                y: 0,
                width: size.width,
                height: size.height,
                padding: size.padding,
                centerX: size.width / 2,
                centerY: size.height / 2
            };
        }

        // =====================================================================
        // NAME GENERATION
        // =====================================================================

        /**
         * Generate city name
         * @returns {string}
         */
        generateCityName() {
            const patterns = [
                () => this.randomChoice(this.namePrefixes) + this.randomChoice(this.nameSuffixes),
                () => this.randomChoice(this.nameRoots) + this.randomChoice(this.nameSuffixes),
                () => this.randomChoice(this.namePrefixes) + this.randomChoice(this.nameRoots),
                () => this.randomChoice(this.adjectives) + ' ' + this.randomChoice(this.nameRoots),
            ];

            return this.randomChoice(patterns)();
        }

        get namePrefixes() {
            return ['North', 'South', 'East', 'West', 'Old', 'New', 'High', 'Low',
                    'Green', 'Black', 'White', 'Red', 'Gold', 'Silver', 'Iron',
                    'Stone', 'River', 'Lake', 'Sea', 'Wood', 'Frost', 'Sun'];
        }

        get nameSuffixes() {
            return ['haven', 'ford', 'bury', 'ton', 'wick', 'ham', 'bridge',
                    'field', 'dale', 'vale', 'wood', 'holm', 'gate', 'port',
                    'keep', 'hold', 'watch', 'guard', 'fall', 'mere', 'mouth'];
        }

        get nameRoots() {
            return ['Helm', 'Thor', 'Odin', 'Wolf', 'Raven', 'Eagle', 'Bear',
                    'Lion', 'Dragon', 'Ash', 'Oak', 'Elm', 'Stone', 'Storm',
                    'Frost', 'Fire', 'Wind', 'Water', 'Shadow', 'Light'];
        }

        get adjectives() {
            return ['Ancient', 'Grand', 'Royal', 'Great', 'Noble', 'Proud',
                    'Blessed', 'Sacred', 'Holy', 'Free', 'Fair', 'Bright'];
        }

        // =====================================================================
        // TERRAIN GENERATION
        // =====================================================================

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
         * Generate a river using bezier curves
         * @returns {Object}
         */
        generateRiver() {
            const bounds = this.city.bounds;
            const points = [];
            const controlPoints = [];

            // Determine entry and exit sides
            const entrySide = this.randomInt(0, 3);
            let exitSide = (entrySide + 2) % 4; // Opposite side by default

            // Sometimes exit on adjacent side
            if (this.random() > 0.7) {
                exitSide = (entrySide + (this.random() > 0.5 ? 1 : 3)) % 4;
            }

            // Get start point on entry side
            const start = this.getPointOnSide(entrySide, bounds, 0.3, 0.7);
            points.push(start);

            // Generate meandering path
            const segments = this.randomInt(3, 6);
            for (let i = 1; i < segments; i++) {
                const t = i / segments;

                // Interpolate toward exit
                const end = this.getPointOnSide(exitSide, bounds, 0.3, 0.7);
                const baseX = start.x + (end.x - start.x) * t;
                const baseY = start.y + (end.y - start.y) * t;

                // Add perpendicular offset for meandering
                const perpX = -(end.y - start.y);
                const perpY = end.x - start.x;
                const len = Math.hypot(perpX, perpY);
                const offset = this.randomFloat(-0.2, 0.2) * Math.min(bounds.width, bounds.height);

                points.push({
                    x: Math.max(20, Math.min(bounds.width - 20, baseX + (perpX / len) * offset)),
                    y: Math.max(20, Math.min(bounds.height - 20, baseY + (perpY / len) * offset))
                });
            }

            // Add exit point
            points.push(this.getPointOnSide(exitSide, bounds, 0.3, 0.7));

            // Generate control points for smooth curves
            for (let i = 0; i < points.length - 1; i++) {
                const p0 = points[i];
                const p1 = points[i + 1];
                const midX = (p0.x + p1.x) / 2;
                const midY = (p0.y + p1.y) / 2;

                controlPoints.push({
                    x: midX + this.randomFloat(-30, 30),
                    y: midY + this.randomFloat(-30, 30)
                });
            }

            return {
                type: 'river',
                points: points,
                controlPoints: controlPoints,
                width: this.randomInt(25, 50),
                entrySide: entrySide,
                exitSide: exitSide
            };
        }

        /**
         * Get a point on a side of the bounds
         * @param {number} side - 0=left, 1=right, 2=top, 3=bottom
         * @param {Object} bounds
         * @param {number} minT
         * @param {number} maxT
         * @returns {Object}
         */
        getPointOnSide(side, bounds, minT = 0, maxT = 1) {
            const t = this.randomFloat(minT, maxT);
            switch (side) {
                case 0: return { x: 0, y: t * bounds.height };
                case 1: return { x: bounds.width, y: t * bounds.height };
                case 2: return { x: t * bounds.width, y: 0 };
                case 3: return { x: t * bounds.width, y: bounds.height };
            }
        }

        /**
         * Generate a coastline
         * @returns {Object}
         */
        generateCoastline() {
            const bounds = this.city.bounds;
            const side = this.randomInt(0, 3);
            const points = [];
            const segments = 25;

            // Determine how much of the city is on land
            const landRatio = this.randomFloat(0.6, 0.85);

            for (let i = 0; i <= segments; i++) {
                const t = i / segments;
                let x, y;

                // Base position
                const noise = Math.sin(t * Math.PI * 3) * 20 +
                             Math.sin(t * Math.PI * 7) * 10 +
                             this.randomFloat(-15, 15);

                switch (side) {
                    case 0: // Left coast
                        x = bounds.width * (1 - landRatio) + noise;
                        y = t * bounds.height;
                        break;
                    case 1: // Right coast
                        x = bounds.width * landRatio + noise;
                        y = t * bounds.height;
                        break;
                    case 2: // Top coast
                        x = t * bounds.width;
                        y = bounds.height * (1 - landRatio) + noise;
                        break;
                    case 3: // Bottom coast
                        x = t * bounds.width;
                        y = bounds.height * landRatio + noise;
                        break;
                }

                points.push({ x, y });
            }

            return {
                type: 'coast',
                side: side,
                points: points,
                landRatio: landRatio
            };
        }

        // =====================================================================
        // DISTRICT GENERATION (Voronoi-based)
        // =====================================================================

        /**
         * Generate districts using Voronoi diagram
         */
        generateDistricts() {
            const bounds = this.city.bounds;
            const count = this.getDistrictCount();

            // Generate district seed points using Lloyd relaxation
            const seedPoints = this.generateRelaxedPoints(count, bounds, 3);

            // Create Voronoi diagram using Delaunator
            const voronoi = this.computeVoronoi(seedPoints, bounds);

            // Assign district types intelligently
            const districtTypes = this.assignDistrictTypes(seedPoints, voronoi);

            // Create district objects
            this.city.districts = seedPoints.map((center, i) => ({
                id: i,
                type: districtTypes[i],
                name: this.generateDistrictName(districtTypes[i]),
                center: center,
                polygon: voronoi.cells[i] || this.createFallbackPolygon(center, bounds, count),
                area: 0
            }));

            // Calculate areas and clip to bounds
            this.city.districts.forEach(district => {
                district.polygon = this.clipPolygonToBounds(district.polygon, bounds);
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
                town: this.randomInt(4, 6),
                city: this.randomInt(6, 9),
                metropolis: this.randomInt(9, 14)
            };
            return counts[this.config.sizeClass] || 5;
        }

        /**
         * Generate points using Lloyd relaxation for even distribution
         * @param {number} count
         * @param {Object} bounds
         * @param {number} iterations
         * @returns {Array}
         */
        generateRelaxedPoints(count, bounds, iterations = 3) {
            const padding = bounds.padding;

            // Initial random points
            let points = [];

            // First point near center (important location)
            points.push({
                x: bounds.centerX + this.randomFloat(-30, 30),
                y: bounds.centerY + this.randomFloat(-30, 30)
            });

            // Rest using Poisson disk-like sampling
            for (let i = 1; i < count; i++) {
                let bestPoint = null;
                let bestDist = 0;

                for (let j = 0; j < 50; j++) {
                    const candidate = {
                        x: padding + this.random() * (bounds.width - padding * 2),
                        y: padding + this.random() * (bounds.height - padding * 2)
                    };

                    // Skip if in water
                    if (this.isInWater(candidate)) continue;

                    const minDist = Math.min(...points.map(p =>
                        Math.hypot(p.x - candidate.x, p.y - candidate.y)
                    ));

                    if (minDist > bestDist) {
                        bestDist = minDist;
                        bestPoint = candidate;
                    }
                }

                if (bestPoint) points.push(bestPoint);
            }

            // Lloyd relaxation
            for (let iter = 0; iter < iterations; iter++) {
                const voronoi = this.computeVoronoi(points, bounds);

                points = points.map((p, i) => {
                    const cell = voronoi.cells[i];
                    if (!cell || cell.length < 3) return p;

                    // Calculate centroid
                    const centroid = this.calculateCentroid(cell);

                    // Don't move center point too much
                    if (i === 0) {
                        return {
                            x: p.x * 0.7 + centroid.x * 0.3,
                            y: p.y * 0.7 + centroid.y * 0.3
                        };
                    }

                    // Skip if centroid is in water
                    if (this.isInWater(centroid)) return p;

                    return centroid;
                });
            }

            return points;
        }

        /**
         * Check if point is in water
         * @param {Object} point
         * @returns {boolean}
         */
        isInWater(point) {
            if (!this.city.water) return false;

            const water = this.city.water;

            if (water.type === 'river') {
                // Check distance to river path
                for (let i = 0; i < water.points.length - 1; i++) {
                    const dist = this.pointToLineDistance(
                        point,
                        water.points[i],
                        water.points[i + 1]
                    );
                    if (dist < water.width / 2 + 20) return true;
                }
            } else if (water.type === 'coast') {
                // Check if on water side of coast
                return this.isOnWaterSide(point, water);
            }

            return false;
        }

        /**
         * Check if point is on water side of coastline
         * @param {Object} point
         * @param {Object} water
         * @returns {boolean}
         */
        isOnWaterSide(point, water) {
            const bounds = this.city.bounds;
            const threshold = bounds.width * (1 - water.landRatio);

            switch (water.side) {
                case 0: return point.x < threshold;
                case 1: return point.x > bounds.width - threshold;
                case 2: return point.y < threshold;
                case 3: return point.y > bounds.height - threshold;
            }
            return false;
        }

        /**
         * Compute Voronoi diagram using Delaunator
         * @param {Array} points
         * @param {Object} bounds
         * @returns {Object}
         */
        computeVoronoi(points, bounds) {
            if (points.length < 3) {
                return { cells: points.map(p => this.createFallbackPolygon(p, bounds, points.length)) };
            }

            try {
                // Convert to flat array for Delaunator
                const coords = new Float64Array(points.length * 2);
                points.forEach((p, i) => {
                    coords[i * 2] = p.x;
                    coords[i * 2 + 1] = p.y;
                });

                const delaunay = Delaunator.from(coords);
                const cells = this.voronoiFromDelaunay(delaunay, points, bounds);

                return { cells, delaunay };
            } catch (e) {
                console.warn('Voronoi computation failed, using fallback:', e);
                return { cells: points.map(p => this.createFallbackPolygon(p, bounds, points.length)) };
            }
        }

        /**
         * Extract Voronoi cells from Delaunay triangulation
         * @param {Delaunator} delaunay
         * @param {Array} points
         * @param {Object} bounds
         * @returns {Array}
         */
        voronoiFromDelaunay(delaunay, points, bounds) {
            const n = points.length;
            const cells = new Array(n).fill(null).map(() => []);
            const circumcenters = [];

            // Calculate circumcenters of all triangles
            const triangles = delaunay.triangles;
            for (let i = 0; i < triangles.length; i += 3) {
                const p0 = points[triangles[i]];
                const p1 = points[triangles[i + 1]];
                const p2 = points[triangles[i + 2]];

                const cc = this.circumcenter(p0, p1, p2);
                circumcenters.push(cc);
            }

            // Build cells by walking around each point
            for (let i = 0; i < n; i++) {
                const cell = [];
                let e = this.findFirstEdge(delaunay, i);
                if (e === -1) continue;

                const start = e;
                do {
                    const t = Math.floor(e / 3);
                    cell.push(circumcenters[t]);
                    e = this.nextEdge(delaunay, e, i);
                } while (e !== -1 && e !== start && cell.length < 20);

                if (cell.length >= 3) {
                    cells[i] = cell;
                }
            }

            return cells;
        }

        /**
         * Find first edge incident to point
         * @param {Delaunator} d
         * @param {number} p
         * @returns {number}
         */
        findFirstEdge(d, p) {
            for (let i = 0; i < d.triangles.length; i++) {
                if (d.triangles[i] === p) return i;
            }
            return -1;
        }

        /**
         * Find next edge around a point
         * @param {Delaunator} d
         * @param {number} e
         * @param {number} p
         * @returns {number}
         */
        nextEdge(d, e, p) {
            const halfedge = d.halfedges[e];
            if (halfedge === -1) return -1;

            // Move to next edge in triangle
            const next = halfedge % 3 === 2 ? halfedge - 2 : halfedge + 1;

            if (d.triangles[next] === p) return next;

            // Try other direction
            const prev = halfedge % 3 === 0 ? halfedge + 2 : halfedge - 1;
            if (d.triangles[prev] === p) return prev;

            return -1;
        }

        /**
         * Calculate circumcenter of triangle
         * @param {Object} p0
         * @param {Object} p1
         * @param {Object} p2
         * @returns {Object}
         */
        circumcenter(p0, p1, p2) {
            const ax = p0.x, ay = p0.y;
            const bx = p1.x, by = p1.y;
            const cx = p2.x, cy = p2.y;

            const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));

            if (Math.abs(d) < 1e-10) {
                return { x: (ax + bx + cx) / 3, y: (ay + by + cy) / 3 };
            }

            const ux = ((ax * ax + ay * ay) * (by - cy) +
                       (bx * bx + by * by) * (cy - ay) +
                       (cx * cx + cy * cy) * (ay - by)) / d;

            const uy = ((ax * ax + ay * ay) * (cx - bx) +
                       (bx * bx + by * by) * (ax - cx) +
                       (cx * cx + cy * cy) * (bx - ax)) / d;

            return { x: ux, y: uy };
        }

        /**
         * Create fallback polygon for district
         * @param {Object} center
         * @param {Object} bounds
         * @param {number} count
         * @returns {Array}
         */
        createFallbackPolygon(center, bounds, count) {
            const radius = Math.min(bounds.width, bounds.height) / (count * 0.9);
            const sides = this.randomInt(6, 10);
            const polygon = [];

            for (let i = 0; i < sides; i++) {
                const angle = (i / sides) * Math.PI * 2 + this.random() * 0.3;
                const r = radius * (0.7 + this.random() * 0.5);
                polygon.push({
                    x: center.x + Math.cos(angle) * r,
                    y: center.y + Math.sin(angle) * r
                });
            }

            return polygon;
        }

        /**
         * Clip polygon to bounds
         * @param {Array} polygon
         * @param {Object} bounds
         * @returns {Array}
         */
        clipPolygonToBounds(polygon, bounds) {
            if (!polygon || polygon.length < 3) return polygon;

            // Simple clipping - just constrain points
            return polygon.map(p => ({
                x: Math.max(0, Math.min(bounds.width, p.x)),
                y: Math.max(0, Math.min(bounds.height, p.y))
            }));
        }

        /**
         * Assign district types based on location and adjacency
         * @param {Array} centers
         * @param {Object} voronoi
         * @returns {Array}
         */
        assignDistrictTypes(centers, voronoi) {
            const types = new Array(centers.length).fill(null);
            const bounds = this.city.bounds;

            // Available types based on city type
            const availableTypes = this.getAvailableDistrictTypes();

            // Center district is usually market or noble
            types[0] = this.random() > 0.4 ? 'market' : 'noble';

            // Assign remaining districts
            for (let i = 1; i < centers.length; i++) {
                const center = centers[i];
                const distFromCenter = Math.hypot(
                    center.x - bounds.centerX,
                    center.y - bounds.centerY
                );
                const relDist = distFromCenter / (Math.min(bounds.width, bounds.height) / 2);

                // Location-based preferences
                let typeWeights = {};
                availableTypes.forEach(t => typeWeights[t] = 1);

                // Near water = docks
                if (this.city.water && this.isNearWater(center)) {
                    typeWeights['docks'] = (typeWeights['docks'] || 0) + 5;
                }

                // Outer areas = slums, military
                if (relDist > 0.7) {
                    typeWeights['slums'] = (typeWeights['slums'] || 0) + 3;
                    typeWeights['military'] = (typeWeights['military'] || 0) + 2;
                }

                // Inner areas = noble, temple
                if (relDist < 0.4) {
                    typeWeights['noble'] = (typeWeights['noble'] || 0) + 2;
                    typeWeights['temple'] = (typeWeights['temple'] || 0) + 2;
                }

                // Middle areas = residential, craftsmen
                if (relDist > 0.3 && relDist < 0.7) {
                    typeWeights['residential'] = (typeWeights['residential'] || 0) + 3;
                    typeWeights['craftsmen'] = (typeWeights['craftsmen'] || 0) + 2;
                }

                // Avoid too many of same type
                const typeCounts = {};
                types.filter(t => t).forEach(t => typeCounts[t] = (typeCounts[t] || 0) + 1);

                Object.keys(typeCounts).forEach(t => {
                    if (typeCounts[t] >= 2) {
                        typeWeights[t] = (typeWeights[t] || 1) * 0.3;
                    }
                });

                types[i] = this.weightedRandomChoice(typeWeights);
            }

            return types;
        }

        /**
         * Get available district types based on city type
         * @returns {Array}
         */
        getAvailableDistrictTypes() {
            const base = ['market', 'residential', 'craftsmen'];

            const additions = {
                hamlet: [],
                village: ['temple'],
                town: ['noble', 'temple', 'slums'],
                city: ['noble', 'temple', 'slums', 'military', 'docks'],
                metropolis: ['noble', 'temple', 'slums', 'military', 'docks'],
                fortress: ['military', 'noble'],
                port: ['docks', 'slums']
            };

            return [...base, ...(additions[this.config.cityType] || additions.town)];
        }

        /**
         * Check if point is near water
         * @param {Object} point
         * @returns {boolean}
         */
        isNearWater(point) {
            if (!this.city.water) return false;

            const water = this.city.water;
            const threshold = 80;

            if (water.type === 'river') {
                for (let i = 0; i < water.points.length - 1; i++) {
                    const dist = this.pointToLineDistance(point, water.points[i], water.points[i + 1]);
                    if (dist < threshold) return true;
                }
            } else if (water.type === 'coast') {
                // Near the coast line
                const bounds = this.city.bounds;
                switch (water.side) {
                    case 0: return point.x < bounds.width * (1 - water.landRatio) + threshold;
                    case 1: return point.x > bounds.width * water.landRatio - threshold;
                    case 2: return point.y < bounds.height * (1 - water.landRatio) + threshold;
                    case 3: return point.y > bounds.height * water.landRatio - threshold;
                }
            }

            return false;
        }

        /**
         * Weighted random selection
         * @param {Object} weights - Object with keys and weight values
         * @returns {string}
         */
        weightedRandomChoice(weights) {
            const entries = Object.entries(weights);
            const total = entries.reduce((sum, [, w]) => sum + w, 0);
            let r = this.random() * total;

            for (const [key, weight] of entries) {
                r -= weight;
                if (r <= 0) return key;
            }

            return entries[0][0];
        }

        /**
         * Generate district name
         * @param {string} type
         * @returns {string}
         */
        generateDistrictName(type) {
            const prefixes = {
                market: ['Market', 'Trade', 'Merchant', 'Commerce', 'Guild', 'Coin'],
                residential: ['Common', 'Garden', 'Hearth', 'Home', 'Green', 'Pleasant'],
                noble: ['High', 'Noble', 'Crown', 'Silver', 'Royal', 'Velvet'],
                craftsmen: ['Craft', 'Forge', 'Guild', 'Hammer', 'Anvil', 'Copper'],
                temple: ['Temple', 'Sacred', 'Divine', 'Holy', 'Blessed', 'Spirit'],
                docks: ['Harbor', 'Dock', 'Port', 'Sailor', 'Fisher', 'Anchor'],
                slums: ['Shadow', 'Outer', 'Lower', 'Mud', 'Beggar', 'Dusk'],
                military: ['Garrison', 'Watch', 'Guard', 'Fort', 'Shield', 'Sword']
            };

            const suffixes = ['Quarter', 'Ward', 'District', 'Borough', 'End', 'Row', 'Hill'];

            const prefix = this.randomChoice(prefixes[type] || prefixes.residential);
            const suffix = this.randomChoice(suffixes);

            return `${prefix} ${suffix}`;
        }

        // =====================================================================
        // STREET GENERATION - Based on watabouCityGrinder algorithm
        // =====================================================================

        /**
         * Generate street network following original watabou algorithm:
         * 1. Main streets from gates to center plaza
         * 2. Streets connecting district centers
         * 3. Secondary streets within districts
         * 4. Alleys for urban density
         */
        generateStreets() {
            this.city.streets = [];
            const bounds = this.city.bounds;
            const center = { x: bounds.centerX, y: bounds.centerY };

            // 1. Generate main arteries from gates to center
            this.generateGateToCenter(center, bounds);

            // 2. Generate streets connecting district centers
            this.generateDistrictConnections();

            // 3. Generate secondary streets within districts
            this.generateSecondaryStreets();

            // 4. Generate alleys for density
            this.generateAlleys();
        }

        /**
         * Generate main streets from gates to city center (like original)
         * @param {Object} center
         * @param {Object} bounds
         */
        generateGateToCenter(center, bounds) {
            // If we have walls, connect gates to center
            if (this.city.walls && this.city.walls.gates) {
                this.city.walls.gates.forEach(gate => {
                    const street = this.buildSmoothPath(gate, center, 'main');
                    this.city.streets.push(street);
                });
            } else {
                // No walls - create cardinal direction roads
                const directions = [
                    { x: bounds.padding, y: bounds.centerY },
                    { x: bounds.width - bounds.padding, y: bounds.centerY },
                    { x: bounds.centerX, y: bounds.padding },
                    { x: bounds.centerX, y: bounds.height - bounds.padding }
                ];
                directions.forEach(edge => {
                    const street = this.buildSmoothPath(edge, center, 'main');
                    this.city.streets.push(street);
                });
            }

            // Add extra radial streets for larger cities
            const extraRadials = {
                hamlet: 0,
                village: 1,
                town: 2,
                city: 4,
                metropolis: 6
            };
            const extra = extraRadials[this.config.sizeClass] || 2;
            const maxRadius = Math.min(bounds.width, bounds.height) / 2 - bounds.padding;

            for (let i = 0; i < extra; i++) {
                const angle = this.random() * Math.PI * 2;
                const edgePoint = {
                    x: center.x + Math.cos(angle) * maxRadius,
                    y: center.y + Math.sin(angle) * maxRadius
                };
                const street = this.buildSmoothPath(edgePoint, center, 'secondary');
                this.city.streets.push(street);
            }
        }

        /**
         * Generate streets connecting district centers (like original topology paths)
         */
        generateDistrictConnections() {
            const districts = this.city.districts;
            if (districts.length < 2) return;

            // Build MST to connect all districts
            const edges = [];
            for (let i = 0; i < districts.length; i++) {
                for (let j = i + 1; j < districts.length; j++) {
                    const dist = Math.hypot(
                        districts[i].center.x - districts[j].center.x,
                        districts[i].center.y - districts[j].center.y
                    );
                    edges.push({ i, j, dist });
                }
            }
            edges.sort((a, b) => a.dist - b.dist);

            // Kruskal's MST
            const parent = districts.map((_, i) => i);
            const find = (x) => parent[x] === x ? x : (parent[x] = find(parent[x]));
            const union = (x, y) => { parent[find(x)] = find(y); };

            for (const edge of edges) {
                if (find(edge.i) !== find(edge.j)) {
                    union(edge.i, edge.j);
                    const street = this.buildSmoothPath(
                        districts[edge.i].center,
                        districts[edge.j].center,
                        'secondary'
                    );
                    this.city.streets.push(street);
                }
            }

            // Add some extra connections for larger cities
            const extraConnections = Math.floor(districts.length * 0.5);
            let added = 0;
            for (const edge of edges) {
                if (added >= extraConnections) break;
                if (edge.dist < this.city.bounds.width * 0.4) {
                    // Only add if not already too connected
                    const street = this.buildSmoothPath(
                        districts[edge.i].center,
                        districts[edge.j].center,
                        'secondary'
                    );
                    this.city.streets.push(street);
                    added++;
                }
            }
        }

        /**
         * Build a smooth curved path between two points (like original smoothStreet)
         * @param {Object} start
         * @param {Object} end
         * @param {string} type
         * @returns {Object}
         */
        buildSmoothPath(start, end, type) {
            const points = [];
            const segments = this.randomInt(4, 8);
            const dx = end.x - start.x;
            const dy = end.y - start.y;
            const length = Math.hypot(dx, dy);
            const perpX = -dy / length;
            const perpY = dx / length;

            for (let i = 0; i <= segments; i++) {
                const t = i / segments;
                // Base position along line
                let x = start.x + dx * t;
                let y = start.y + dy * t;

                // Add perpendicular wobble (larger in middle, zero at ends)
                const wobbleAmount = Math.sin(t * Math.PI) * this.randomFloat(-20, 20);
                x += perpX * wobbleAmount;
                y += perpY * wobbleAmount;

                points.push({ x, y });
            }

            // Smooth the path
            const smoothed = this.smoothPath(points);

            return {
                type: type,
                points: smoothed,
                width: type === 'main' ? this.randomInt(5, 8) : this.randomInt(3, 5)
            };
        }

        /**
         * Smooth a path by averaging adjacent points (like original smoothStreet)
         * @param {Array} points
         * @returns {Array}
         */
        smoothPath(points) {
            if (points.length < 3) return points;

            const smoothed = [points[0]]; // Keep first point

            for (let i = 1; i < points.length - 1; i++) {
                const prev = points[i - 1];
                const curr = points[i];
                const next = points[i + 1];

                smoothed.push({
                    x: (prev.x + curr.x * 2 + next.x) / 4,
                    y: (prev.y + curr.y * 2 + next.y) / 4
                });
            }

            smoothed.push(points[points.length - 1]); // Keep last point
            return smoothed;
        }

        /**
         * Generate secondary streets within districts
         */
        generateSecondaryStreets() {
            this.city.districts.forEach(district => {
                const count = this.randomInt(4, 8);

                for (let i = 0; i < count; i++) {
                    // Create streets within the district
                    const angle = this.random() * Math.PI * 2;
                    const length = this.randomFloat(30, 70);

                    const start = {
                        x: district.center.x + this.randomFloat(-40, 40),
                        y: district.center.y + this.randomFloat(-40, 40)
                    };

                    const end = {
                        x: start.x + Math.cos(angle) * length,
                        y: start.y + Math.sin(angle) * length
                    };

                    const street = this.buildSmoothPath(start, end, 'secondary');
                    street.districtId = district.id;
                    this.city.streets.push(street);
                }
            });
        }

        /**
         * Generate small alleys for dense urban feel
         */
        generateAlleys() {
            this.city.districts.forEach(district => {
                const baseCounts = {
                    slums: this.randomInt(10, 18),
                    docks: this.randomInt(8, 14),
                    craftsmen: this.randomInt(8, 12),
                    market: this.randomInt(6, 10),
                    residential: this.randomInt(6, 10),
                    noble: this.randomInt(3, 6),
                    temple: this.randomInt(3, 6),
                    military: this.randomInt(3, 6)
                };
                const count = baseCounts[district.type] || this.randomInt(5, 10);

                for (let i = 0; i < count; i++) {
                    const angle = this.random() * Math.PI * 2;
                    const length = this.randomFloat(12, 35);

                    const start = {
                        x: district.center.x + this.randomFloat(-60, 60),
                        y: district.center.y + this.randomFloat(-60, 60)
                    };

                    const end = {
                        x: start.x + Math.cos(angle) * length,
                        y: start.y + Math.sin(angle) * length
                    };

                    this.city.streets.push({
                        type: 'alley',
                        points: [start, end],
                        width: this.randomInt(1, 2),
                        districtId: district.id
                    });
                }
            });
        }

        // =====================================================================
        // BUILDING GENERATION - Grid-based dense fill approach
        // =====================================================================

        /**
         * Generate buildings using grid-based dense fill
         * Buildings fill the entire area, streets are gaps between them
         */
        generateBuildings() {
            this.city.buildings = [];
            const bounds = this.city.bounds;

            // Grid spacing based on city size (smaller = denser)
            const gridSpacings = {
                hamlet: 12,
                village: 10,
                town: 8,
                city: 7,
                metropolis: 6
            };
            const gridSpacing = gridSpacings[this.config.sizeClass] || 8;

            // Building sizes
            const buildingSizes = {
                hamlet: { min: 5, max: 10 },
                village: { min: 4, max: 9 },
                town: { min: 4, max: 8 },
                city: { min: 3, max: 7 },
                metropolis: { min: 3, max: 6 }
            };
            const sizeRange = buildingSizes[this.config.sizeClass] || { min: 4, max: 8 };

            // Street width for gap calculation
            const streetGap = {
                main: 6,
                secondary: 4,
                alley: 2
            };

            // Generate grid of potential building positions
            const padding = bounds.padding + 10;

            for (let x = padding; x < bounds.width - padding; x += gridSpacing) {
                for (let y = padding; y < bounds.height - padding; y += gridSpacing) {
                    // Add jitter for organic feel
                    const jitterX = this.randomFloat(-gridSpacing * 0.3, gridSpacing * 0.3);
                    const jitterY = this.randomFloat(-gridSpacing * 0.3, gridSpacing * 0.3);
                    const pos = { x: x + jitterX, y: y + jitterY };

                    // Skip if outside walls
                    if (this.city.walls && !this.isInsideWalls(pos)) continue;

                    // Skip if in water
                    if (this.isInWater(pos)) continue;

                    // Skip if in citadel area (handled separately)
                    if (this.city.citadel && this.isInCitadel(pos)) continue;

                    // Check distance to streets - buildings line the streets
                    const streetInfo = this.getStreetDistance(pos);

                    // Skip if too close to street center (leave gap for street)
                    if (streetInfo.distance < streetGap[streetInfo.type] || 0) continue;

                    // Higher chance to place building if near a street (but not on it)
                    const nearStreet = streetInfo.distance < 20;
                    if (!nearStreet && this.random() > 0.7) continue; // Less density away from streets

                    // Determine district for this position
                    const district = this.findDistrictAt(pos);

                    // Building size varies by district type
                    const size = this.getGridBuildingSize(district, sizeRange);

                    // Rotation - align to nearest street
                    const rotation = streetInfo.angle + Math.PI/2 + this.randomFloat(-0.1, 0.1);

                    // Check overlap with existing buildings
                    const overlaps = this.city.buildings.some(b => {
                        const dist = Math.hypot(pos.x - b.x, pos.y - b.y);
                        return dist < (size.width + b.width) / 2 + 1;
                    });

                    if (overlaps) continue;

                    const building = {
                        x: pos.x,
                        y: pos.y,
                        width: size.width,
                        height: size.height,
                        rotation: rotation,
                        type: this.getBuildingType(district ? district.type : 'residential'),
                        districtId: district ? district.id : -1,
                        footprint: this.generateBuildingFootprint(pos.x, pos.y, size.width, size.height, rotation)
                    };

                    this.city.buildings.push(building);
                }
            }
        }

        /**
         * Check if position is inside citadel
         * @param {Object} pos
         * @returns {boolean}
         */
        isInCitadel(pos) {
            const citadel = this.city.citadel;
            const dist = Math.hypot(pos.x - citadel.x, pos.y - citadel.y);
            return dist < citadel.wallRadius + 5;
        }

        /**
         * Get distance to nearest street and its info
         * @param {Object} pos
         * @returns {Object}
         */
        getStreetDistance(pos) {
            let minDist = Infinity;
            let streetType = 'secondary';
            let streetAngle = 0;

            for (const street of this.city.streets) {
                for (let i = 0; i < street.points.length - 1; i++) {
                    const p1 = street.points[i];
                    const p2 = street.points[i + 1];
                    const dist = this.pointToLineDistance(pos, p1, p2);

                    if (dist < minDist) {
                        minDist = dist;
                        streetType = street.type || 'secondary';
                        streetAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
                    }
                }
            }

            return { distance: minDist, type: streetType, angle: streetAngle };
        }

        /**
         * Find which district contains a point
         * @param {Object} pos
         * @returns {Object|null}
         */
        findDistrictAt(pos) {
            for (const district of this.city.districts) {
                if (district.polygon && this.pointInPolygon(pos, district.polygon)) {
                    return district;
                }
            }
            // Return closest district if not in any polygon
            let closest = null;
            let minDist = Infinity;
            for (const district of this.city.districts) {
                const dist = Math.hypot(pos.x - district.center.x, pos.y - district.center.y);
                if (dist < minDist) {
                    minDist = dist;
                    closest = district;
                }
            }
            return closest;
        }

        /**
         * Get building size for grid placement
         * @param {Object} district
         * @param {Object} sizeRange
         * @returns {Object}
         */
        getGridBuildingSize(district, sizeRange) {
            // Adjust size based on district type
            const sizeMultipliers = {
                market: 1.0,
                residential: 0.9,
                noble: 1.4,
                craftsmen: 1.1,
                temple: 1.3,
                docks: 1.0,
                slums: 0.7,
                military: 1.2
            };

            const mult = sizeMultipliers[district?.type] || 1.0;
            const baseWidth = this.randomInt(sizeRange.min, sizeRange.max);
            const baseHeight = this.randomInt(sizeRange.min, sizeRange.max);

            return {
                width: Math.round(baseWidth * mult),
                height: Math.round(baseHeight * mult * this.randomFloat(0.8, 1.2))
            };
        }

        /**
         * Check if point is inside the city walls
         * @param {Object} point
         * @returns {boolean}
         */
        isInsideWalls(point) {
            if (!this.city.walls || !this.city.walls.path) return true;
            return this.pointInPolygon(point, this.city.walls.path);
        }

        /**
         * Get random point in polygon
         * @param {Array} polygon
         * @param {Object} center
         * @returns {Object|null}
         */
        randomPointInPolygon(polygon, center) {
            if (!polygon || polygon.length < 3) {
                return {
                    x: center.x + this.randomFloat(-50, 50),
                    y: center.y + this.randomFloat(-50, 50)
                };
            }

            // Use rejection sampling
            const bounds = this.getPolygonBounds(polygon);

            for (let i = 0; i < 30; i++) {
                const point = {
                    x: bounds.minX + this.random() * (bounds.maxX - bounds.minX),
                    y: bounds.minY + this.random() * (bounds.maxY - bounds.minY)
                };

                if (this.pointInPolygon(point, polygon)) {
                    return point;
                }
            }

            // Fallback to center offset
            return {
                x: center.x + this.randomFloat(-40, 40),
                y: center.y + this.randomFloat(-40, 40)
            };
        }

        /**
         * Get polygon bounds
         * @param {Array} polygon
         * @returns {Object}
         */
        getPolygonBounds(polygon) {
            let minX = Infinity, minY = Infinity;
            let maxX = -Infinity, maxY = -Infinity;

            polygon.forEach(p => {
                minX = Math.min(minX, p.x);
                minY = Math.min(minY, p.y);
                maxX = Math.max(maxX, p.x);
                maxY = Math.max(maxY, p.y);
            });

            return { minX, minY, maxX, maxY };
        }

        /**
         * Point in polygon test
         * @param {Object} point
         * @param {Array} polygon
         * @returns {boolean}
         */
        pointInPolygon(point, polygon) {
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

        /**
         * Get building size based on district type
         * Smaller sizes for denser packing like original generator
         * @param {string} districtType
         * @returns {Object}
         */
        getBuildingSize(districtType) {
            const sizes = {
                market: { width: [5, 10], height: [5, 10] },
                residential: { width: [4, 8], height: [4, 8] },
                noble: { width: [8, 16], height: [8, 16] },
                craftsmen: { width: [5, 12], height: [4, 10] },
                temple: { width: [8, 15], height: [8, 15] },
                docks: { width: [6, 14], height: [4, 10] },
                slums: { width: [3, 6], height: [3, 6] },
                military: { width: [8, 16], height: [6, 12] }
            };

            const range = sizes[districtType] || sizes.residential;
            return {
                width: this.randomInt(range.width[0], range.width[1]),
                height: this.randomInt(range.height[0], range.height[1])
            };
        }

        /**
         * Get building type for district
         * @param {string} districtType
         * @returns {string}
         */
        getBuildingType(districtType) {
            const types = {
                market: ['shop', 'warehouse', 'inn', 'tavern', 'guild_hall', 'bank'],
                residential: ['house', 'house', 'house', 'apartment', 'cottage'],
                noble: ['mansion', 'estate', 'villa', 'manor', 'garden_house'],
                craftsmen: ['workshop', 'smithy', 'tannery', 'bakery', 'carpentry', 'house'],
                temple: ['shrine', 'chapel', 'monastery', 'hospice', 'cemetery'],
                docks: ['warehouse', 'tavern', 'fishery', 'shipyard', 'rope_works', 'house'],
                slums: ['shack', 'hovel', 'tenement', 'den', 'pawnshop'],
                military: ['barracks', 'armory', 'stable', 'training_ground', 'watchtower']
            };

            return this.randomChoice(types[districtType] || types.residential);
        }

        /**
         * Get building rotation
         * @param {Object} pos
         * @returns {number}
         */
        getBuildingRotation(pos) {
            // Try to align with nearby street
            let nearestStreet = null;
            let nearestDist = Infinity;

            for (const street of this.city.streets) {
                if (street.type === 'alley') continue;

                for (let i = 0; i < street.points.length - 1; i++) {
                    const dist = this.pointToLineDistance(pos, street.points[i], street.points[i + 1]);
                    if (dist < nearestDist && dist < 50) {
                        nearestDist = dist;
                        nearestStreet = { p1: street.points[i], p2: street.points[i + 1] };
                    }
                }
            }

            if (nearestStreet) {
                // Align perpendicular to street
                const angle = Math.atan2(
                    nearestStreet.p2.y - nearestStreet.p1.y,
                    nearestStreet.p2.x - nearestStreet.p1.x
                );
                return angle + Math.PI / 2 + this.randomFloat(-0.15, 0.15);
            }

            // Random rotation
            return this.random() * Math.PI * 0.5;
        }

        /**
         * Generate building footprint polygon
         * @param {number} x
         * @param {number} y
         * @param {number} width
         * @param {number} height
         * @param {number} rotation
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

        // =====================================================================
        // WALLS GENERATION
        // =====================================================================

        /**
         * Generate city walls - organic circular like medieval cities
         */
        generateWalls() {
            const bounds = this.city.bounds;
            const padding = bounds.padding;

            // Always use organic circular walls (like original generator)
            const path = this.generateOrganicCircularWalls(bounds, padding);

            // Generate gates
            const gates = this.generateGates(path, bounds);

            // Generate many towers (like original)
            const towers = this.generateTowers(path, gates);

            this.city.walls = {
                path: path,
                gates: gates,
                towers: towers,
                thickness: this.randomInt(3, 5)
            };
        }

        /**
         * Generate organic circular walls with natural variation
         * @param {Object} bounds
         * @param {number} padding
         * @returns {Array}
         */
        generateOrganicCircularWalls(bounds, padding) {
            const path = [];
            const cx = bounds.centerX;
            const cy = bounds.centerY;
            const baseRadius = Math.min(bounds.width, bounds.height) / 2 - padding;

            // Many more segments for smoother, more organic walls
            const segments = this.randomInt(32, 48);

            // Use multiple noise frequencies for organic variation
            for (let i = 0; i < segments; i++) {
                const angle = (i / segments) * Math.PI * 2;

                // Multi-frequency noise for organic shape
                const noise1 = Math.sin(angle * 3 + this.random() * 0.5) * 0.08;
                const noise2 = Math.sin(angle * 5 + this.random() * 0.8) * 0.04;
                const noise3 = Math.sin(angle * 7 + this.random() * 1.2) * 0.02;
                const randomNoise = this.randomFloat(-0.03, 0.03);

                const radiusVariation = 1 + noise1 + noise2 + noise3 + randomNoise;
                const r = baseRadius * radiusVariation;

                path.push({
                    x: cx + Math.cos(angle) * r,
                    y: cy + Math.sin(angle) * r
                });
            }

            return path;
        }

        /**
         * Generate gates at cardinal directions
         * @param {Array} path
         * @param {Object} bounds
         * @returns {Array}
         */
        generateGates(path, bounds) {
            const gates = [];
            const directions = ['north', 'east', 'south', 'west'];

            // Find points closest to cardinal directions
            directions.forEach(dir => {
                const target = {
                    north: { x: bounds.centerX, y: 0 },
                    south: { x: bounds.centerX, y: bounds.height },
                    west: { x: 0, y: bounds.centerY },
                    east: { x: bounds.width, y: bounds.centerY }
                }[dir];

                let closest = null;
                let closestDist = Infinity;

                for (let i = 0; i < path.length; i++) {
                    const p = path[i];
                    const dist = Math.hypot(p.x - target.x, p.y - target.y);
                    if (dist < closestDist) {
                        closestDist = dist;
                        closest = { ...p, index: i };
                    }
                }

                if (closest) {
                    gates.push({
                        x: closest.x,
                        y: closest.y,
                        direction: dir,
                        pathIndex: closest.index,
                        name: `${dir.charAt(0).toUpperCase() + dir.slice(1)} Gate`
                    });
                }
            });

            return gates;
        }

        /**
         * Generate many towers along walls (like original generator)
         * @param {Array} path
         * @param {Array} gates
         * @returns {Array}
         */
        generateTowers(path, gates) {
            const towers = [];
            const gateIndices = new Set(gates.map(g => g.pathIndex));

            // Tower at every 2-4 wall segments for dense coverage
            const towerInterval = this.randomInt(2, 4);

            path.forEach((point, i) => {
                // Skip gate positions
                if (gateIndices.has(i)) return;

                // Regular wall towers
                if (i % towerInterval === 0) {
                    towers.push({
                        x: point.x,
                        y: point.y,
                        type: 'wall',
                        radius: this.randomInt(4, 7)
                    });
                }
            });

            // Gate towers (larger, flanking each gate)
            gates.forEach(gate => {
                const idx = gate.pathIndex;
                const prevIdx = (idx - 1 + path.length) % path.length;
                const nextIdx = (idx + 1) % path.length;

                // Calculate positions beside gate
                const dx1 = path[prevIdx].x - gate.x;
                const dy1 = path[prevIdx].y - gate.y;
                const len1 = Math.hypot(dx1, dy1);

                const dx2 = path[nextIdx].x - gate.x;
                const dy2 = path[nextIdx].y - gate.y;
                const len2 = Math.hypot(dx2, dy2);

                if (len1 > 0) {
                    towers.push({
                        x: gate.x + (dx1 / len1) * 10,
                        y: gate.y + (dy1 / len1) * 10,
                        type: 'gate',
                        radius: this.randomInt(6, 9)
                    });
                }

                if (len2 > 0) {
                    towers.push({
                        x: gate.x + (dx2 / len2) * 10,
                        y: gate.y + (dy2 / len2) * 10,
                        type: 'gate',
                        radius: this.randomInt(6, 9)
                    });
                }
            });

            return towers;
        }

        // =====================================================================
        // CITADEL GENERATION
        // =====================================================================

        /**
         * Generate central citadel (castle/keep) at city center
         */
        generateCitadel() {
            const bounds = this.city.bounds;
            const cx = bounds.centerX;
            const cy = bounds.centerY;

            // Citadel size based on city size
            const sizes = {
                village: { radius: 25, wallRadius: 35 },
                town: { radius: 35, wallRadius: 50 },
                city: { radius: 50, wallRadius: 70 },
                metropolis: { radius: 70, wallRadius: 95 }
            };
            const size = sizes[this.config.sizeClass] || sizes.town;

            // Generate citadel wall (inner keep)
            const wallPath = [];
            const wallSegments = this.randomInt(8, 12);
            for (let i = 0; i < wallSegments; i++) {
                const angle = (i / wallSegments) * Math.PI * 2;
                const r = size.wallRadius * (0.9 + this.random() * 0.2);
                wallPath.push({
                    x: cx + Math.cos(angle) * r,
                    y: cy + Math.sin(angle) * r
                });
            }

            // Generate citadel towers
            const towers = wallPath.map((p, i) => ({
                x: p.x,
                y: p.y,
                type: 'citadel',
                radius: this.randomInt(5, 8)
            }));

            // Main keep building
            const keepBuildings = [];

            // Central keep tower
            keepBuildings.push({
                x: cx,
                y: cy,
                width: size.radius * 0.6,
                height: size.radius * 0.6,
                rotation: this.random() * Math.PI * 0.25,
                type: 'keep',
                isCitadel: true
            });

            // Additional buildings inside citadel
            const innerBuildingCount = this.randomInt(3, 7);
            for (let i = 0; i < innerBuildingCount; i++) {
                const angle = this.random() * Math.PI * 2;
                const dist = this.randomFloat(size.radius * 0.4, size.wallRadius * 0.7);
                const bSize = this.randomInt(8, 15);

                keepBuildings.push({
                    x: cx + Math.cos(angle) * dist,
                    y: cy + Math.sin(angle) * dist,
                    width: bSize,
                    height: bSize * this.randomFloat(0.7, 1.3),
                    rotation: angle + Math.PI / 2 + this.randomFloat(-0.2, 0.2),
                    type: this.randomChoice(['barracks', 'chapel', 'armory', 'hall', 'stable']),
                    isCitadel: true
                });
            }

            this.city.citadel = {
                x: cx,
                y: cy,
                radius: size.radius,
                wallRadius: size.wallRadius,
                wallPath: wallPath,
                towers: towers,
                buildings: keepBuildings
            };

            // Add citadel buildings to main building list
            keepBuildings.forEach(b => {
                b.districtId = 0; // Central district
                b.footprint = this.generateBuildingFootprint(b.x, b.y, b.width, b.height, b.rotation);
                this.city.buildings.push(b);
            });
        }

        // =====================================================================
        // SUBURBS GENERATION
        // =====================================================================

        /**
         * Generate suburb buildings outside the city walls
         */
        generateSuburbs() {
            const bounds = this.city.bounds;
            const center = { x: bounds.centerX, y: bounds.centerY };

            if (!this.city.walls || !this.city.walls.path) return;

            // Number of suburb buildings based on city size
            const suburbCounts = {
                village: 20,
                town: 50,
                city: 120,
                metropolis: 250
            };
            const count = suburbCounts[this.config.sizeClass] || 50;

            const wallPath = this.city.walls.path;
            const gates = this.city.walls.gates;

            // Generate suburb clusters near each gate
            gates.forEach(gate => {
                const clusterCount = Math.floor(count / gates.length);
                this.generateSuburbCluster(gate, clusterCount, wallPath, bounds);
            });

            // Generate scattered suburbs around the walls
            const scatteredCount = Math.floor(count * 0.3);
            for (let i = 0; i < scatteredCount; i++) {
                const building = this.generateSuburbBuilding(wallPath, bounds, center);
                if (building) {
                    this.city.suburbs.push(building);
                    this.city.buildings.push(building);
                }
            }
        }

        /**
         * Generate a cluster of suburb buildings near a gate
         * @param {Object} gate
         * @param {number} count
         * @param {Array} wallPath
         * @param {Object} bounds
         */
        generateSuburbCluster(gate, count, wallPath, bounds) {
            const placed = [];

            // Direction away from city center
            const dx = gate.x - bounds.centerX;
            const dy = gate.y - bounds.centerY;
            const len = Math.hypot(dx, dy);
            const dirX = dx / len;
            const dirY = dy / len;

            for (let i = 0; i < count; i++) {
                // Position extending from gate
                const dist = this.randomFloat(15, 80);
                const spread = this.randomFloat(-50, 50);
                const perpX = -dirY;
                const perpY = dirX;

                const x = gate.x + dirX * dist + perpX * spread;
                const y = gate.y + dirY * dist + perpY * spread;

                // Skip if inside walls or outside bounds
                if (this.isInsideWalls({ x, y })) continue;
                if (x < 5 || x > bounds.width - 5 || y < 5 || y > bounds.height - 5) continue;

                const size = {
                    width: this.randomInt(4, 10),
                    height: this.randomInt(4, 10)
                };

                // Check overlap with other suburb buildings
                const overlaps = placed.some(b => {
                    const d = Math.hypot(x - b.x, y - b.y);
                    return d < (size.width + b.width) / 2 + 2;
                });

                if (overlaps) continue;

                const building = {
                    x: x,
                    y: y,
                    width: size.width,
                    height: size.height,
                    rotation: Math.atan2(dirY, dirX) + this.randomFloat(-0.3, 0.3),
                    type: this.randomChoice(['house', 'shack', 'cottage', 'farmhouse', 'barn']),
                    isSuburb: true,
                    districtId: -1
                };
                building.footprint = this.generateBuildingFootprint(
                    building.x, building.y, building.width, building.height, building.rotation
                );

                placed.push(building);
                this.city.suburbs.push(building);
                this.city.buildings.push(building);
            }
        }

        /**
         * Generate a single scattered suburb building
         * @param {Array} wallPath
         * @param {Object} bounds
         * @param {Object} center
         * @returns {Object|null}
         */
        generateSuburbBuilding(wallPath, bounds, center) {
            for (let attempt = 0; attempt < 20; attempt++) {
                // Random position outside walls
                const angle = this.random() * Math.PI * 2;
                const minRadius = Math.min(bounds.width, bounds.height) / 2 - bounds.padding + 10;
                const maxRadius = Math.min(bounds.width, bounds.height) / 2 - 10;
                const dist = this.randomFloat(minRadius, maxRadius);

                const x = center.x + Math.cos(angle) * dist;
                const y = center.y + Math.sin(angle) * dist;

                // Skip if inside walls or outside bounds
                if (this.isInsideWalls({ x, y })) continue;
                if (x < 5 || x > bounds.width - 5 || y < 5 || y > bounds.height - 5) continue;

                const size = {
                    width: this.randomInt(3, 8),
                    height: this.randomInt(3, 8)
                };

                // Check overlap with existing suburbs
                const overlaps = this.city.suburbs.some(b => {
                    const d = Math.hypot(x - b.x, y - b.y);
                    return d < (size.width + b.width) / 2 + 2;
                });

                if (overlaps) continue;

                const building = {
                    x: x,
                    y: y,
                    width: size.width,
                    height: size.height,
                    rotation: angle + Math.PI / 2 + this.randomFloat(-0.3, 0.3),
                    type: this.randomChoice(['shack', 'hovel', 'hut', 'tent']),
                    isSuburb: true,
                    districtId: -1
                };
                building.footprint = this.generateBuildingFootprint(
                    building.x, building.y, building.width, building.height, building.rotation
                );

                return building;
            }

            return null;
        }

        // =====================================================================
        // BRIDGES
        // =====================================================================

        /**
         * Generate bridges over river
         */
        generateBridges() {
            const river = this.city.water;
            if (!river || river.type !== 'river') return;

            // Find where main roads cross the river
            for (const street of this.city.streets) {
                if (street.type !== 'main') continue;

                for (let i = 0; i < street.points.length - 1; i++) {
                    const p1 = street.points[i];
                    const p2 = street.points[i + 1];

                    // Check intersection with river segments
                    for (let j = 0; j < river.points.length - 1; j++) {
                        const r1 = river.points[j];
                        const r2 = river.points[j + 1];

                        const intersection = this.lineIntersection(p1, p2, r1, r2);
                        if (intersection) {
                            this.city.bridges.push({
                                x: intersection.x,
                                y: intersection.y,
                                angle: Math.atan2(p2.y - p1.y, p2.x - p1.x),
                                width: river.width + 10,
                                length: 20
                            });
                        }
                    }
                }
            }
        }

        /**
         * Line intersection test
         * @param {Object} p1
         * @param {Object} p2
         * @param {Object} p3
         * @param {Object} p4
         * @returns {Object|null}
         */
        lineIntersection(p1, p2, p3, p4) {
            const x1 = p1.x, y1 = p1.y;
            const x2 = p2.x, y2 = p2.y;
            const x3 = p3.x, y3 = p3.y;
            const x4 = p4.x, y4 = p4.y;

            const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
            if (Math.abs(denom) < 0.001) return null;

            const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
            const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

            if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
                return {
                    x: x1 + t * (x2 - x1),
                    y: y1 + t * (y2 - y1)
                };
            }

            return null;
        }

        // =====================================================================
        // POI GENERATION
        // =====================================================================

        /**
         * Generate Points of Interest
         */
        generatePOIs() {
            this.city.pois = [];

            // Central landmark
            this.city.pois.push({
                type: 'landmark',
                name: this.generateLandmarkName(),
                x: this.city.bounds.centerX + this.randomFloat(-20, 20),
                y: this.city.bounds.centerY + this.randomFloat(-20, 20),
                description: 'The central landmark of the city',
                importance: 'major'
            });

            // District-based POIs
            this.city.districts.forEach(district => {
                const pois = this.generateDistrictPOIs(district);
                this.city.pois.push(...pois);
            });

            // Gate POIs
            if (this.city.walls) {
                this.city.walls.gates.forEach(gate => {
                    this.city.pois.push({
                        type: 'gate',
                        name: gate.name,
                        x: gate.x,
                        y: gate.y,
                        description: `The ${gate.direction}ern entrance to the city`,
                        importance: 'minor'
                    });
                });
            }
        }

        /**
         * Generate POIs for a district
         * @param {Object} district
         * @returns {Array}
         */
        generateDistrictPOIs(district) {
            const pois = [];

            const poiConfig = {
                market: [
                    { type: 'market', name: 'Central Market', chance: 0.9 },
                    { type: 'guild_hall', name: this.generateGuildName(), chance: 0.5 }
                ],
                temple: [
                    { type: 'temple', name: this.generateTempleName(), chance: 1 },
                    { type: 'shrine', name: 'Wayside Shrine', chance: 0.3 }
                ],
                noble: [
                    { type: 'palace', name: "Lord's Manor", chance: 0.4 },
                    { type: 'garden', name: 'Royal Gardens', chance: 0.5 }
                ],
                military: [
                    { type: 'barracks', name: 'City Barracks', chance: 0.8 },
                    { type: 'armory', name: 'City Armory', chance: 0.5 }
                ],
                docks: [
                    { type: 'harbor', name: 'Harbor Master', chance: 0.7 },
                    { type: 'tavern', name: this.generateTavernName(), chance: 0.6 }
                ],
                craftsmen: [
                    { type: 'smithy', name: 'Master Smithy', chance: 0.5 },
                    { type: 'guild_hall', name: this.generateGuildName(), chance: 0.3 }
                ],
                residential: [
                    { type: 'well', name: 'Public Well', chance: 0.4 },
                    { type: 'tavern', name: this.generateTavernName(), chance: 0.3 }
                ],
                slums: [
                    { type: 'tavern', name: this.generateTavernName(), chance: 0.5 },
                    { type: 'den', name: 'Thieves\' Den', chance: 0.2 }
                ]
            };

            const configs = poiConfig[district.type] || poiConfig.residential;

            configs.forEach(config => {
                if (this.random() < config.chance) {
                    pois.push({
                        type: config.type,
                        name: typeof config.name === 'function' ? config.name() : config.name,
                        x: district.center.x + this.randomFloat(-30, 30),
                        y: district.center.y + this.randomFloat(-30, 30),
                        districtId: district.id,
                        importance: 'minor'
                    });
                }
            });

            return pois;
        }

        /**
         * Generate landmark name
         * @returns {string}
         */
        generateLandmarkName() {
            const types = ['Castle', 'Keep', 'Tower', 'Palace', 'Citadel', 'Hall', 'Spire'];
            const adjectives = ['Grand', 'Royal', 'Ancient', 'Great', 'High', 'Old', 'Golden'];
            return `The ${this.randomChoice(adjectives)} ${this.randomChoice(types)}`;
        }

        /**
         * Generate temple name
         * @returns {string}
         */
        generateTempleName() {
            const deities = ['Light', 'Sun', 'Moon', 'Stars', 'Dawn', 'Storm', 'Sea', 'Earth', 'Sky', 'Fortune'];
            const types = ['Temple', 'Cathedral', 'Sanctuary', 'Chapel'];
            return `${this.randomChoice(types)} of the ${this.randomChoice(deities)}`;
        }

        /**
         * Generate tavern name
         * @returns {string}
         */
        generateTavernName() {
            const adj = ['Prancing', 'Golden', 'Silver', 'Rusty', 'Dancing', 'Sleeping', 'Drunken', 'Laughing'];
            const noun = ['Pony', 'Dragon', 'Griffin', 'Anchor', 'Sword', 'Shield', 'Crown', 'Stag', 'Boar'];
            return `The ${this.randomChoice(adj)} ${this.randomChoice(noun)}`;
        }

        /**
         * Generate guild name
         * @returns {string}
         */
        generateGuildName() {
            const crafts = ['Merchants', 'Smiths', 'Weavers', 'Bakers', 'Brewers', 'Masons', 'Carpenters'];
            return `${this.randomChoice(crafts)}' Guild Hall`;
        }

        // =====================================================================
        // POPULATION
        // =====================================================================

        /**
         * Calculate city population
         */
        calculatePopulation() {
            const base = {
                hamlet: 50,
                village: 300,
                town: 2500,
                city: 12000,
                metropolis: 60000
            };

            const baseValue = base[this.config.sizeClass] || 2500;
            const buildingFactor = this.city.buildings.length * 3;
            const variance = 0.85 + this.random() * 0.3;

            this.city.population = Math.floor(
                Math.max(baseValue * 0.5, Math.min(baseValue * 1.5, buildingFactor)) * variance
            );
        }

        // =====================================================================
        // UTILITY METHODS
        // =====================================================================

        /**
         * Calculate polygon area using shoelace formula
         * @param {Array} polygon
         * @returns {number}
         */
        calculatePolygonArea(polygon) {
            if (!polygon || polygon.length < 3) return 0;

            let area = 0;
            const n = polygon.length;

            for (let i = 0; i < n; i++) {
                const j = (i + 1) % n;
                area += polygon[i].x * polygon[j].y;
                area -= polygon[j].x * polygon[i].y;
            }

            return Math.abs(area / 2);
        }

        /**
         * Calculate centroid of polygon
         * @param {Array} polygon
         * @returns {Object}
         */
        calculateCentroid(polygon) {
            if (!polygon || polygon.length === 0) return { x: 0, y: 0 };

            let cx = 0, cy = 0;
            polygon.forEach(p => {
                cx += p.x;
                cy += p.y;
            });

            return {
                x: cx / polygon.length,
                y: cy / polygon.length
            };
        }

        /**
         * Distance from point to line segment
         * @param {Object} point
         * @param {Object} lineStart
         * @param {Object} lineEnd
         * @returns {number}
         */
        pointToLineDistance(point, lineStart, lineEnd) {
            const A = point.x - lineStart.x;
            const B = point.y - lineStart.y;
            const C = lineEnd.x - lineStart.x;
            const D = lineEnd.y - lineStart.y;

            const dot = A * C + B * D;
            const lenSq = C * C + D * D;
            let param = -1;

            if (lenSq !== 0) param = dot / lenSq;

            let xx, yy;

            if (param < 0) {
                xx = lineStart.x;
                yy = lineStart.y;
            } else if (param > 1) {
                xx = lineEnd.x;
                yy = lineEnd.y;
            } else {
                xx = lineStart.x + param * C;
                yy = lineStart.y + param * D;
            }

            return Math.hypot(point.x - xx, point.y - yy);
        }
    }

    // Export
    window.CityGenerator = CityGenerator;

})(window);
