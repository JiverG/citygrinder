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
 * Text Domain: citygrinder
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Plugin constants
define('CITYGRINDER_VERSION', '1.0.0');
define('CITYGRINDER_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('CITYGRINDER_PLUGIN_URL', plugin_dir_url(__FILE__));
define('CITYGRINDER_PLUGIN_BASENAME', plugin_basename(__FILE__));

/**
 * Main CityGrinder Plugin Class
 *
 * Uses singleton pattern for WordPress plugin best practices
 */
class CityGrinder {

    /**
     * Single instance of the class
     */
    private static $instance = null;

    /**
     * Get singleton instance
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
        $this->load_dependencies();
        $this->register_hooks();
    }

    /**
     * Load required files
     */
    private function load_dependencies() {
        // Core classes
        require_once CITYGRINDER_PLUGIN_DIR . 'includes/class-citygrinder-db.php';
        require_once CITYGRINDER_PLUGIN_DIR . 'includes/class-citygrinder-api.php';
        require_once CITYGRINDER_PLUGIN_DIR . 'includes/class-citygrinder-shortcodes.php';

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

        // Asset loading
        add_action('wp_enqueue_scripts', [$this, 'enqueue_frontend_assets']);
        add_action('admin_enqueue_scripts', [$this, 'enqueue_admin_assets']);

        // Initialize components
        add_action('init', [$this, 'init_components']);

        // HexGrinder integration (if available)
        add_action('plugins_loaded', [$this, 'init_hexgrinder_integration'], 20);
    }

    /**
     * Plugin activation
     */
    public function activate() {
        // Create database tables
        CityGrinder_DB::create_tables();

        // Create default pages if needed
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
        flush_rewrite_rules();
    }

    /**
     * Initialize components
     */
    public function init_components() {
        CityGrinder_DB::init();
        CityGrinder_API::init();
        CityGrinder_Shortcodes::init();
    }

    /**
     * Enqueue frontend scripts and styles
     */
    public function enqueue_frontend_assets() {
        // Only load on pages with our shortcode
        if (!$this->should_load_assets()) {
            return;
        }

        // Vendor scripts
        wp_enqueue_script(
            'seedrandom',
            CITYGRINDER_PLUGIN_URL . 'assets/js/vendor/seedrandom.min.js',
            [],
            '3.0.5',
            true
        );

        wp_enqueue_script(
            'delaunator',
            CITYGRINDER_PLUGIN_URL . 'assets/js/vendor/delaunator.min.js',
            [],
            '5.0.0',
            true
        );

        // CityGrinder scripts
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
            'citygrinder-main',
            CITYGRINDER_PLUGIN_URL . 'assets/js/citygrinder.js',
            ['citygrinder-renderer', 'jquery'],
            CITYGRINDER_VERSION,
            true
        );

        // Localize script with AJAX data
        wp_localize_script('citygrinder-main', 'citygrinder_config', [
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('citygrinder_nonce'),
            'plugin_url' => CITYGRINDER_PLUGIN_URL,
            'is_logged_in' => is_user_logged_in(),
            'strings' => [
                'generating' => __('Generating city...', 'citygrinder'),
                'saving' => __('Saving...', 'citygrinder'),
                'error' => __('An error occurred', 'citygrinder'),
            ]
        ]);

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
    }

    /**
     * Check if we should load assets on this page
     */
    private function should_load_assets() {
        global $post;

        if (!is_a($post, 'WP_Post')) {
            return false;
        }

        // Check for our shortcodes
        $shortcodes = ['citygrinder', 'city_view', 'city_generator'];

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

        return false;
    }

    /**
     * Initialize HexGrinder integration
     */
    public function init_hexgrinder_integration() {
        // Check if HexGrinder is active
        if (!class_exists('HexGrinder')) {
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
        $existing = get_page_by_path('city-explorer');

        if (!$existing) {
            wp_insert_post([
                'post_title' => 'City Explorer',
                'post_name' => 'city-explorer',
                'post_content' => '[citygrinder]',
                'post_status' => 'publish',
                'post_type' => 'page',
                'post_author' => 1,
            ]);
        }
    }

    /**
     * Check if HexGrinder is active
     */
    public static function is_hexgrinder_active() {
        return class_exists('HexGrinder');
    }
}

/**
 * Initialize the plugin
 */
function citygrinder_init() {
    return CityGrinder::get_instance();
}

// Start the plugin
add_action('plugins_loaded', 'citygrinder_init');
