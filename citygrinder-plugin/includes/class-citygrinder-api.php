<?php
/**
 * CityGrinder API Class
 *
 * Handles all AJAX endpoints for city operations.
 *
 * @package CityGrinder
 * @since 1.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * API handler class
 */
class CityGrinder_API {

    /**
     * Initialize API
     */
    public static function init() {
        // City operations (authenticated)
        add_action('wp_ajax_citygrinder_save', [__CLASS__, 'save_city']);
        add_action('wp_ajax_citygrinder_delete', [__CLASS__, 'delete_city']);
        add_action('wp_ajax_citygrinder_list', [__CLASS__, 'list_cities']);
        add_action('wp_ajax_citygrinder_share', [__CLASS__, 'toggle_sharing']);
        add_action('wp_ajax_citygrinder_link_hex', [__CLASS__, 'link_to_hex']);

        // City operations (public for viewing shared cities)
        add_action('wp_ajax_citygrinder_load', [__CLASS__, 'load_city']);
        add_action('wp_ajax_nopriv_citygrinder_load', [__CLASS__, 'load_city']);

        // Generation parameters (public)
        add_action('wp_ajax_citygrinder_generate_params', [__CLASS__, 'get_generation_params']);
        add_action('wp_ajax_nopriv_citygrinder_generate_params', [__CLASS__, 'get_generation_params']);

        // Notes (authenticated)
        add_action('wp_ajax_citygrinder_save_note', [__CLASS__, 'save_note']);
        add_action('wp_ajax_citygrinder_delete_note', [__CLASS__, 'delete_note']);
        add_action('wp_ajax_citygrinder_get_notes', [__CLASS__, 'get_notes']);

        // Export (public for shared)
        add_action('wp_ajax_citygrinder_export', [__CLASS__, 'export_city']);
        add_action('wp_ajax_nopriv_citygrinder_export', [__CLASS__, 'export_city']);
    }

    /**
     * Verify nonce
     *
     * @param string $action Nonce action
     * @return bool
     */
    private static function verify_nonce($action = 'citygrinder_nonce') {
        $nonce = $_REQUEST['nonce'] ?? '';

        if (!wp_verify_nonce($nonce, $action)) {
            wp_send_json_error([
                'message' => __('Security check failed. Please refresh the page and try again.', 'citygrinder'),
                'code' => 'invalid_nonce'
            ], 403);
            return false;
        }

        return true;
    }

    /**
     * Check if user is logged in
     *
     * @return bool
     */
    private static function require_login() {
        if (!is_user_logged_in()) {
            wp_send_json_error([
                'message' => __('Please log in to perform this action.', 'citygrinder'),
                'code' => 'login_required'
            ], 401);
            return false;
        }

        return true;
    }

    /**
     * Sanitize city data from request
     *
     * @param array $raw Raw POST data
     * @return array
     */
    private static function sanitize_city_data($raw) {
        return [
            'name' => sanitize_text_field($raw['name'] ?? ''),
            'seed' => sanitize_text_field($raw['seed'] ?? ''),
            'city_type' => sanitize_text_field($raw['city_type'] ?? 'town'),
            'size_class' => sanitize_text_field($raw['size_class'] ?? 'medium'),
            'population' => absint($raw['population'] ?? 0),
            'has_walls' => !empty($raw['has_walls']) ? 1 : 0,
            'has_river' => !empty($raw['has_river']) ? 1 : 0,
            'is_coastal' => !empty($raw['is_coastal']) ? 1 : 0,
            'city_data' => $raw['city_data'] ?? [],
            'settings' => $raw['settings'] ?? [],
            'hex_id' => !empty($raw['hex_id']) ? absint($raw['hex_id']) : null,
        ];
    }

    // =========================================================================
    // CITY ENDPOINTS
    // =========================================================================

