# CityGrinder Implementation Guide

This guide provides detailed implementation instructions for each phase of the CityGrinder WordPress plugin development.

---

## Phase 1: Core Architecture & Plugin Setup

### 1.1 Plugin Main File

```php
<?php
/**
 * Plugin Name: CityGrinder
 * Plugin URI: https://github.com/JiverG/citygrinder
 * Description: Procedural medieval fantasy city generator for WordPress. Integrates with HexGrinder for seamless settlement exploration.
 * Version: 1.0.0
 * Requires at least: 5.8
 * Requires PHP: 7.4
 * Author: JiverG
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 */

if (!defined('ABSPATH')) {
    exit;
}

define('CITYGRINDER_VERSION', '1.0.0');
define('CITYGRINDER_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('CITYGRINDER_PLUGIN_URL', plugin_dir_url(__FILE__));

class CityGrinder {
    private static $instance = null;

    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        $this->load_dependencies();
        $this->register_hooks();
    }

    private function load_dependencies() {
        require_once CITYGRINDER_PLUGIN_DIR . 'includes/class-citygrinder-db.php';
        require_once CITYGRINDER_PLUGIN_DIR . 'includes/class-citygrinder-api.php';
        require_once CITYGRINDER_PLUGIN_DIR . 'includes/class-citygrinder-shortcodes.php';
        require_once CITYGRINDER_PLUGIN_DIR . 'includes/class-citygrinder-generator.php';

        if (is_admin()) {
            require_once CITYGRINDER_PLUGIN_DIR . 'admin/class-citygrinder-admin.php';
        }
    }

    private function register_hooks() {
        register_activation_hook(__FILE__, [$this, 'activate']);
        register_deactivation_hook(__FILE__, [$this, 'deactivate']);

        add_action('wp_enqueue_scripts', [$this, 'enqueue_frontend_assets']);
        add_action('admin_enqueue_scripts', [$this, 'enqueue_admin_assets']);

        // Initialize components
        CityGrinder_DB::init();
        CityGrinder_API::init();
        CityGrinder_Shortcodes::init();

        // HexGrinder integration
        add_action('plugins_loaded', [$this, 'hexgrinder_integration']);
    }

    public function activate() {
        CityGrinder_DB::create_tables();
        flush_rewrite_rules();
    }

    public function deactivate() {
        flush_rewrite_rules();
    }

    public function enqueue_frontend_assets() {
        if ($this->should_load_assets()) {
            // Core dependencies
            wp_enqueue_script('seedrandom',
                CITYGRINDER_PLUGIN_URL . 'assets/js/vendor/seedrandom.min.js',
                [], '3.0.5', true);
            wp_enqueue_script('delaunator',
                CITYGRINDER_PLUGIN_URL . 'assets/js/vendor/delaunator.min.js',
                [], '5.0.0', true);

            // CityGrinder scripts
            wp_enqueue_script('citygrinder-generator',
                CITYGRINDER_PLUGIN_URL . 'assets/js/city-generator.js',
                ['seedrandom', 'delaunator'], CITYGRINDER_VERSION, true);
            wp_enqueue_script('citygrinder-renderer',
                CITYGRINDER_PLUGIN_URL . 'assets/js/city-renderer.js',
                ['citygrinder-generator'], CITYGRINDER_VERSION, true);
            wp_enqueue_script('citygrinder-explorer',
                CITYGRINDER_PLUGIN_URL . 'assets/js/city-explorer.js',
                ['citygrinder-renderer', 'jquery'], CITYGRINDER_VERSION, true);

            // Localize script
            wp_localize_script('citygrinder-explorer', 'citygrinder_ajax', [
                'ajax_url' => admin_url('admin-ajax.php'),
                'nonce' => wp_create_nonce('citygrinder_nonce'),
                'plugin_url' => CITYGRINDER_PLUGIN_URL
            ]);

            // Styles
            wp_enqueue_style('citygrinder-styles',
                CITYGRINDER_PLUGIN_URL . 'assets/css/citygrinder.css',
                [], CITYGRINDER_VERSION);
        }
    }

    public function hexgrinder_integration() {
        if (class_exists('HexGrinder')) {
            // Add settlement click handler
            add_filter('hexgrinder_hex_actions', [$this, 'add_city_action'], 10, 2);
            add_action('hexgrinder_after_hex_panel', [$this, 'render_city_button']);
        }
    }

    private function should_load_assets() {
        global $post;
        return is_a($post, 'WP_Post') && (
            has_shortcode($post->post_content, 'citygrinder') ||
            has_shortcode($post->post_content, 'city_view')
        );
    }
}

// Initialize plugin
add_action('plugins_loaded', function() {
    CityGrinder::get_instance();
});
```

