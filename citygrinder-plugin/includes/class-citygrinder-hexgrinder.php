<?php
/**
 * CityGrinder HexGrinder Integration Class
 *
 * Handles integration with the HexGrinder plugin for seamless
 * transition between hex map exploration and city viewing.
 *
 * @package CityGrinder
 * @since 1.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * HexGrinder integration class
 */
class CityGrinder_HexGrinder {

    /**
     * Settlement hex types that can have cities
     */
    const SETTLEMENT_TYPES = [
        'village',
        'town',
        'city',
        'castle',
        'port',
        'capital',
        'ruins',
        'outpost',
    ];

    /**
     * Initialize integration
     */
    public static function init() {
        // Verify HexGrinder is available
        if (!class_exists('HexGrinder')) {
            return;
        }

        // Add hooks for HexGrinder integration
        add_filter('hexgrinder_hex_actions', [__CLASS__, 'add_hex_actions'], 10, 2);
        add_filter('hexgrinder_hex_info', [__CLASS__, 'add_city_info'], 10, 2);
        add_action('hexgrinder_after_hex_panel', [__CLASS__, 'render_city_button']);
        add_action('hexgrinder_hex_content', [__CLASS__, 'render_hex_city_preview'], 20, 2);

        // AJAX handlers for HexGrinder-specific actions
        add_action('wp_ajax_citygrinder_from_hex', [__CLASS__, 'handle_city_from_hex']);
        add_action('wp_ajax_citygrinder_check_hex_city', [__CLASS__, 'check_hex_city']);

        // Add scripts for integration
        add_action('wp_enqueue_scripts', [__CLASS__, 'enqueue_integration_scripts'], 20);

        // REST API endpoint for hex-city linking
        add_action('rest_api_init', [__CLASS__, 'register_rest_routes']);
    }

    /**
     * Enqueue integration scripts
     */
    public static function enqueue_integration_scripts() {
        // Only load when HexGrinder assets are loaded
        if (!wp_script_is('hexgrinder-main', 'enqueued')) {
            return;
        }

        wp_enqueue_script(
            'citygrinder-hexgrinder',
            CITYGRINDER_PLUGIN_URL . 'assets/js/hexgrinder-integration.js',
            ['hexgrinder-main', 'jquery'],
            CITYGRINDER_VERSION,
            true
        );

        wp_localize_script('citygrinder-hexgrinder', 'citygrinder_hexgrinder', [
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('citygrinder_nonce'),
            'explorer_url' => home_url('/city-explorer/'),
            'settlement_types' => self::SETTLEMENT_TYPES,
            'strings' => [
                'enter_settlement' => __('Enter Settlement', 'citygrinder'),
                'view_city' => __('View City', 'citygrinder'),
                'generate_city' => __('Generate City', 'citygrinder'),
                'linked_city' => __('Linked City', 'citygrinder'),
                'no_city' => __('No city generated yet', 'citygrinder'),
            ],
        ]);
    }

    /**
     * Add city-related actions to hex actions
     *
     * @param array $actions Existing actions
     * @param array $hex Hex data
     * @return array
     */
    public static function add_hex_actions($actions, $hex) {
        // Check if this is a settlement hex
        if (!self::is_settlement_hex($hex)) {
            return $actions;
        }

        $hex_id = $hex['id'] ?? 0;
        $user_id = get_current_user_id();

        // Check for existing city
        $city = CityGrinder_DB::get_city_by_hex($hex_id, $user_id);

        if ($city) {
            $actions['view_city'] = [
                'label' => __('View City', 'citygrinder'),
                'url' => add_query_arg([
                    'city_id' => $city->id,
                ], home_url('/city-explorer/')),
                'icon' => 'building',
                'priority' => 10,
            ];
        } else {
            $actions['generate_city'] = [
                'label' => __('Enter Settlement', 'citygrinder'),
                'url' => add_query_arg([
                    'hex_id' => $hex_id,
                    'action' => 'generate',
                ], home_url('/city-explorer/')),
                'icon' => 'building',
                'priority' => 10,
            ];
        }

        return $actions;
    }