    /**
     * Get generation parameters
     * Returns seed and validated options for client-side generation
     */
    public static function get_generation_params() {
        self::verify_nonce();

        $seed = sanitize_text_field($_POST['seed'] ?? '');
        $city_type = sanitize_text_field($_POST['city_type'] ?? 'town');
        $size_class = sanitize_text_field($_POST['size_class'] ?? 'medium');

        // Generate seed if not provided
        if (empty($seed)) {
            $seed = self::generate_seed();
        }

        // Validate city type
        $valid_types = array_keys(CityGrinder::get_city_types());
        if (!in_array($city_type, $valid_types)) {
            $city_type = 'town';
        }

        // Validate size class
        $valid_sizes = array_keys(CityGrinder::get_size_classes());
        if (!in_array($size_class, $valid_sizes)) {
            $size_class = 'medium';
        }

        // Additional options
        $options = [
            'has_walls' => !empty($_POST['has_walls']),
            'has_river' => !empty($_POST['has_river']),
            'is_coastal' => !empty($_POST['is_coastal']),
        ];

        wp_send_json_success([
            'seed' => $seed,
            'city_type' => $city_type,
            'size_class' => $size_class,
            'options' => $options,
            'timestamp' => time(),
        ]);
    }

    /**
     * Save a city
     */
    public static function save_city() {
        self::verify_nonce();
        self::require_login();

        $city_id = absint($_POST['city_id'] ?? 0);
        $user_id = get_current_user_id();

        // Check edit permissions for existing city
        if ($city_id > 0 && !CityGrinder_DB::can_edit_city($city_id, $user_id)) {
            wp_send_json_error([
                'message' => __('You do not have permission to edit this city.', 'citygrinder'),
                'code' => 'permission_denied'
            ], 403);
        }

        // Sanitize and prepare data
        $data = self::sanitize_city_data($_POST);
        $data['user_id'] = $user_id;

        if ($city_id > 0) {
            $data['id'] = $city_id;
        }

        // Validate required fields
        if (empty($data['seed'])) {
            wp_send_json_error([
                'message' => __('City seed is required.', 'citygrinder'),
                'code' => 'missing_seed'
            ], 400);
        }

        if (empty($data['name'])) {
            $data['name'] = self::generate_city_name($data['city_type']);
        }

        // Save city
        $saved_id = CityGrinder_DB::save_city($data);

        if (!$saved_id) {
            wp_send_json_error([
                'message' => __('Failed to save city. Please try again.', 'citygrinder'),
                'code' => 'save_failed'
            ], 500);
        }

        // Save districts if provided
        if (!empty($data['city_data']['districts'])) {
            CityGrinder_DB::save_districts($saved_id, $data['city_data']['districts']);
        }

        // Save buildings/POIs if provided
        if (!empty($data['city_data']['buildings'])) {
            CityGrinder_DB::save_buildings($saved_id, $data['city_data']['buildings']);
        }

        wp_send_json_success([
            'city_id' => $saved_id,
            'message' => $city_id > 0
                ? __('City updated successfully.', 'citygrinder')
                : __('City saved successfully.', 'citygrinder'),
            'is_new' => $city_id === 0,
        ]);
    }