### 1.2 Database Schema

```php
<?php
// includes/class-citygrinder-db.php

class CityGrinder_DB {

    public static function init() {
        // Database hooks if needed
    }

    public static function create_tables() {
        global $wpdb;
        $charset_collate = $wpdb->get_charset_collate();

        $tables = [];

        // Cities table
        $tables[] = "CREATE TABLE {$wpdb->prefix}citygrinder_cities (
            id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            user_id BIGINT(20) UNSIGNED NOT NULL,
            hex_id BIGINT(20) UNSIGNED DEFAULT NULL,
            name VARCHAR(255) NOT NULL,
            seed VARCHAR(64) NOT NULL,
            city_type VARCHAR(50) NOT NULL DEFAULT 'town',
            size_class VARCHAR(20) NOT NULL DEFAULT 'medium',
            population INT(11) DEFAULT 0,
            city_data LONGTEXT NOT NULL,
            settings LONGTEXT,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY user_id (user_id),
            KEY hex_id (hex_id),
            KEY seed (seed)
        ) $charset_collate;";

        // Districts table
        $tables[] = "CREATE TABLE {$wpdb->prefix}citygrinder_districts (
            id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            city_id BIGINT(20) UNSIGNED NOT NULL,
            name VARCHAR(255) NOT NULL,
            district_type VARCHAR(50) NOT NULL,
            description TEXT,
            polygon_data LONGTEXT NOT NULL,
            properties LONGTEXT,
            PRIMARY KEY (id),
            KEY city_id (city_id)
        ) $charset_collate;";

        // Buildings/POIs table
        $tables[] = "CREATE TABLE {$wpdb->prefix}citygrinder_buildings (
            id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            city_id BIGINT(20) UNSIGNED NOT NULL,
            district_id BIGINT(20) UNSIGNED DEFAULT NULL,
            name VARCHAR(255),
            building_type VARCHAR(50) NOT NULL,
            x_coord DECIMAL(10,4) NOT NULL,
            y_coord DECIMAL(10,4) NOT NULL,
            footprint LONGTEXT,
            properties LONGTEXT,
            notes TEXT,
            PRIMARY KEY (id),
            KEY city_id (city_id),
            KEY district_id (district_id),
            KEY building_type (building_type)
        ) $charset_collate;";

        // User notes table
        $tables[] = "CREATE TABLE {$wpdb->prefix}citygrinder_notes (
            id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            user_id BIGINT(20) UNSIGNED NOT NULL,
            city_id BIGINT(20) UNSIGNED NOT NULL,
            target_type VARCHAR(50) NOT NULL,
            target_id BIGINT(20) UNSIGNED NOT NULL,
            note_content TEXT NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY user_id_city (user_id, city_id)
        ) $charset_collate;";

        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');

        foreach ($tables as $sql) {
            dbDelta($sql);
        }
    }

    // CRUD Methods
    public static function save_city($data) {
        global $wpdb;

        $defaults = [
            'user_id' => get_current_user_id(),
            'city_data' => '{}',
            'settings' => '{}'
        ];

        $data = wp_parse_args($data, $defaults);

        if (isset($data['id']) && $data['id'] > 0) {
            $wpdb->update(
                $wpdb->prefix . 'citygrinder_cities',
                $data,
                ['id' => $data['id']]
            );
            return $data['id'];
        } else {
            $wpdb->insert($wpdb->prefix . 'citygrinder_cities', $data);
            return $wpdb->insert_id;
        }
    }

    public static function get_city($city_id) {
        global $wpdb;
        return $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$wpdb->prefix}citygrinder_cities WHERE id = %d",
            $city_id
        ));
    }

    public static function get_city_by_hex($hex_id) {
        global $wpdb;
        return $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$wpdb->prefix}citygrinder_cities WHERE hex_id = %d",
            $hex_id
        ));
    }

    public static function get_user_cities($user_id, $limit = 50) {
        global $wpdb;
        return $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM {$wpdb->prefix}citygrinder_cities
             WHERE user_id = %d ORDER BY updated_at DESC LIMIT %d",
            $user_id, $limit
        ));
    }

    public static function delete_city($city_id) {
        global $wpdb;

        // Delete related data first
        $wpdb->delete($wpdb->prefix . 'citygrinder_districts', ['city_id' => $city_id]);
        $wpdb->delete($wpdb->prefix . 'citygrinder_buildings', ['city_id' => $city_id]);
        $wpdb->delete($wpdb->prefix . 'citygrinder_notes', ['city_id' => $city_id]);

        // Delete city
        return $wpdb->delete($wpdb->prefix . 'citygrinder_cities', ['id' => $city_id]);
    }
}
```

