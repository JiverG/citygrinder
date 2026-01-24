<?php
/**
 * CityGrinder Database Class
 *
 * Handles all database operations including table creation and CRUD operations.
 *
 * @package CityGrinder
 * @since 1.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Database handler class
 */
class CityGrinder_DB {

    /**
     * Table names cache
     *
     * @var array
     */
    private static $tables = [];

    /**
     * Initialize database class
     */
    public static function init() {
        self::set_table_names();

        // Check for database updates
        add_action('admin_init', [__CLASS__, 'maybe_upgrade']);
    }

    /**
     * Set table names
     */
    private static function set_table_names() {
        global $wpdb;

        self::$tables = [
            'cities' => $wpdb->prefix . 'citygrinder_cities',
            'districts' => $wpdb->prefix . 'citygrinder_districts',
            'buildings' => $wpdb->prefix . 'citygrinder_buildings',
            'notes' => $wpdb->prefix . 'citygrinder_notes',
        ];
    }

    /**
     * Get table name
     *
     * @param string $table Table key
     * @return string
     */
    public static function get_table($table) {
        if (empty(self::$tables)) {
            self::set_table_names();
        }
        return self::$tables[$table] ?? '';
    }

    /**
     * Create database tables
     */
    public static function create_tables() {
        global $wpdb;

        $charset_collate = $wpdb->get_charset_collate();

        self::set_table_names();

        $sql = [];

        // Cities table - stores generated city data
        $sql[] = "CREATE TABLE " . self::$tables['cities'] . " (
            id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            user_id BIGINT(20) UNSIGNED NOT NULL,
            hex_id BIGINT(20) UNSIGNED DEFAULT NULL,
            name VARCHAR(255) NOT NULL,
            seed VARCHAR(64) NOT NULL,
            city_type VARCHAR(50) NOT NULL DEFAULT 'town',
            size_class VARCHAR(20) NOT NULL DEFAULT 'medium',
            population INT(11) DEFAULT 0,
            has_walls TINYINT(1) DEFAULT 1,
            has_river TINYINT(1) DEFAULT 0,
            is_coastal TINYINT(1) DEFAULT 0,
            city_data LONGTEXT NOT NULL,
            settings LONGTEXT,
            thumbnail LONGTEXT,
            is_shared TINYINT(1) DEFAULT 0,
            share_token VARCHAR(64) DEFAULT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY user_id (user_id),
            KEY hex_id (hex_id),
            KEY seed (seed),
            KEY city_type (city_type),
            KEY share_token (share_token)
        ) $charset_collate;";