    /**
     * Add city info to hex info panel
     *
     * @param array $info Existing info
     * @param array $hex Hex data
     * @return array
     */
    public static function add_city_info($info, $hex) {
        if (!self::is_settlement_hex($hex)) {
            return $info;
        }

        $hex_id = $hex['id'] ?? 0;
        $user_id = get_current_user_id();
        $city = CityGrinder_DB::get_city_by_hex($hex_id, $user_id);

        if ($city) {
            $info['citygrinder'] = [
                'has_city' => true,
                'city_id' => (int) $city->id,
                'city_name' => $city->name,
                'city_type' => $city->city_type,
                'population' => (int) $city->population,
            ];
        } else {
            $info['citygrinder'] = [
                'has_city' => false,
                'can_generate' => true,
            ];
        }

        return $info;
    }

    /**
     * Render city button in hex panel
     *
     * @param array $hex Hex data
     */
    public static function render_city_button($hex) {
        if (!self::is_settlement_hex($hex)) {
            return;
        }

        $hex_id = $hex['id'] ?? 0;
        $user_id = get_current_user_id();
        $city = CityGrinder_DB::get_city_by_hex($hex_id, $user_id);

        $terrain = $hex['terrain'] ?? 'village';
        ?>
        <div class="citygrinder-hex-action">
            <?php if ($city): ?>
                <div class="citygrinder-hex-city-info">
                    <span class="city-name"><?php echo esc_html($city->name); ?></span>
                    <span class="city-meta">
                        <?php echo esc_html(ucfirst($city->city_type)); ?> -
                        <?php echo esc_html(number_format($city->population)); ?> pop.
                    </span>
                </div>
                <a href="<?php echo esc_url(add_query_arg('city_id', $city->id, home_url('/city-explorer/'))); ?>"
                   class="cg-btn cg-btn--primary citygrinder-enter-btn">
                    <?php esc_html_e('Enter City', 'citygrinder'); ?>
                </a>
            <?php else: ?>
                <button type="button"
                        class="cg-btn cg-btn--primary citygrinder-enter-btn"
                        data-hex-id="<?php echo esc_attr($hex_id); ?>"
                        data-hex-x="<?php echo esc_attr($hex['x'] ?? 0); ?>"
                        data-hex-y="<?php echo esc_attr($hex['y'] ?? 0); ?>"
                        data-terrain="<?php echo esc_attr($terrain); ?>"
                        data-action="enter-settlement">
                    <?php esc_html_e('Enter Settlement', 'citygrinder'); ?>
                </button>
            <?php endif; ?>
        </div>
        <?php
    }

    /**
     * Render city preview in hex content
     *
     * @param array $hex Hex data
     * @param array $hex_info Additional hex info
     */
    public static function render_hex_city_preview($hex, $hex_info) {
        if (!self::is_settlement_hex($hex)) {
            return;
        }

        $hex_id = $hex['id'] ?? 0;
        $user_id = get_current_user_id();
        $city = CityGrinder_DB::get_city_by_hex($hex_id, $user_id);

        if (!$city) {
            return;
        }

        ?>
        <div class="citygrinder-hex-preview">
            <div class="city-preview-canvas"
                 data-seed="<?php echo esc_attr($city->seed); ?>"
                 data-mini="true">
            </div>
        </div>
        <?php
    }