### 1.3 AJAX API

```php
<?php
// includes/class-citygrinder-api.php

class CityGrinder_API {

    public static function init() {
        // Authenticated actions
        add_action('wp_ajax_citygrinder_generate', [__CLASS__, 'generate_city']);
        add_action('wp_ajax_citygrinder_save', [__CLASS__, 'save_city']);
        add_action('wp_ajax_citygrinder_load', [__CLASS__, 'load_city']);
        add_action('wp_ajax_citygrinder_delete', [__CLASS__, 'delete_city']);
        add_action('wp_ajax_citygrinder_list', [__CLASS__, 'list_cities']);
        add_action('wp_ajax_citygrinder_link_hex', [__CLASS__, 'link_to_hex']);

        // Public actions (read-only for shared cities)
        add_action('wp_ajax_nopriv_citygrinder_load', [__CLASS__, 'load_city']);
    }

    private static function verify_nonce() {
        if (!check_ajax_referer('citygrinder_nonce', 'nonce', false)) {
            wp_send_json_error(['message' => 'Invalid security token']);
        }
    }

    public static function generate_city() {
        self::verify_nonce();

        $seed = sanitize_text_field($_POST['seed'] ?? '');
        $city_type = sanitize_text_field($_POST['city_type'] ?? 'town');
        $size_class = sanitize_text_field($_POST['size_class'] ?? 'medium');

        // Generation happens client-side in JavaScript
        // This endpoint just validates and prepares parameters

        $params = [
            'seed' => $seed ?: self::generate_seed(),
            'city_type' => $city_type,
            'size_class' => $size_class,
            'timestamp' => time()
        ];

        wp_send_json_success($params);
    }

    public static function save_city() {
        self::verify_nonce();

        if (!is_user_logged_in()) {
            wp_send_json_error(['message' => 'Login required']);
        }

        $city_data = [
            'id' => intval($_POST['city_id'] ?? 0),
            'user_id' => get_current_user_id(),
            'name' => sanitize_text_field($_POST['name']),
            'seed' => sanitize_text_field($_POST['seed']),
            'city_type' => sanitize_text_field($_POST['city_type']),
            'size_class' => sanitize_text_field($_POST['size_class']),
            'population' => intval($_POST['population'] ?? 0),
            'city_data' => wp_json_encode($_POST['city_data'] ?? []),
            'settings' => wp_json_encode($_POST['settings'] ?? [])
        ];

        $city_id = CityGrinder_DB::save_city($city_data);

        if ($city_id) {
            wp_send_json_success([
                'city_id' => $city_id,
                'message' => 'City saved successfully'
            ]);
        } else {
            wp_send_json_error(['message' => 'Failed to save city']);
        }
    }

    public static function load_city() {
        self::verify_nonce();

        $city_id = intval($_POST['city_id'] ?? 0);
        $hex_id = intval($_POST['hex_id'] ?? 0);

        if ($hex_id > 0) {
            $city = CityGrinder_DB::get_city_by_hex($hex_id);
        } else {
            $city = CityGrinder_DB::get_city($city_id);
        }

        if (!$city) {
            wp_send_json_error(['message' => 'City not found']);
        }

        // Check permissions (owner or shared)
        $can_view = $city->user_id == get_current_user_id();
        // Add sharing logic here

        if (!$can_view && !is_user_logged_in()) {
            wp_send_json_error(['message' => 'Access denied']);
        }

        wp_send_json_success([
            'city' => [
                'id' => $city->id,
                'name' => $city->name,
                'seed' => $city->seed,
                'city_type' => $city->city_type,
                'size_class' => $city->size_class,
                'population' => $city->population,
                'city_data' => json_decode($city->city_data, true),
                'settings' => json_decode($city->settings, true)
            ]
        ]);
    }

    public static function list_cities() {
        self::verify_nonce();

        if (!is_user_logged_in()) {
            wp_send_json_error(['message' => 'Login required']);
        }

        $cities = CityGrinder_DB::get_user_cities(get_current_user_id());

        $result = array_map(function($city) {
            return [
                'id' => $city->id,
                'name' => $city->name,
                'city_type' => $city->city_type,
                'size_class' => $city->size_class,
                'updated_at' => $city->updated_at
            ];
        }, $cities);

        wp_send_json_success(['cities' => $result]);
    }

    public static function link_to_hex() {
        self::verify_nonce();

        if (!is_user_logged_in()) {
            wp_send_json_error(['message' => 'Login required']);
        }

        $city_id = intval($_POST['city_id']);
        $hex_id = intval($_POST['hex_id']);

        global $wpdb;
        $result = $wpdb->update(
            $wpdb->prefix . 'citygrinder_cities',
            ['hex_id' => $hex_id],
            ['id' => $city_id, 'user_id' => get_current_user_id()]
        );

        if ($result !== false) {
            wp_send_json_success(['message' => 'City linked to hex']);
        } else {
            wp_send_json_error(['message' => 'Failed to link city']);
        }
    }

    public static function delete_city() {
        self::verify_nonce();

        if (!is_user_logged_in()) {
            wp_send_json_error(['message' => 'Login required']);
        }

        $city_id = intval($_POST['city_id']);
        $city = CityGrinder_DB::get_city($city_id);

        if (!$city || $city->user_id != get_current_user_id()) {
            wp_send_json_error(['message' => 'Access denied']);
        }

        CityGrinder_DB::delete_city($city_id);
        wp_send_json_success(['message' => 'City deleted']);
    }

    private static function generate_seed() {
        return bin2hex(random_bytes(8));
    }
}
```

