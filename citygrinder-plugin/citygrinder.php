<?php
/**
 * Plugin Name: CityGrinder
 * Plugin URI: https://github.com/JiverG/citygrinder
 * Description: Procedural medieval fantasy city generator for WordPress. Integrates with HexGrinder for seamless settlement exploration in tabletop RPG campaigns.
 * Version: 1.0.0
 * Requires at least: 5.8
 * Requires PHP: 7.4
 * Author: JiverG
 * Author URI: https://github.com/JiverG
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: citygrinder
 * Domain Path: /languages
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Plugin constants
define('CITYGRINDER_VERSION', '1.0.0');
define('CITYGRINDER_DB_VERSION', '1.0.0');
define('CITYGRINDER_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('CITYGRINDER_PLUGIN_URL', plugin_dir_url(__FILE__));
define('CITYGRINDER_PLUGIN_BASENAME', plugin_basename(__FILE__));
define('CITYGRINDER_MIN_PHP', '7.4');
define('CITYGRINDER_MIN_WP', '5.8');

/**
 * Main CityGrinder Plugin Class
 *
 * Implements singleton pattern following WordPress plugin best practices.
 * Designed to integrate seamlessly with the HexGrinder plugin.
 *
 * @since 1.0.0
 */
final class CityGrinder {

    /**
     * Single instance of the class
     *
     * @var CityGrinder|null
     */
    private static $instance = null;

    /**
     * Plugin options
     *
     * @var array
     */
    private $options = [];

    /**
     * Get singleton instance
     *
     * @return CityGrinder
     */
    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Constructor - Private to enforce singleton
     */
    private function __construct() {
        $this->check_requirements();
        $this->load_options();
        $this->load_dependencies();
        $this->register_hooks();
    }

    /**
     * Prevent cloning
     */
    private function __clone() {}

    /**
     * Prevent unserialization
     */
    public function __wakeup() {
        throw new Exception('Cannot unserialize singleton');
    }

    /**
     * Check plugin requirements
     */
    private function check_requirements() {
        if (version_compare(PHP_VERSION, CITYGRINDER_MIN_PHP, '<')) {
            add_action('admin_notices', function() {
                printf(
                    '<div class="notice notice-error"><p>%s</p></div>',
                    sprintf(
                        esc_html__('CityGrinder requires PHP %s or higher. You are running PHP %s.', 'citygrinder'),
                        CITYGRINDER_MIN_PHP,
                        PHP_VERSION
                    )
                );
            });
            return;
        }

        global $wp_version;
        if (version_compare($wp_version, CITYGRINDER_MIN_WP, '<')) {
            add_action('admin_notices', function() {
                global $wp_version;
                printf(
                    '<div class="notice notice-error"><p>%s</p></div>',
                    sprintf(
                        esc_html__('CityGrinder requires WordPress %s or higher. You are running WordPress %s.', 'citygrinder'),
                        CITYGRINDER_MIN_WP,
                        $wp_version
                    )
                );
            });
            return;
        }
    }

    /**
     * Load plugin options
     */
    private function load_options() {
        $defaults = [
            'default_city_type' => 'town',
            'default_size_class' => 'medium',
            'enable_walls' => true,
            'auto_save' => true,
            'show_population' => true,
            'show_district_names' => true,
            'canvas_width' => 800,
            'canvas_height' => 600,
            'hexgrinder_integration' => true,
        ];

        $this->options = wp_parse_args(
            get_option('citygrinder_options', []),
            $defaults
        );
    }

    /**
     * Get plugin option
     *
     * @param string $key Option key
     * @param mixed $default Default value
     * @return mixed
     */
    public function get_option($key, $default = null) {
        return $this->options[$key] ?? $default;
    }

    /**
     * Load required files
     */
    private function load_dependencies() {
        // Core classes
        require_once CITYGRINDER_PLUGIN_DIR . 'includes/class-citygrinder-db.php';
        require_once CITYGRINDER_PLUGIN_DIR . 'includes/class-citygrinder-api.php';
        require_once CITYGRINDER_PLUGIN_DIR . 'includes/class-citygrinder-shortcodes.php';
        require_once CITYGRINDER_PLUGIN_DIR . 'includes/class-citygrinder-templates.php';

        // Admin only
        if (is_admin()) {
            require_once CITYGRINDER_PLUGIN_DIR . 'admin/class-citygrinder-admin.php';
        }
    }