    /**
     * Load a city
     */
    public static function load_city() {
        self::verify_nonce();

        $city_id = absint($_POST['city_id'] ?? 0);
        $hex_id = absint($_POST['hex_id'] ?? 0);
        $share_token = sanitize_text_field($_POST['share_token'] ?? '');
        $user_id = get_current_user_id();

        $city = null;

        // Load by share token
        if (!empty($share_token)) {
            $city = CityGrinder_DB::get_city_by_share_token($share_token);
        }
        // Load by hex ID
        elseif ($hex_id > 0) {
            $city = CityGrinder_DB::get_city_by_hex($hex_id, $user_id);
        }
        // Load by city ID
        elseif ($city_id > 0) {
            $city = CityGrinder_DB::get_city($city_id);
        }

        if (!$city) {
            wp_send_json_error([
                'message' => __('City not found.', 'citygrinder'),
                'code' => 'not_found'
            ], 404);
        }

        // Check access permissions
        $can_access = false;
        $can_edit = false;

        if ($user_id && $city->user_id == $user_id) {
            $can_access = true;
            $can_edit = true;
        } elseif ($city->is_shared || !empty($share_token)) {
            $can_access = true;
        }

        if (!$can_access) {
            wp_send_json_error([
                'message' => __('You do not have permission to view this city.', 'citygrinder'),
                'code' => 'permission_denied'
            ], 403);
        }

        // Load related data
        $districts = CityGrinder_DB::get_districts($city->id);
        $pois = CityGrinder_DB::get_pois($city->id);

        wp_send_json_success([
            'city' => [
                'id' => (int) $city->id,
                'name' => $city->name,
                'seed' => $city->seed,
                'city_type' => $city->city_type,
                'size_class' => $city->size_class,
                'population' => (int) $city->population,
                'has_walls' => (bool) $city->has_walls,
                'has_river' => (bool) $city->has_river,
                'is_coastal' => (bool) $city->is_coastal,
                'hex_id' => $city->hex_id ? (int) $city->hex_id : null,
                'is_shared' => (bool) $city->is_shared,
                'city_data' => $city->city_data,
                'settings' => $city->settings,
                'created_at' => $city->created_at,
                'updated_at' => $city->updated_at,
            ],
            'districts' => $districts,
            'pois' => $pois,
            'permissions' => [
                'can_edit' => $can_edit,
                'can_delete' => $can_edit,
                'can_share' => $can_edit,
            ],
        ]);
    }

    /**
     * List user's cities
     */
    public static function list_cities() {
        self::verify_nonce();
        self::require_login();

        $user_id = get_current_user_id();

        $args = [
            'limit' => absint($_POST['limit'] ?? 50),
            'offset' => absint($_POST['offset'] ?? 0),
            'orderby' => sanitize_text_field($_POST['orderby'] ?? 'updated_at'),
            'order' => sanitize_text_field($_POST['order'] ?? 'DESC'),
            'city_type' => sanitize_text_field($_POST['city_type'] ?? ''),
        ];

        $cities = CityGrinder_DB::get_user_cities($user_id, $args);
        $total = CityGrinder_DB::get_user_city_count($user_id);

        $result = array_map(function($city) {
            return [
                'id' => (int) $city->id,
                'name' => $city->name,
                'seed' => $city->seed,
                'city_type' => $city->city_type,
                'size_class' => $city->size_class,
                'population' => (int) $city->population,
                'hex_id' => $city->hex_id ? (int) $city->hex_id : null,
                'is_shared' => (bool) $city->is_shared,
                'created_at' => $city->created_at,
                'updated_at' => $city->updated_at,
            ];
        }, $cities);

        wp_send_json_success([
            'cities' => $result,
            'total' => $total,
            'limit' => $args['limit'],
            'offset' => $args['offset'],
        ]);
    }

    /**
     * Delete a city
     */
    public static function delete_city() {
        self::verify_nonce();
        self::require_login();

        $city_id = absint($_POST['city_id'] ?? 0);
        $user_id = get_current_user_id();

        if (!$city_id) {
            wp_send_json_error([
                'message' => __('Invalid city ID.', 'citygrinder'),
                'code' => 'invalid_id'
            ], 400);
        }

        $result = CityGrinder_DB::delete_city($city_id, $user_id);

        if (!$result) {
            wp_send_json_error([
                'message' => __('Failed to delete city. You may not have permission.', 'citygrinder'),
                'code' => 'delete_failed'
            ], 403);
        }

        wp_send_json_success([
            'message' => __('City deleted successfully.', 'citygrinder'),
        ]);
    }