---

## Phase 2: City Generation Engine

### 2.1 Core Generator Structure

```javascript
// assets/js/city-generator.js

/**
 * CityGrinder - Procedural City Generator
 * Inspired by watabou's Medieval Fantasy City Generator
 */

class CityGenerator {
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

    generateSeed() {
        return Math.random().toString(36).substring(2, 15);
    }

    random() {
        return this.rng();
    }

    randomInt(min, max) {
        return Math.floor(this.random() * (max - min + 1)) + min;
    }

    randomChoice(array) {
        return array[Math.floor(this.random() * array.length)];
    }

    generate() {
        this.city = {
            seed: this.seed,
            config: this.config,
            bounds: this.calculateBounds(),
            districts: [],
            streets: [],
            buildings: [],
            walls: null,
            water: null,
            pois: []
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

    generateTerrain() {
        // Water features
        if (this.config.hasRiver) {
            this.city.water = this.generateRiver();
        } else if (this.config.isCoastal) {
            this.city.water = this.generateCoastline();
        }
    }

    generateRiver() {
        const bounds = this.city.bounds;
        const points = [];

        // River flows roughly through the city
        const startSide = this.randomInt(0, 3);
        let x, y;

        // Start point
        switch(startSide) {
            case 0: x = 0; y = this.randomInt(bounds.height * 0.2, bounds.height * 0.8); break;
            case 1: x = bounds.width; y = this.randomInt(bounds.height * 0.2, bounds.height * 0.8); break;
            case 2: x = this.randomInt(bounds.width * 0.2, bounds.width * 0.8); y = 0; break;
            case 3: x = this.randomInt(bounds.width * 0.2, bounds.width * 0.8); y = bounds.height; break;
        }

        points.push({ x, y });

        // Meander through city
        const segments = this.randomInt(3, 6);
        for (let i = 0; i < segments; i++) {
            x += (this.random() - 0.5) * bounds.width * 0.3;
            y += (this.random() - 0.5) * bounds.height * 0.3;
            x = Math.max(0, Math.min(bounds.width, x));
            y = Math.max(0, Math.min(bounds.height, y));
            points.push({ x, y });
        }

        return {
            type: 'river',
            points: points,
            width: this.randomInt(15, 40)
        };
    }

    generateCoastline() {
        const bounds = this.city.bounds;
        const side = this.randomInt(0, 3);

        return {
            type: 'coast',
            side: side,
            points: this.generateCoastPoints(side, bounds)
        };
    }

    generateCoastPoints(side, bounds) {
        const points = [];
        const segments = 20;

        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            let x, y, offset;

            offset = (this.random() - 0.5) * 50;

            switch(side) {
                case 0: // Left coast
                    x = bounds.width * 0.15 + offset;
                    y = t * bounds.height;
                    break;
                case 1: // Right coast
                    x = bounds.width * 0.85 + offset;
                    y = t * bounds.height;
                    break;
                case 2: // Top coast
                    x = t * bounds.width;
                    y = bounds.height * 0.15 + offset;
                    break;
                case 3: // Bottom coast
                    x = t * bounds.width;
                    y = bounds.height * 0.85 + offset;
                    break;
            }

            points.push({ x, y });
        }

        return points;
    }

    generateDistricts() {
        const bounds = this.city.bounds;
        const districtCount = this.getDistrictCount();

        // Generate Voronoi seed points
        const seedPoints = this.generateDistrictSeeds(districtCount);

        // Create Voronoi diagram using Delaunator
        const delaunay = Delaunator.from(seedPoints.map(p => [p.x, p.y]));
        const voronoi = this.computeVoronoi(delaunay, seedPoints, bounds);

        // Assign district types
        const districtTypes = this.assignDistrictTypes(voronoi.cells);

        this.city.districts = voronoi.cells.map((cell, i) => ({
            id: i,
            type: districtTypes[i],
            name: this.generateDistrictName(districtTypes[i]),
            polygon: cell.polygon,
            center: seedPoints[i],
            area: this.polygonArea(cell.polygon)
        }));
    }

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

    generateDistrictSeeds(count) {
        const bounds = this.city.bounds;
        const points = [];
        const margin = 50;

        // Always have a center point
        points.push({
            x: bounds.centerX + (this.random() - 0.5) * 50,
            y: bounds.centerY + (this.random() - 0.5) * 50
        });

        // Generate remaining points with good distribution
        for (let i = 1; i < count; i++) {
            let bestPoint = null;
            let bestDist = 0;

            // Try several candidates, keep the one furthest from existing points
            for (let j = 0; j < 20; j++) {
                const candidate = {
                    x: margin + this.random() * (bounds.width - margin * 2),
                    y: margin + this.random() * (bounds.height - margin * 2)
                };

                const minDist = Math.min(...points.map(p =>
                    Math.hypot(p.x - candidate.x, p.y - candidate.y)
                ));

                if (minDist > bestDist) {
                    bestDist = minDist;
                    bestPoint = candidate;
                }
            }

            points.push(bestPoint);
        }

        return points;
    }

    computeVoronoi(delaunay, points, bounds) {
        // Simplified Voronoi computation
        // In production, use a proper Voronoi library
        const cells = points.map((point, i) => {
            return {
                polygon: this.computeVoronoiCell(i, delaunay, points, bounds),
                center: point
            };
        });

        return { cells };
    }

    computeVoronoiCell(index, delaunay, points, bounds) {
        // Simplified - creates approximate cell boundaries
        // Real implementation should use proper Voronoi algorithm
        const center = points[index];
        const angles = [];

        // Find neighboring points
        for (let i = 0; i < points.length; i++) {
            if (i !== index) {
                const angle = Math.atan2(
                    points[i].y - center.y,
                    points[i].x - center.x
                );
                const dist = Math.hypot(
                    points[i].x - center.x,
                    points[i].y - center.y
                );
                angles.push({ angle, dist, neighbor: i });
            }
        }

        // Sort by angle and create polygon
        angles.sort((a, b) => a.angle - b.angle);

        const polygon = [];
        const numSides = Math.min(angles.length, 8);

        for (let i = 0; i < numSides; i++) {
            const a = angles[i];
            const midDist = a.dist / 2;
            polygon.push({
                x: center.x + Math.cos(a.angle) * midDist,
                y: center.y + Math.sin(a.angle) * midDist
            });
        }

        return polygon;
    }

    assignDistrictTypes(cells) {
        const types = [];
        const availableTypes = [
            'market', 'residential', 'noble', 'craftsmen',
            'temple', 'docks', 'slums', 'military'
        ];

        // Center district is usually market or noble
        types[0] = this.random() > 0.5 ? 'market' : 'noble';

        // Assign remaining districts
        for (let i = 1; i < cells.length; i++) {
            types[i] = this.randomChoice(availableTypes);
        }

        return types;
    }

    generateDistrictName(type) {
        const prefixes = {
            market: ['Market', 'Trade', 'Merchant', 'Commerce'],
            residential: ['Common', 'Lower', 'Garden', 'Hearth'],
            noble: ['High', 'Noble', 'Crown', 'Silver'],
            craftsmen: ['Craft', 'Forge', 'Guild', 'Hammer'],
            temple: ['Temple', 'Sacred', 'Divine', 'Holy'],
            docks: ['Harbor', 'Dock', 'Port', 'Sailor'],
            slums: ['Shadow', 'Outer', 'Lower', 'Mud'],
            military: ['Garrison', 'Watch', 'Guard', 'Fort']
        };

        const suffixes = ['Quarter', 'Ward', 'District', 'Borough'];

        const prefix = this.randomChoice(prefixes[type] || prefixes.residential);
        const suffix = this.randomChoice(suffixes);

        return `${prefix} ${suffix}`;
    }

    generateStreets() {
        // Generate main roads connecting district centers
        this.city.streets = [];

        const districts = this.city.districts;

        // Connect districts with main roads
        for (let i = 0; i < districts.length; i++) {
            for (let j = i + 1; j < districts.length; j++) {
                const dist = Math.hypot(
                    districts[i].center.x - districts[j].center.x,
                    districts[i].center.y - districts[j].center.y
                );

                // Connect nearby districts
                if (dist < this.city.bounds.width * 0.4) {
                    this.city.streets.push({
                        type: 'main',
                        points: [districts[i].center, districts[j].center],
                        width: 8
                    });
                }
            }
        }

        // Add secondary streets within districts
        districts.forEach(district => {
            this.generateDistrictStreets(district);
        });
    }

    generateDistrictStreets(district) {
        const streetCount = this.randomInt(2, 5);

        for (let i = 0; i < streetCount; i++) {
            const start = {
                x: district.center.x + (this.random() - 0.5) * 100,
                y: district.center.y + (this.random() - 0.5) * 100
            };
            const end = {
                x: district.center.x + (this.random() - 0.5) * 100,
                y: district.center.y + (this.random() - 0.5) * 100
            };

            this.city.streets.push({
                type: 'secondary',
                points: [start, end],
                width: 4
            });
        }
    }

    generateBuildings() {
        this.city.buildings = [];

        this.city.districts.forEach(district => {
            const buildingCount = this.getBuildingCount(district);

            for (let i = 0; i < buildingCount; i++) {
                const building = this.generateBuilding(district);
                if (building) {
                    this.city.buildings.push(building);
                }
            }
        });
    }

    getBuildingCount(district) {
        const baseCounts = {
            hamlet: 10,
            village: 25,
            town: 50,
            city: 100,
            metropolis: 200
        };

        const base = baseCounts[this.config.sizeClass] || 50;
        const areaFactor = district.area / 10000;

        return Math.floor(base * areaFactor * (0.8 + this.random() * 0.4));
    }

    generateBuilding(district) {
        // Random position within district (simplified)
        const x = district.center.x + (this.random() - 0.5) * 80;
        const y = district.center.y + (this.random() - 0.5) * 80;

        const width = this.randomInt(8, 20);
        const height = this.randomInt(8, 20);
        const rotation = this.random() * Math.PI * 0.25;

        return {
            districtId: district.id,
            x, y,
            width, height,
            rotation,
            type: this.getBuildingType(district.type),
            footprint: this.generateFootprint(x, y, width, height, rotation)
        };
    }

    getBuildingType(districtType) {
        const buildingTypes = {
            market: ['shop', 'warehouse', 'inn', 'tavern'],
            residential: ['house', 'house', 'house', 'shop'],
            noble: ['mansion', 'estate', 'garden', 'house'],
            craftsmen: ['workshop', 'smithy', 'house', 'warehouse'],
            temple: ['shrine', 'chapel', 'house', 'hospice'],
            docks: ['warehouse', 'tavern', 'fishery', 'house'],
            slums: ['shack', 'shack', 'house', 'den'],
            military: ['barracks', 'armory', 'stable', 'house']
        };

        return this.randomChoice(buildingTypes[districtType] || buildingTypes.residential);
    }

    generateFootprint(x, y, width, height, rotation) {
        // Generate building footprint as polygon
        const corners = [
            { x: -width/2, y: -height/2 },
            { x: width/2, y: -height/2 },
            { x: width/2, y: height/2 },
            { x: -width/2, y: height/2 }
        ];

        // Rotate and translate
        return corners.map(c => ({
            x: x + c.x * Math.cos(rotation) - c.y * Math.sin(rotation),
            y: y + c.x * Math.sin(rotation) + c.y * Math.cos(rotation)
        }));
    }

    generateWalls() {
        const bounds = this.city.bounds;
        const margin = 30;

        // Simple rectangular walls for now
        // Advanced: convex hull of buildings with towers
        const wallPath = [
            { x: margin, y: margin },
            { x: bounds.width - margin, y: margin },
            { x: bounds.width - margin, y: bounds.height - margin },
            { x: margin, y: bounds.height - margin }
        ];

        // Add gates
        const gates = [
            { x: bounds.centerX, y: margin, direction: 'north' },
            { x: bounds.centerX, y: bounds.height - margin, direction: 'south' },
            { x: margin, y: bounds.centerY, direction: 'west' },
            { x: bounds.width - margin, y: bounds.centerY, direction: 'east' }
        ];

        // Add towers at corners
        const towers = wallPath.map(p => ({ x: p.x, y: p.y, type: 'corner' }));

        this.city.walls = {
            path: wallPath,
            gates: gates,
            towers: towers,
            thickness: 6
        };
    }

    generatePOIs() {
        // Add notable locations
        this.city.pois = [];

        // Central landmark
        this.city.pois.push({
            type: 'landmark',
            name: this.generateLandmarkName(),
            x: this.city.bounds.centerX,
            y: this.city.bounds.centerY,
            description: 'The central landmark of the city'
        });

        // Add temples, taverns, etc. based on districts
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

    generateLandmarkName() {
        const types = ['Castle', 'Keep', 'Tower', 'Palace', 'Citadel'];
        const adjectives = ['Grand', 'Royal', 'Ancient', 'Great', 'Old'];
        return `The ${this.randomChoice(adjectives)} ${this.randomChoice(types)}`;
    }

    generateTempleName() {
        const deities = ['Light', 'Sun', 'Moon', 'Stars', 'Dawn'];
        return `Temple of ${this.randomChoice(deities)}`;
    }

    calculatePopulation() {
        const basePopulation = {
            hamlet: 50,
            village: 300,
            town: 2000,
            city: 10000,
            metropolis: 50000
        };

        const base = basePopulation[this.config.sizeClass] || 2000;
        const variance = this.random() * 0.4 + 0.8;

        this.city.population = Math.floor(base * variance);
    }

    polygonArea(polygon) {
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

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CityGenerator;
} else {
    window.CityGenerator = CityGenerator;
}
```