    /**
     * Handle generating/loading city from hex
     */
    public static function handle_city_from_hex() {
        check_ajax_referer('citygrinder_nonce', 'nonce');

        $hex_id = absint($_POST['hex_id'] ?? 0);
        $hex_x = intval($_POST['hex_x'] ?? 0);
        $hex_y = intval($_POST['hex_y'] ?? 0);
        $terrain = sanitize_text_field($_POST['terrain'] ?? 'village');
        $user_id = get_current_user_id();

        if (!$hex_id) {
            wp_send_json_error([
                'message' => __('Invalid hex ID.', 'citygrinder'),
                'code' => 'invalid_hex'
            ], 400);
        }

        // Check if city already exists for this hex
        $existing = CityGrinder_DB::get_city_by_hex($hex_id, $user_id);

        if ($existing) {
            wp_send_json_success([
                'action' => 'load',
                'city_id' => (int) $existing->id,
                'redirect_url' => add_query_arg('city_id', $existing->id, home_url('/city-explorer/')),
            ]);
        }

        // Generate deterministic seed from hex coordinates
        $seed = self::generate_hex_seed($hex_x, $hex_y);

        // Map terrain type to city configuration
        $config = self::get_city_config_for_terrain($terrain);

        wp_send_json_success([
            'action' => 'generate',
            'seed' => $seed,
            'city_type' => $config['city_type'],
            'size_class' => $config['size_class'],
            'hex_id' => $hex_id,
            'options' => $config['options'],
            'redirect_url' => add_query_arg([
                'hex_id' => $hex_id,
                'seed' => $seed,
                'action' => 'generate',
            ], home_url('/city-explorer/')),
        ]);
    }

    /**
     * Check if a hex has an associated city
     */
    public static function check_hex_city() {
        check_ajax_referer('citygrinder_nonce', 'nonce');

        $hex_id = absint($_POST['hex_id'] ?? 0);
        $user_id = get_current_user_id();

        $city = CityGrinder_DB::get_city_by_hex($hex_id, $user_id);

        if ($city) {
            wp_send_json_success([
                'has_city' => true,
                'city' => [
                    'id' => (int) $city->id,
                    'name' => $city->name,
                    'city_type' => $city->city_type,
                    'population' => (int) $city->population,
                ],
            ]);
        } else {
            wp_send_json_success([
                'has_city' => false,
            ]);
        }
    }

    /**
     * Register REST API routes
     */
    public static function register_rest_routes() {
        register_rest_route('citygrinder/v1', '/hex/(?P<hex_id>\d+)/city', [
            'methods' => 'GET',
            'callback' => [__CLASS__, 'rest_get_hex_city'],
            'permission_callback' => '__return_true',
            'args' => [
                'hex_id' => [
                    'required' => true,
                    'type' => 'integer',
                ],
            ],
        ]);

        register_rest_route('citygrinder/v1', '/hex/(?P<hex_id>\d+)/city', [
            'methods' => 'POST',
            'callback' => [__CLASS__, 'rest_link_hex_city'],
            'permission_callback' => function() {
                return is_user_logged_in();
            },
            'args' => [
                'hex_id' => [
                    'required' => true,
                    'type' => 'integer',
                ],
                'city_id' => [
                    'required' => true,
                    'type' => 'integer',
                ],
            ],
        ]);
    }

    /**
     * REST API: Get city for hex
     *
     * @param WP_REST_Request $request Request object
     * @return WP_REST_Response
     */
    public static function rest_get_hex_city($request) {
        $hex_id = $request->get_param('hex_id');
        $user_id = get_current_user_id();

        $city = CityGrinder_DB::get_city_by_hex($hex_id, $user_id);

        if (!$city) {
            return new WP_REST_Response([
                'has_city' => false,
            ], 200);
        }

        return new WP_REST_Response([
            'has_city' => true,
            'city' => [
                'id' => (int) $city->id,
                'name' => $city->name,
                'seed' => $city->seed,
                'city_type' => $city->city_type,
                'size_class' => $city->size_class,
                'population' => (int) $city->population,
            ],
        ], 200);
    }