    /**
     * Toggle city sharing
     */
    public static function toggle_sharing() {
        self::verify_nonce();
        self::require_login();

        $city_id = absint($_POST['city_id'] ?? 0);
        $enable = !empty($_POST['enable']);
        $user_id = get_current_user_id();

        if (!$city_id) {
            wp_send_json_error([
                'message' => __('Invalid city ID.', 'citygrinder'),
                'code' => 'invalid_id'
            ], 400);
        }

        if ($enable) {
            $token = CityGrinder_DB::enable_sharing($city_id, $user_id);

            if (!$token) {
                wp_send_json_error([
                    'message' => __('Failed to enable sharing.', 'citygrinder'),
                    'code' => 'share_failed'
                ], 500);
            }

            $share_url = add_query_arg([
                'citygrinder' => 'view',
                'token' => $token,
            ], home_url('/city-explorer/'));

            wp_send_json_success([
                'message' => __('Sharing enabled.', 'citygrinder'),
                'share_token' => $token,
                'share_url' => $share_url,
            ]);
        } else {
            $result = CityGrinder_DB::disable_sharing($city_id, $user_id);

            if (!$result) {
                wp_send_json_error([
                    'message' => __('Failed to disable sharing.', 'citygrinder'),
                    'code' => 'share_failed'
                ], 500);
            }

            wp_send_json_success([
                'message' => __('Sharing disabled.', 'citygrinder'),
            ]);
        }
    }

    /**
     * Link city to a hex
     */
    public static function link_to_hex() {
        self::verify_nonce();
        self::require_login();

        $city_id = absint($_POST['city_id'] ?? 0);
        $hex_id = absint($_POST['hex_id'] ?? 0);
        $user_id = get_current_user_id();

        if (!$city_id) {
            wp_send_json_error([
                'message' => __('Invalid city ID.', 'citygrinder'),
                'code' => 'invalid_id'
            ], 400);
        }

        if (!CityGrinder_DB::can_edit_city($city_id, $user_id)) {
            wp_send_json_error([
                'message' => __('You do not have permission to edit this city.', 'citygrinder'),
                'code' => 'permission_denied'
            ], 403);
        }

        global $wpdb;
        $result = $wpdb->update(
            CityGrinder_DB::get_table('cities'),
            ['hex_id' => $hex_id ?: null],
            ['id' => $city_id],
            ['%d'],
            ['%d']
        );

        if ($result === false) {
            wp_send_json_error([
                'message' => __('Failed to link city to hex.', 'citygrinder'),
                'code' => 'link_failed'
            ], 500);
        }

        wp_send_json_success([
            'message' => $hex_id
                ? __('City linked to hex.', 'citygrinder')
                : __('City unlinked from hex.', 'citygrinder'),
        ]);
    }

    // =========================================================================
    // NOTES ENDPOINTS
    // =========================================================================

    /**
     * Save a note
     */
    public static function save_note() {
        self::verify_nonce();
        self::require_login();

        $user_id = get_current_user_id();

        $data = [
            'id' => absint($_POST['note_id'] ?? 0),
            'user_id' => $user_id,
            'city_id' => absint($_POST['city_id'] ?? 0),
            'target_type' => sanitize_text_field($_POST['target_type'] ?? 'city'),
            'target_id' => absint($_POST['target_id'] ?? 0),
            'note_title' => sanitize_text_field($_POST['note_title'] ?? ''),
            'note_content' => wp_kses_post($_POST['note_content'] ?? ''),
            'is_private' => !empty($_POST['is_private']) ? 1 : 0,
        ];

        // Validate target type
        $valid_types = ['city', 'district', 'building'];
        if (!in_array($data['target_type'], $valid_types)) {
            $data['target_type'] = 'city';
        }

        // Validate city access
        if (!CityGrinder_DB::can_access_city($data['city_id'], $user_id)) {
            wp_send_json_error([
                'message' => __('You do not have access to this city.', 'citygrinder'),
                'code' => 'permission_denied'
            ], 403);
        }

        $note_id = CityGrinder_DB::save_note($data);

        if (!$note_id) {
            wp_send_json_error([
                'message' => __('Failed to save note.', 'citygrinder'),
                'code' => 'save_failed'
            ], 500);
        }

        wp_send_json_success([
            'note_id' => $note_id,
            'message' => __('Note saved.', 'citygrinder'),
        ]);
    }

    /**
     * Get notes for a city
     */
    public static function get_notes() {
        self::verify_nonce();

        $city_id = absint($_POST['city_id'] ?? 0);
        $target_type = sanitize_text_field($_POST['target_type'] ?? '');
        $user_id = get_current_user_id();

        $notes = CityGrinder_DB::get_notes($city_id, $user_id, $target_type ?: null);

        wp_send_json_success([
            'notes' => $notes,
        ]);
    }