---

## Phase 3: Rendering System

See the full `city-renderer.js` implementation in the assets folder.

Key features:
- Canvas-based rendering with layer system
- Zoom/pan with mouse and touch
- SVG export capability
- Configurable styles matching HexGrinder

---

## Phase 4: HexGrinder Integration

### Integration Filter

```php
// Add to citygrinder.php or separate integration file

class CityGrinder_HexGrinder_Integration {

    public static function init() {
        if (!class_exists('HexGrinder')) {
            return;
        }

        // Add city button to hex panel
        add_action('hexgrinder_hex_panel_actions', [__CLASS__, 'add_city_button'], 10, 2);

        // Handle settlement hex types
        add_filter('hexgrinder_hex_info', [__CLASS__, 'add_city_info'], 10, 2);

        // Add city generation from hex
        add_action('wp_ajax_citygrinder_from_hex', [__CLASS__, 'generate_from_hex']);
    }

    public static function add_city_button($hex, $hex_data) {
        $settlement_types = ['village', 'town', 'city', 'castle', 'port'];

        if (in_array($hex_data['terrain'], $settlement_types)) {
            ?>
            <button class="citygrinder-enter-btn"
                    data-hex-id="<?php echo esc_attr($hex['id']); ?>"
                    data-hex-x="<?php echo esc_attr($hex['x']); ?>"
                    data-hex-y="<?php echo esc_attr($hex['y']); ?>">
                Enter Settlement
            </button>
            <?php
        }
    }

    public static function add_city_info($info, $hex) {
        $city = CityGrinder_DB::get_city_by_hex($hex['id']);

        if ($city) {
            $info['linked_city'] = [
                'id' => $city->id,
                'name' => $city->name,
                'population' => $city->population
            ];
        }

        return $info;
    }

    public static function generate_from_hex() {
        check_ajax_referer('citygrinder_nonce', 'nonce');

        $hex_id = intval($_POST['hex_id']);
        $hex_x = intval($_POST['hex_x']);
        $hex_y = intval($_POST['hex_y']);
        $terrain = sanitize_text_field($_POST['terrain']);

        // Check if city already exists for this hex
        $existing = CityGrinder_DB::get_city_by_hex($hex_id);

        if ($existing) {
            wp_send_json_success([
                'action' => 'load',
                'city_id' => $existing->id
            ]);
        }

        // Generate deterministic seed from hex coordinates
        $seed = md5("hex_{$hex_x}_{$hex_y}");

        // Map terrain to city type
        $type_map = [
            'village' => ['type' => 'village', 'size' => 'village'],
            'town' => ['type' => 'town', 'size' => 'town'],
            'city' => ['type' => 'city', 'size' => 'city'],
            'castle' => ['type' => 'fortress', 'size' => 'town'],
            'port' => ['type' => 'coastal', 'size' => 'town']
        ];

        $config = $type_map[$terrain] ?? $type_map['town'];

        wp_send_json_success([
            'action' => 'generate',
            'seed' => $seed,
            'city_type' => $config['type'],
            'size_class' => $config['size'],
            'hex_id' => $hex_id
        ]);
    }
}

add_action('plugins_loaded', ['CityGrinder_HexGrinder_Integration', 'init'], 20);
```

---

## Summary

This implementation guide provides the foundation for building CityGrinder as a WordPress plugin. Each phase builds on the previous, allowing for iterative development and testing.

Key principles:
1. **Modular architecture** - Matches HexGrinder patterns
2. **Client-side generation** - Heavy lifting in JavaScript for performance
3. **WordPress-native** - Uses standard hooks, AJAX, and database patterns
4. **Progressive enhancement** - Works standalone, better with HexGrinder