    /**
     * Register WordPress hooks
     */
    private function register_hooks() {
        // Activation/Deactivation
        register_activation_hook(__FILE__, [$this, 'activate']);
        register_deactivation_hook(__FILE__, [$this, 'deactivate']);
        register_uninstall_hook(__FILE__, ['CityGrinder', 'uninstall']);

        // Initialization
        add_action('init', [$this, 'init']);
        add_action('init', [$this, 'load_textdomain']);

        // Asset loading
        add_action('wp_enqueue_scripts', [$this, 'enqueue_frontend_assets']);
        add_action('admin_enqueue_scripts', [$this, 'enqueue_admin_assets']);

        // Initialize components
        add_action('init', [$this, 'init_components'], 5);

        // HexGrinder integration (after plugins loaded)
        add_action('plugins_loaded', [$this, 'init_hexgrinder_integration'], 20);

        // Admin notices
        add_action('admin_notices', [$this, 'admin_notices']);
    }

    /**
     * Plugin initialization
     */
    public function init() {
        // Register custom post type for cities (optional, for advanced management)
        // $this->register_post_types();

        // Add rewrite rules if needed
        // $this->add_rewrite_rules();
    }

    /**
     * Load plugin text domain for translations
     */
    public function load_textdomain() {
        load_plugin_textdomain(
            'citygrinder',
            false,
            dirname(CITYGRINDER_PLUGIN_BASENAME) . '/languages'
        );
    }

    /**
     * Initialize plugin components
     */
    public function init_components() {
        CityGrinder_DB::init();
        CityGrinder_API::init();
        CityGrinder_Shortcodes::init();
        CityGrinder_Templates::init();

        if (is_admin()) {
            CityGrinder_Admin::init();
        }
    }

    /**
     * Plugin activation
     */
    public function activate() {
        // Check requirements
        if (version_compare(PHP_VERSION, CITYGRINDER_MIN_PHP, '<')) {
            deactivate_plugins(CITYGRINDER_PLUGIN_BASENAME);
            wp_die(
                sprintf(
                    esc_html__('CityGrinder requires PHP %s or higher.', 'citygrinder'),
                    CITYGRINDER_MIN_PHP
                )
            );
        }

        // Create database tables
        require_once CITYGRINDER_PLUGIN_DIR . 'includes/class-citygrinder-db.php';
        CityGrinder_DB::create_tables();

        // Set default options
        if (!get_option('citygrinder_options')) {
            update_option('citygrinder_options', [
                'default_city_type' => 'town',
                'default_size_class' => 'medium',
                'enable_walls' => true,
            ]);
        }

        // Store DB version
        update_option('citygrinder_db_version', CITYGRINDER_DB_VERSION);

        // Create default pages
        $this->create_plugin_pages();

        // Flush rewrite rules
        flush_rewrite_rules();

        // Set activation flag for admin notice
        set_transient('citygrinder_activated', true, 60);
    }

    /**
     * Plugin deactivation
     */
    public function deactivate() {
        // Clear any scheduled events
        wp_clear_scheduled_hook('citygrinder_cleanup');

        // Flush rewrite rules
        flush_rewrite_rules();
    }

    /**
     * Plugin uninstall (static for register_uninstall_hook)
     */
    public static function uninstall() {
        // Only run if uninstall.php doesn't exist
        if (file_exists(CITYGRINDER_PLUGIN_DIR . 'uninstall.php')) {
            return;
        }

        // Check if we should remove data
        $options = get_option('citygrinder_options', []);
        if (empty($options['remove_data_on_uninstall'])) {
            return;
        }

        // Remove database tables
        global $wpdb;
        $tables = [
            $wpdb->prefix . 'citygrinder_cities',
            $wpdb->prefix . 'citygrinder_districts',
            $wpdb->prefix . 'citygrinder_buildings',
            $wpdb->prefix . 'citygrinder_notes',
        ];

        foreach ($tables as $table) {
            $wpdb->query("DROP TABLE IF EXISTS {$table}");
        }

        // Remove options
        delete_option('citygrinder_options');
        delete_option('citygrinder_db_version');
    }

    /**
     * Enqueue frontend scripts and styles
     */
    public function enqueue_frontend_assets() {
        // Only load on pages with our shortcode or template
        if (!$this->should_load_assets()) {
            return;
        }

        // Vendor scripts - seedrandom for deterministic generation
        wp_enqueue_script(
            'seedrandom',
            CITYGRINDER_PLUGIN_URL . 'assets/js/vendor/seedrandom.min.js',
            [],
            '3.0.5',
            true
        );

        // Vendor scripts - Delaunator for Voronoi diagrams
        wp_enqueue_script(
            'delaunator',
            CITYGRINDER_PLUGIN_URL . 'assets/js/vendor/delaunator.min.js',
            [],
            '5.0.0',
            true
        );

        // CityGrinder core scripts
        wp_enqueue_script(
            'citygrinder-generator',
            CITYGRINDER_PLUGIN_URL . 'assets/js/city-generator.js',
            ['seedrandom', 'delaunator'],
            CITYGRINDER_VERSION,
            true
        );

        wp_enqueue_script(
            'citygrinder-renderer',
            CITYGRINDER_PLUGIN_URL . 'assets/js/city-renderer.js',
            ['citygrinder-generator'],
            CITYGRINDER_VERSION,
            true
        );

        wp_enqueue_script(
            'citygrinder-explorer',
            CITYGRINDER_PLUGIN_URL . 'assets/js/city-explorer.js',
            ['citygrinder-renderer', 'jquery'],
            CITYGRINDER_VERSION,
            true
        );

        wp_enqueue_script(
            'citygrinder-main',
            CITYGRINDER_PLUGIN_URL . 'assets/js/citygrinder.js',
            ['citygrinder-explorer'],
            CITYGRINDER_VERSION,
            true
        );

        // Localize script with configuration
        wp_localize_script('citygrinder-main', 'citygrinder_config', $this->get_js_config());

        // Styles
        wp_enqueue_style(
            'citygrinder-styles',
            CITYGRINDER_PLUGIN_URL . 'assets/css/citygrinder.css',
            [],
            CITYGRINDER_VERSION
        );
    }