    /**
     * Delete a note
     */
    public static function delete_note() {
        self::verify_nonce();
        self::require_login();

        $note_id = absint($_POST['note_id'] ?? 0);
        $user_id = get_current_user_id();

        $result = CityGrinder_DB::delete_note($note_id, $user_id);

        if (!$result) {
            wp_send_json_error([
                'message' => __('Failed to delete note.', 'citygrinder'),
                'code' => 'delete_failed'
            ], 500);
        }

        wp_send_json_success([
            'message' => __('Note deleted.', 'citygrinder'),
        ]);
    }

    // =========================================================================
    // EXPORT ENDPOINT
    // =========================================================================

    /**
     * Export city data
     */
    public static function export_city() {
        self::verify_nonce();

        $city_id = absint($_POST['city_id'] ?? 0);
        $format = sanitize_text_field($_POST['format'] ?? 'json');
        $user_id = get_current_user_id();

        $city = CityGrinder_DB::get_city($city_id);

        if (!$city) {
            wp_send_json_error([
                'message' => __('City not found.', 'citygrinder'),
                'code' => 'not_found'
            ], 404);
        }

        // Check access
        if ($city->user_id != $user_id && !$city->is_shared) {
            wp_send_json_error([
                'message' => __('Access denied.', 'citygrinder'),
                'code' => 'permission_denied'
            ], 403);
        }

        $districts = CityGrinder_DB::get_districts($city_id);
        $pois = CityGrinder_DB::get_pois($city_id);

        switch ($format) {
            case 'json':
                wp_send_json_success([
                    'city' => $city,
                    'districts' => $districts,
                    'pois' => $pois,
                ]);
                break;

            default:
                wp_send_json_error([
                    'message' => __('Unsupported export format.', 'citygrinder'),
                    'code' => 'invalid_format'
                ], 400);
        }
    }

    // =========================================================================
    // UTILITY METHODS
    // =========================================================================

    /**
     * Generate a random seed
     *
     * @return string
     */
    private static function generate_seed() {
        return bin2hex(random_bytes(8));
    }

    /**
     * Generate a city name
     *
     * @param string $city_type City type
     * @return string
     */
    private static function generate_city_name($city_type) {
        $prefixes = [
            'village' => ['Little', 'Green', 'Old', 'Upper', 'Lower', 'East', 'West'],
            'town' => ['Market', 'Bridge', 'Mill', 'Cross', 'River', 'Hill', 'Stone'],
            'city' => ['Grand', 'Royal', 'High', 'Golden', 'Silver', 'Iron', 'Crown'],
            'fortress' => ['Fort', 'Castle', 'Keep', 'Tower', 'Hold', 'Guard', 'Watch'],
            'port' => ['Port', 'Harbor', 'Bay', 'Anchor', 'Tide', 'Sail', 'Wave'],
            'capital' => ['Imperial', 'Royal', 'Grand', 'Supreme', 'High', 'Sovereign'],
        ];

        $suffixes = [
            'village' => ['ham', 'ton', 'wick', 'stead', 'dale', 'vale'],
            'town' => ['ford', 'bury', 'worth', 'field', 'haven', 'gate'],
            'city' => ['polis', 'heim', 'grad', 'burg', 'mouth', 'port'],
            'fortress' => ['hold', 'guard', 'keep', 'watch', 'stone', 'rock'],
            'port' => ['haven', 'bay', 'cove', 'shore', 'waters', 'tide'],
            'capital' => ['throne', 'crown', 'realm', 'seat', 'court', 'hall'],
        ];

        $type_prefixes = $prefixes[$city_type] ?? $prefixes['town'];
        $type_suffixes = $suffixes[$city_type] ?? $suffixes['town'];

        $prefix = $type_prefixes[array_rand($type_prefixes)];
        $suffix = $type_suffixes[array_rand($type_suffixes)];

        return $prefix . $suffix;
    }
}