        // Districts table - stores district information
        $sql[] = "CREATE TABLE " . self::$tables['districts'] . " (
            id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            city_id BIGINT(20) UNSIGNED NOT NULL,
            district_index INT(11) NOT NULL DEFAULT 0,
            name VARCHAR(255) NOT NULL,
            district_type VARCHAR(50) NOT NULL,
            description TEXT,
            center_x DECIMAL(10,4) NOT NULL,
            center_y DECIMAL(10,4) NOT NULL,
            area DECIMAL(15,4) DEFAULT 0,
            polygon_data LONGTEXT NOT NULL,
            properties LONGTEXT,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY city_id (city_id),
            KEY district_type (district_type)
        ) $charset_collate;";

        // Buildings table - stores building/POI information
        $sql[] = "CREATE TABLE " . self::$tables['buildings'] . " (
            id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            city_id BIGINT(20) UNSIGNED NOT NULL,
            district_id BIGINT(20) UNSIGNED DEFAULT NULL,
            name VARCHAR(255),
            building_type VARCHAR(50) NOT NULL,
            is_poi TINYINT(1) DEFAULT 0,
            x_coord DECIMAL(10,4) NOT NULL,
            y_coord DECIMAL(10,4) NOT NULL,
            width DECIMAL(10,4) DEFAULT 0,
            height DECIMAL(10,4) DEFAULT 0,
            rotation DECIMAL(10,4) DEFAULT 0,
            footprint LONGTEXT,
            properties LONGTEXT,
            description TEXT,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY city_id (city_id),
            KEY district_id (district_id),
            KEY building_type (building_type),
            KEY is_poi (is_poi)
        ) $charset_collate;";

        // User notes table - stores user annotations
        $sql[] = "CREATE TABLE " . self::$tables['notes'] . " (
            id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            user_id BIGINT(20) UNSIGNED NOT NULL,
            city_id BIGINT(20) UNSIGNED NOT NULL,
            target_type ENUM('city', 'district', 'building') NOT NULL DEFAULT 'city',
            target_id BIGINT(20) UNSIGNED DEFAULT NULL,
            note_title VARCHAR(255),
            note_content TEXT NOT NULL,
            is_private TINYINT(1) DEFAULT 1,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY user_id (user_id),
            KEY city_id (city_id),
            KEY target_type_id (target_type, target_id)
        ) $charset_collate;";

        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');

        foreach ($sql as $query) {
            dbDelta($query);
        }
    }

    /**
     * Check and run database upgrades
     */
    public static function maybe_upgrade() {
        $current_version = get_option('citygrinder_db_version', '0');

        if (version_compare($current_version, CITYGRINDER_DB_VERSION, '<')) {
            self::create_tables();
            update_option('citygrinder_db_version', CITYGRINDER_DB_VERSION);
        }
    }

    // =========================================================================
    // CITY CRUD OPERATIONS
    // =========================================================================

    /**
     * Save or update a city
     *
     * @param array $data City data
     * @return int|false City ID on success, false on failure
     */
    public static function save_city($data) {
        global $wpdb;

        $defaults = [
            'user_id' => get_current_user_id(),
            'name' => 'Unnamed City',
            'seed' => '',
            'city_type' => 'town',
            'size_class' => 'medium',
            'population' => 0,
            'has_walls' => 1,
            'has_river' => 0,
            'is_coastal' => 0,
            'city_data' => '{}',
            'settings' => '{}',
        ];

        $data = wp_parse_args($data, $defaults);

        // Ensure JSON fields are strings
        if (is_array($data['city_data'])) {
            $data['city_data'] = wp_json_encode($data['city_data']);
        }
        if (is_array($data['settings'])) {
            $data['settings'] = wp_json_encode($data['settings']);
        }

        // Update or insert
        if (!empty($data['id']) && $data['id'] > 0) {
            $city_id = absint($data['id']);
            unset($data['id']);
            unset($data['created_at']);

            $result = $wpdb->update(
                self::$tables['cities'],
                $data,
                ['id' => $city_id],
                self::get_city_formats($data),
                ['%d']
            );

            return $result !== false ? $city_id : false;
        } else {
            unset($data['id']);

            $result = $wpdb->insert(
                self::$tables['cities'],
                $data,
                self::get_city_formats($data)
            );

            return $result ? $wpdb->insert_id : false;
        }
    }

    /**
     * Get format array for city data
     *
     * @param array $data City data
     * @return array
     */
    private static function get_city_formats($data) {
        $formats = [];
        $format_map = [
            'user_id' => '%d',
            'hex_id' => '%d',
            'name' => '%s',
            'seed' => '%s',
            'city_type' => '%s',
            'size_class' => '%s',
            'population' => '%d',
            'has_walls' => '%d',
            'has_river' => '%d',
            'is_coastal' => '%d',
            'city_data' => '%s',
            'settings' => '%s',
            'thumbnail' => '%s',
            'is_shared' => '%d',
            'share_token' => '%s',
        ];

        foreach (array_keys($data) as $key) {
            $formats[] = $format_map[$key] ?? '%s';
        }

        return $formats;
    }

    /**
     * Get a city by ID
     *
     * @param int $city_id City ID
     * @return object|null
     */
    public static function get_city($city_id) {
        global $wpdb;

        $city = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM " . self::$tables['cities'] . " WHERE id = %d",
            $city_id
        ));

        if ($city) {
            $city->city_data = json_decode($city->city_data, true);
            $city->settings = json_decode($city->settings, true);
        }

        return $city;
    }

    /**
     * Get a city by hex ID
     *
     * @param int $hex_id Hex ID
     * @param int|null $user_id Optional user ID filter
     * @return object|null
     */
    public static function get_city_by_hex($hex_id, $user_id = null) {
        global $wpdb;

        $sql = "SELECT * FROM " . self::$tables['cities'] . " WHERE hex_id = %d";
        $params = [$hex_id];

        if ($user_id) {
            $sql .= " AND user_id = %d";
            $params[] = $user_id;
        }

        $city = $wpdb->get_row($wpdb->prepare($sql, $params));

        if ($city) {
            $city->city_data = json_decode($city->city_data, true);
            $city->settings = json_decode($city->settings, true);
        }

        return $city;
    }

    /**
     * Get a city by seed
     *
     * @param string $seed City seed
     * @param int|null $user_id Optional user ID filter
     * @return object|null
     */
    public static function get_city_by_seed($seed, $user_id = null) {
        global $wpdb;

        $sql = "SELECT * FROM " . self::$tables['cities'] . " WHERE seed = %s";
        $params = [$seed];

        if ($user_id) {
            $sql .= " AND user_id = %d";
            $params[] = $user_id;
        }

        $city = $wpdb->get_row($wpdb->prepare($sql, $params));

        if ($city) {
            $city->city_data = json_decode($city->city_data, true);
            $city->settings = json_decode($city->settings, true);
        }

        return $city;
    }

    /**
     * Get a city by share token
     *
     * @param string $token Share token
     * @return object|null
     */
    public static function get_city_by_share_token($token) {
        global $wpdb;

        $city = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM " . self::$tables['cities'] . " WHERE share_token = %s AND is_shared = 1",
            $token
        ));

        if ($city) {
            $city->city_data = json_decode($city->city_data, true);
            $city->settings = json_decode($city->settings, true);
        }

        return $city;
    }

    /**
     * Get cities for a user
     *
     * @param int $user_id User ID
     * @param array $args Query arguments
     * @return array
     */
    public static function get_user_cities($user_id, $args = []) {
        global $wpdb;

        $defaults = [
            'limit' => 50,
            'offset' => 0,
            'orderby' => 'updated_at',
            'order' => 'DESC',
            'city_type' => '',
        ];

        $args = wp_parse_args($args, $defaults);

        $sql = "SELECT id, user_id, hex_id, name, seed, city_type, size_class, population,
                       has_walls, has_river, is_coastal, is_shared, created_at, updated_at
                FROM " . self::$tables['cities'] . "
                WHERE user_id = %d";
        $params = [$user_id];

        if (!empty($args['city_type'])) {
            $sql .= " AND city_type = %s";
            $params[] = $args['city_type'];
        }

        $allowed_orderby = ['id', 'name', 'created_at', 'updated_at', 'population'];
        $orderby = in_array($args['orderby'], $allowed_orderby) ? $args['orderby'] : 'updated_at';
        $order = strtoupper($args['order']) === 'ASC' ? 'ASC' : 'DESC';

        $sql .= " ORDER BY {$orderby} {$order}";
        $sql .= " LIMIT %d OFFSET %d";
        $params[] = absint($args['limit']);
        $params[] = absint($args['offset']);

        return $wpdb->get_results($wpdb->prepare($sql, $params));
    }

    /**
     * Get total city count for a user
     *
     * @param int $user_id User ID
     * @return int
     */
    public static function get_user_city_count($user_id) {
        global $wpdb;

        return (int) $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM " . self::$tables['cities'] . " WHERE user_id = %d",
            $user_id
        ));
    }

    /**
     * Delete a city and all related data
     *
     * @param int $city_id City ID
     * @param int|null $user_id User ID for permission check
     * @return bool
     */
    public static function delete_city($city_id, $user_id = null) {
        global $wpdb;

        // Check ownership if user_id provided
        if ($user_id) {
            $city = self::get_city($city_id);
            if (!$city || $city->user_id != $user_id) {
                return false;
            }
        }

        // Delete related data first
        $wpdb->delete(self::$tables['districts'], ['city_id' => $city_id], ['%d']);
        $wpdb->delete(self::$tables['buildings'], ['city_id' => $city_id], ['%d']);
        $wpdb->delete(self::$tables['notes'], ['city_id' => $city_id], ['%d']);

        // Delete city
        $result = $wpdb->delete(self::$tables['cities'], ['id' => $city_id], ['%d']);

        return $result !== false;
    }

    /**
     * Generate a unique share token
     *
     * @return string
     */
    public static function generate_share_token() {
        return bin2hex(random_bytes(16));
    }

    /**
     * Enable sharing for a city
     *
     * @param int $city_id City ID
     * @param int $user_id User ID
     * @return string|false Share token on success
     */
    public static function enable_sharing($city_id, $user_id) {
        global $wpdb;

        $city = self::get_city($city_id);
        if (!$city || $city->user_id != $user_id) {
            return false;
        }

        $token = self::generate_share_token();

        $result = $wpdb->update(
            self::$tables['cities'],
            [
                'is_shared' => 1,
                'share_token' => $token,
            ],
            ['id' => $city_id],
            ['%d', '%s'],
            ['%d']
        );

        return $result !== false ? $token : false;
    }

    /**
     * Disable sharing for a city
     *
     * @param int $city_id City ID
     * @param int $user_id User ID
     * @return bool
     */
    public static function disable_sharing($city_id, $user_id) {
        global $wpdb;

        $city = self::get_city($city_id);
        if (!$city || $city->user_id != $user_id) {
            return false;
        }

        $result = $wpdb->update(
            self::$tables['cities'],
            [
                'is_shared' => 0,
                'share_token' => null,
            ],
            ['id' => $city_id],
            ['%d', '%s'],
            ['%d']
        );

        return $result !== false;
    }

    // =========================================================================
    // DISTRICT OPERATIONS
    // =========================================================================

    /**
     * Save districts for a city
     *
     * @param int $city_id City ID
     * @param array $districts Array of district data
     * @return bool
     */
    public static function save_districts($city_id, $districts) {
        global $wpdb;

        // Clear existing districts
        $wpdb->delete(self::$tables['districts'], ['city_id' => $city_id], ['%d']);

        foreach ($districts as $index => $district) {
            $data = [
                'city_id' => $city_id,
                'district_index' => $index,
                'name' => $district['name'] ?? "District {$index}",
                'district_type' => $district['type'] ?? 'residential',
                'description' => $district['description'] ?? '',
                'center_x' => $district['center']['x'] ?? 0,
                'center_y' => $district['center']['y'] ?? 0,
                'area' => $district['area'] ?? 0,
                'polygon_data' => wp_json_encode($district['polygon'] ?? []),
                'properties' => wp_json_encode($district['properties'] ?? []),
            ];

            $wpdb->insert(self::$tables['districts'], $data);
        }

        return true;
    }

    /**
     * Get districts for a city
     *
     * @param int $city_id City ID
     * @return array
     */
    public static function get_districts($city_id) {
        global $wpdb;

        $districts = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM " . self::$tables['districts'] . "
             WHERE city_id = %d ORDER BY district_index ASC",
            $city_id
        ));

        foreach ($districts as &$district) {
            $district->polygon_data = json_decode($district->polygon_data, true);
            $district->properties = json_decode($district->properties, true);
        }

        return $districts;
    }

    // =========================================================================
    // BUILDING/POI OPERATIONS
    // =========================================================================

    /**
     * Save buildings for a city
     *
     * @param int $city_id City ID
     * @param array $buildings Array of building data
     * @return bool
     */
    public static function save_buildings($city_id, $buildings) {
        global $wpdb;

        // Clear existing buildings
        $wpdb->delete(self::$tables['buildings'], ['city_id' => $city_id], ['%d']);

        foreach ($buildings as $building) {
            $data = [
                'city_id' => $city_id,
                'district_id' => $building['districtId'] ?? null,
                'name' => $building['name'] ?? null,
                'building_type' => $building['type'] ?? 'house',
                'is_poi' => !empty($building['isPoi']) ? 1 : 0,
                'x_coord' => $building['x'] ?? 0,
                'y_coord' => $building['y'] ?? 0,
                'width' => $building['width'] ?? 0,
                'height' => $building['height'] ?? 0,
                'rotation' => $building['rotation'] ?? 0,
                'footprint' => wp_json_encode($building['footprint'] ?? []),
                'properties' => wp_json_encode($building['properties'] ?? []),
                'description' => $building['description'] ?? null,
            ];

            $wpdb->insert(self::$tables['buildings'], $data);
        }

        return true;
    }

    /**
     * Get buildings for a city
     *
     * @param int $city_id City ID
     * @param array $args Query arguments
     * @return array
     */
    public static function get_buildings($city_id, $args = []) {
        global $wpdb;

        $defaults = [
            'district_id' => null,
            'is_poi' => null,
            'building_type' => null,
        ];

        $args = wp_parse_args($args, $defaults);

        $sql = "SELECT * FROM " . self::$tables['buildings'] . " WHERE city_id = %d";
        $params = [$city_id];

        if ($args['district_id'] !== null) {
            $sql .= " AND district_id = %d";
            $params[] = $args['district_id'];
        }

        if ($args['is_poi'] !== null) {
            $sql .= " AND is_poi = %d";
            $params[] = $args['is_poi'] ? 1 : 0;
        }

        if ($args['building_type']) {
            $sql .= " AND building_type = %s";
            $params[] = $args['building_type'];
        }

        $buildings = $wpdb->get_results($wpdb->prepare($sql, $params));

        foreach ($buildings as &$building) {
            $building->footprint = json_decode($building->footprint, true);
            $building->properties = json_decode($building->properties, true);
        }

        return $buildings;
    }

    /**
     * Get POIs for a city
     *
     * @param int $city_id City ID
     * @return array
     */
    public static function get_pois($city_id) {
        return self::get_buildings($city_id, ['is_poi' => true]);
    }

    // =========================================================================
    // NOTES OPERATIONS
    // =========================================================================

    /**
     * Save a note
     *
     * @param array $data Note data
     * @return int|false Note ID on success
     */
    public static function save_note($data) {
        global $wpdb;

        $defaults = [
            'user_id' => get_current_user_id(),
            'target_type' => 'city',
            'is_private' => 1,
        ];

        $data = wp_parse_args($data, $defaults);

        if (!empty($data['id'])) {
            $note_id = absint($data['id']);
            unset($data['id']);

            $result = $wpdb->update(
                self::$tables['notes'],
                $data,
                ['id' => $note_id, 'user_id' => $data['user_id']]
            );

            return $result !== false ? $note_id : false;
        } else {
            $result = $wpdb->insert(self::$tables['notes'], $data);
            return $result ? $wpdb->insert_id : false;
        }
    }

    /**
     * Get notes for a city
     *
     * @param int $city_id City ID
     * @param int|null $user_id User ID
     * @param string|null $target_type Target type filter
     * @return array
     */
    public static function get_notes($city_id, $user_id = null, $target_type = null) {
        global $wpdb;

        $sql = "SELECT * FROM " . self::$tables['notes'] . " WHERE city_id = %d";
        $params = [$city_id];

        if ($user_id) {
            $sql .= " AND (user_id = %d OR is_private = 0)";
            $params[] = $user_id;
        } else {
            $sql .= " AND is_private = 0";
        }

        if ($target_type) {
            $sql .= " AND target_type = %s";
            $params[] = $target_type;
        }

        $sql .= " ORDER BY created_at DESC";

        return $wpdb->get_results($wpdb->prepare($sql, $params));
    }

    /**
     * Delete a note
     *
     * @param int $note_id Note ID
     * @param int $user_id User ID
     * @return bool
     */
    public static function delete_note($note_id, $user_id) {
        global $wpdb;

        $result = $wpdb->delete(
            self::$tables['notes'],
            ['id' => $note_id, 'user_id' => $user_id],
            ['%d', '%d']
        );

        return $result !== false;
    }

    // =========================================================================
    // UTILITY METHODS
    // =========================================================================

    /**
     * Check if user can access a city
     *
     * @param int $city_id City ID
     * @param int $user_id User ID
     * @return bool
     */
    public static function can_access_city($city_id, $user_id) {
        $city = self::get_city($city_id);

        if (!$city) {
            return false;
        }

        // Owner can always access
        if ($city->user_id == $user_id) {
            return true;
        }

        // Check if shared
        if ($city->is_shared) {
            return true;
        }

        return false;
    }

    /**
     * Check if user can edit a city
     *
     * @param int $city_id City ID
     * @param int $user_id User ID
     * @return bool
     */
    public static function can_edit_city($city_id, $user_id) {
        $city = self::get_city($city_id);

        if (!$city) {
            return false;
        }

        return $city->user_id == $user_id;
    }
}