    /**
     * Enqueue admin scripts and styles
     */
    public function enqueue_admin_assets($hook) {
        // Only load on our admin pages
        if (strpos($hook, 'citygrinder') === false) {
            return;
        }

        wp_enqueue_style(
            'citygrinder-admin',
            CITYGRINDER_PLUGIN_URL . 'assets/css/admin.css',
            [],
            CITYGRINDER_VERSION
        );

        wp_enqueue_script(
            'citygrinder-admin',
            CITYGRINDER_PLUGIN_URL . 'assets/js/admin.js',
            ['jquery'],
            CITYGRINDER_VERSION,
            true
        );

        wp_localize_script('citygrinder-admin', 'citygrinder_admin', [
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('citygrinder_admin_nonce'),
        ]);
    }

    /**
     * Get JavaScript configuration
     *
     * @return array
     */
    private function get_js_config() {
        return [
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('citygrinder_nonce'),
            'plugin_url' => CITYGRINDER_PLUGIN_URL,
            'is_logged_in' => is_user_logged_in(),
            'user_id' => get_current_user_id(),
            'options' => [
                'default_city_type' => $this->get_option('default_city_type'),
                'default_size_class' => $this->get_option('default_size_class'),
                'enable_walls' => $this->get_option('enable_walls'),
                'show_population' => $this->get_option('show_population'),
                'show_district_names' => $this->get_option('show_district_names'),
                'canvas_width' => $this->get_option('canvas_width'),
                'canvas_height' => $this->get_option('canvas_height'),
            ],
            'hexgrinder_active' => self::is_hexgrinder_active(),
            'strings' => [
                'generating' => __('Generating city...', 'citygrinder'),
                'saving' => __('Saving...', 'citygrinder'),
                'loading' => __('Loading...', 'citygrinder'),
                'error' => __('An error occurred', 'citygrinder'),
                'save_success' => __('City saved successfully', 'citygrinder'),
                'delete_confirm' => __('Are you sure you want to delete this city?', 'citygrinder'),
                'login_required' => __('Please log in to save cities', 'citygrinder'),
            ],
            'city_types' => self::get_city_types(),
            'size_classes' => self::get_size_classes(),
            'district_types' => self::get_district_types(),
        ];
    }

    /**
     * Check if we should load assets on this page
     *
     * @return bool
     */
    private function should_load_assets() {
        global $post;

        if (!is_a($post, 'WP_Post')) {
            return false;
        }

        // Check for our shortcodes
        $shortcodes = ['citygrinder', 'city_view', 'city_generator', 'city_explorer'];

        foreach ($shortcodes as $shortcode) {
            if (has_shortcode($post->post_content, $shortcode)) {
                return true;
            }
        }

        // Check for CityGrinder page template
        $template = get_page_template_slug($post->ID);
        if ($template && strpos($template, 'citygrinder') !== false) {
            return true;
        }

        // Allow filtering
        return apply_filters('citygrinder_should_load_assets', false, $post);
    }

    /**
     * Initialize HexGrinder integration
     */
    public function init_hexgrinder_integration() {
        // Check if HexGrinder is active and integration is enabled
        if (!self::is_hexgrinder_active()) {
            return;
        }

        if (!$this->get_option('hexgrinder_integration', true)) {
            return;
        }

        // Load integration class
        require_once CITYGRINDER_PLUGIN_DIR . 'includes/class-citygrinder-hexgrinder.php';
        CityGrinder_HexGrinder::init();
    }

    /**
     * Create plugin pages on activation
     */
    private function create_plugin_pages() {
        // Check if city explorer page exists
        $page_slug = 'city-explorer';
        $existing = get_page_by_path($page_slug);

        if (!$existing) {
            $page_id = wp_insert_post([
                'post_title' => __('City Explorer', 'citygrinder'),
                'post_name' => $page_slug,
                'post_content' => '[citygrinder]',
                'post_status' => 'publish',
                'post_type' => 'page',
                'post_author' => get_current_user_id() ?: 1,
            ]);

            if ($page_id && !is_wp_error($page_id)) {
                update_option('citygrinder_explorer_page_id', $page_id);
            }
        }
    }