    /**
     * REST API: Link city to hex
     *
     * @param WP_REST_Request $request Request object
     * @return WP_REST_Response
     */
    public static function rest_link_hex_city($request) {
        $hex_id = $request->get_param('hex_id');
        $city_id = $request->get_param('city_id');
        $user_id = get_current_user_id();

        // Verify city ownership
        if (!CityGrinder_DB::can_edit_city($city_id, $user_id)) {
            return new WP_REST_Response([
                'error' => 'permission_denied',
                'message' => __('You cannot edit this city.', 'citygrinder'),
            ], 403);
        }

        global $wpdb;
        $result = $wpdb->update(
            CityGrinder_DB::get_table('cities'),
            ['hex_id' => $hex_id],
            ['id' => $city_id],
            ['%d'],
            ['%d']
        );

        if ($result === false) {
            return new WP_REST_Response([
                'error' => 'update_failed',
                'message' => __('Failed to link city to hex.', 'citygrinder'),
            ], 500);
        }

        return new WP_REST_Response([
            'success' => true,
            'message' => __('City linked to hex.', 'citygrinder'),
        ], 200);
    }

    // =========================================================================
    // HELPER METHODS
    // =========================================================================

    /**
     * Check if hex is a settlement type
     *
     * @param array $hex Hex data
     * @return bool
     */
    public static function is_settlement_hex($hex) {
        $terrain = $hex['terrain'] ?? '';
        $type = $hex['type'] ?? '';

        // Check terrain type
        if (in_array($terrain, self::SETTLEMENT_TYPES)) {
            return true;
        }

        // Check type (some hex grids use 'type' instead of 'terrain')
        if (in_array($type, self::SETTLEMENT_TYPES)) {
            return true;
        }

        // Check for settlement feature
        $features = $hex['features'] ?? [];
        foreach ($features as $feature) {
            if (in_array($feature, self::SETTLEMENT_TYPES)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Generate deterministic seed from hex coordinates
     *
     * @param int $x X coordinate
     * @param int $y Y coordinate
     * @return string
     */
    public static function generate_hex_seed($x, $y) {
        // Create a deterministic seed based on coordinates
        // This ensures the same hex always generates the same city
        return substr(md5("hex_{$x}_{$y}_citygrinder"), 0, 16);
    }

    /**
     * Get city configuration based on terrain type
     *
     * @param string $terrain Terrain type
     * @return array
     */
    public static function get_city_config_for_terrain($terrain) {
        $configs = [
            'village' => [
                'city_type' => 'village',
                'size_class' => 'village',
                'options' => [
                    'has_walls' => false,
                    'has_river' => false,
                    'is_coastal' => false,
                ],
            ],
            'town' => [
                'city_type' => 'town',
                'size_class' => 'town',
                'options' => [
                    'has_walls' => true,
                    'has_river' => false,
                    'is_coastal' => false,
                ],
            ],
            'city' => [
                'city_type' => 'city',
                'size_class' => 'city',
                'options' => [
                    'has_walls' => true,
                    'has_river' => true,
                    'is_coastal' => false,
                ],
            ],
            'castle' => [
                'city_type' => 'fortress',
                'size_class' => 'town',
                'options' => [
                    'has_walls' => true,
                    'has_river' => false,
                    'is_coastal' => false,
                ],
            ],
            'port' => [
                'city_type' => 'port',
                'size_class' => 'town',
                'options' => [
                    'has_walls' => true,
                    'has_river' => false,
                    'is_coastal' => true,
                ],
            ],
            'capital' => [
                'city_type' => 'capital',
                'size_class' => 'metropolis',
                'options' => [
                    'has_walls' => true,
                    'has_river' => true,
                    'is_coastal' => false,
                ],
            ],
            'ruins' => [
                'city_type' => 'town',
                'size_class' => 'village',
                'options' => [
                    'has_walls' => true, // Ruined walls
                    'has_river' => false,
                    'is_coastal' => false,
                ],
            ],
            'outpost' => [
                'city_type' => 'fortress',
                'size_class' => 'hamlet',
                'options' => [
                    'has_walls' => true,
                    'has_river' => false,
                    'is_coastal' => false,
                ],
            ],
        ];

        return $configs[$terrain] ?? $configs['village'];
    }
}