    /**
     * Display admin notices
     */
    public function admin_notices() {
        // Activation notice
        if (get_transient('citygrinder_activated')) {
            delete_transient('citygrinder_activated');
            ?>
            <div class="notice notice-success is-dismissible">
                <p>
                    <?php
                    printf(
                        esc_html__('CityGrinder activated! %sVisit the City Explorer%s or %sconfigure settings%s.', 'citygrinder'),
                        '<a href="' . esc_url(home_url('/city-explorer/')) . '">',
                        '</a>',
                        '<a href="' . esc_url(admin_url('admin.php?page=citygrinder-settings')) . '">',
                        '</a>'
                    );
                    ?>
                </p>
            </div>
            <?php
        }

        // HexGrinder notice
        if (!self::is_hexgrinder_active() && get_current_screen() && strpos(get_current_screen()->id, 'citygrinder') !== false) {
            ?>
            <div class="notice notice-info is-dismissible">
                <p>
                    <?php esc_html_e('CityGrinder works best with HexGrinder. Install HexGrinder for seamless hex map integration.', 'citygrinder'); ?>
                </p>
            </div>
            <?php
        }
    }

    /**
     * Check if HexGrinder is active
     *
     * @return bool
     */
    public static function is_hexgrinder_active() {
        return class_exists('HexGrinder');
    }

    /**
     * Get available city types
     *
     * @return array
     */
    public static function get_city_types() {
        return apply_filters('citygrinder_city_types', [
            'village' => __('Village', 'citygrinder'),
            'town' => __('Town', 'citygrinder'),
            'city' => __('City', 'citygrinder'),
            'fortress' => __('Fortress', 'citygrinder'),
            'port' => __('Port City', 'citygrinder'),
            'capital' => __('Capital', 'citygrinder'),
        ]);
    }

    /**
     * Get available size classes
     *
     * @return array
     */
    public static function get_size_classes() {
        return apply_filters('citygrinder_size_classes', [
            'hamlet' => ['label' => __('Hamlet', 'citygrinder'), 'population' => [20, 100]],
            'village' => ['label' => __('Village', 'citygrinder'), 'population' => [100, 500]],
            'town' => ['label' => __('Town', 'citygrinder'), 'population' => [500, 5000]],
            'city' => ['label' => __('City', 'citygrinder'), 'population' => [5000, 25000]],
            'metropolis' => ['label' => __('Metropolis', 'citygrinder'), 'population' => [25000, 100000]],
        ]);
    }

    /**
     * Get district types
     *
     * @return array
     */
    public static function get_district_types() {
        return apply_filters('citygrinder_district_types', [
            'market' => [
                'label' => __('Market', 'citygrinder'),
                'color' => '#f6e05e',
                'buildings' => ['shop', 'warehouse', 'inn', 'tavern', 'guild_hall'],
            ],
            'residential' => [
                'label' => __('Residential', 'citygrinder'),
                'color' => '#68d391',
                'buildings' => ['house', 'apartment', 'shop', 'well'],
            ],
            'noble' => [
                'label' => __('Noble Quarter', 'citygrinder'),
                'color' => '#9f7aea',
                'buildings' => ['mansion', 'estate', 'garden', 'chapel'],
            ],
            'craftsmen' => [
                'label' => __('Craftsmen', 'citygrinder'),
                'color' => '#fc8181',
                'buildings' => ['workshop', 'smithy', 'tannery', 'house'],
            ],
            'temple' => [
                'label' => __('Temple District', 'citygrinder'),
                'color' => '#90cdf4',
                'buildings' => ['temple', 'shrine', 'monastery', 'hospice'],
            ],
            'docks' => [
                'label' => __('Docks', 'citygrinder'),
                'color' => '#63b3ed',
                'buildings' => ['warehouse', 'tavern', 'fishery', 'shipyard'],
            ],
            'slums' => [
                'label' => __('Slums', 'citygrinder'),
                'color' => '#a0aec0',
                'buildings' => ['shack', 'hovel', 'den', 'pawnshop'],
            ],
            'military' => [
                'label' => __('Military', 'citygrinder'),
                'color' => '#f687b3',
                'buildings' => ['barracks', 'armory', 'stable', 'training_ground'],
            ],
        ]);
    }
}

/**
 * Get CityGrinder instance
 *
 * @return CityGrinder
 */
function citygrinder() {
    return CityGrinder::get_instance();
}

/**
 * Initialize the plugin
 */
add_action('plugins_loaded', 'citygrinder', 10);
