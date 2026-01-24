<?php
/**
 * CityGrinder Admin Class
 *
 * Handles WordPress admin functionality including menus, settings, and dashboard widgets.
 *
 * @package CityGrinder
 * @since 1.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Admin handler class
 */
class CityGrinder_Admin {

    /**
     * Initialize admin
     */
    public static function init() {
        add_action('admin_menu', [__CLASS__, 'add_admin_menu']);
        add_action('admin_init', [__CLASS__, 'register_settings']);
        add_filter('plugin_action_links_' . CITYGRINDER_PLUGIN_BASENAME, [__CLASS__, 'add_plugin_links']);

        // Dashboard widget
        add_action('wp_dashboard_setup', [__CLASS__, 'add_dashboard_widget']);
    }

    /**
     * Add admin menu
     */
    public static function add_admin_menu() {
        // Check if HexGrinder is active to add as submenu
        if (CityGrinder::is_hexgrinder_active()) {
            // Add as submenu under HexGrinder (if it has a menu)
            add_submenu_page(
                'hexgrinder',  // Parent slug (adjust based on HexGrinder's menu)
                __('CityGrinder', 'citygrinder'),
                __('City Generator', 'citygrinder'),
                'manage_options',
                'citygrinder',
                [__CLASS__, 'render_main_page']
            );
        } else {
            // Add standalone menu
            add_menu_page(
                __('CityGrinder', 'citygrinder'),
                __('CityGrinder', 'citygrinder'),
                'manage_options',
                'citygrinder',
                [__CLASS__, 'render_main_page'],
                'dashicons-building',
                30
            );
        }

        // Settings submenu
        add_submenu_page(
            CityGrinder::is_hexgrinder_active() ? 'hexgrinder' : 'citygrinder',
            __('CityGrinder Settings', 'citygrinder'),
            __('City Settings', 'citygrinder'),
            'manage_options',
            'citygrinder-settings',
            [__CLASS__, 'render_settings_page']
        );

        // Cities management submenu
        add_submenu_page(
            CityGrinder::is_hexgrinder_active() ? 'hexgrinder' : 'citygrinder',
            __('Manage Cities', 'citygrinder'),
            __('All Cities', 'citygrinder'),
            'manage_options',
            'citygrinder-cities',
            [__CLASS__, 'render_cities_page']
        );
    }

    /**
     * Register plugin settings
     */
    public static function register_settings() {
        register_setting(
            'citygrinder_options',
            'citygrinder_options',
            [__CLASS__, 'sanitize_options']
        );

        // General Settings Section
        add_settings_section(
            'citygrinder_general',
            __('General Settings', 'citygrinder'),
            [__CLASS__, 'render_general_section'],
            'citygrinder-settings'
        );

        add_settings_field(
            'default_city_type',
            __('Default City Type', 'citygrinder'),
            [__CLASS__, 'render_select_field'],
            'citygrinder-settings',
            'citygrinder_general',
            [
                'id' => 'default_city_type',
                'options' => CityGrinder::get_city_types(),
            ]
        );

        add_settings_field(
            'default_size_class',
            __('Default Size', 'citygrinder'),
            [__CLASS__, 'render_select_field'],
            'citygrinder-settings',
            'citygrinder_general',
            [
                'id' => 'default_size_class',
                'options' => array_combine(
                    array_keys(CityGrinder::get_size_classes()),
                    array_column(CityGrinder::get_size_classes(), 'label')
                ),
            ]
        );

        add_settings_field(
            'enable_walls',
            __('Enable Walls by Default', 'citygrinder'),
            [__CLASS__, 'render_checkbox_field'],
            'citygrinder-settings',
            'citygrinder_general',
            ['id' => 'enable_walls']
        );

        // Display Settings Section
        add_settings_section(
            'citygrinder_display',
            __('Display Settings', 'citygrinder'),
            [__CLASS__, 'render_display_section'],
            'citygrinder-settings'
        );

        add_settings_field(
            'canvas_width',
            __('Default Canvas Width', 'citygrinder'),
            [__CLASS__, 'render_number_field'],
            'citygrinder-settings',
            'citygrinder_display',
            [
                'id' => 'canvas_width',
                'min' => 400,
                'max' => 1920,
                'step' => 10,
            ]
        );

        add_settings_field(
            'canvas_height',
            __('Default Canvas Height', 'citygrinder'),
            [__CLASS__, 'render_number_field'],
            'citygrinder-settings',
            'citygrinder_display',
            [
                'id' => 'canvas_height',
                'min' => 300,
                'max' => 1080,
                'step' => 10,
            ]
        );

        add_settings_field(
            'show_population',
            __('Show Population', 'citygrinder'),
            [__CLASS__, 'render_checkbox_field'],
            'citygrinder-settings',
            'citygrinder_display',
            ['id' => 'show_population']
        );

        add_settings_field(
            'show_district_names',
            __('Show District Names', 'citygrinder'),
            [__CLASS__, 'render_checkbox_field'],
            'citygrinder-settings',
            'citygrinder_display',
            ['id' => 'show_district_names']
        );

        // Integration Settings Section
        add_settings_section(
            'citygrinder_integration',
            __('Integration Settings', 'citygrinder'),
            [__CLASS__, 'render_integration_section'],
            'citygrinder-settings'
        );

        add_settings_field(
            'hexgrinder_integration',
            __('Enable HexGrinder Integration', 'citygrinder'),
            [__CLASS__, 'render_checkbox_field'],
            'citygrinder-settings',
            'citygrinder_integration',
            [
                'id' => 'hexgrinder_integration',
                'description' => __('Allow entering cities from HexGrinder hex map.', 'citygrinder'),
            ]
        );

        // Advanced Settings Section
        add_settings_section(
            'citygrinder_advanced',
            __('Advanced Settings', 'citygrinder'),
            [__CLASS__, 'render_advanced_section'],
            'citygrinder-settings'
        );

        add_settings_field(
            'remove_data_on_uninstall',
            __('Remove Data on Uninstall', 'citygrinder'),
            [__CLASS__, 'render_checkbox_field'],
            'citygrinder-settings',
            'citygrinder_advanced',
            [
                'id' => 'remove_data_on_uninstall',
                'description' => __('Delete all cities and settings when plugin is uninstalled.', 'citygrinder'),
            ]
        );
    }

    /**
     * Sanitize options
     *
     * @param array $input Raw input
     * @return array
     */
    public static function sanitize_options($input) {
        $sanitized = [];

        $sanitized['default_city_type'] = sanitize_text_field($input['default_city_type'] ?? 'town');
        $sanitized['default_size_class'] = sanitize_text_field($input['default_size_class'] ?? 'medium');
        $sanitized['enable_walls'] = !empty($input['enable_walls']);
        $sanitized['auto_save'] = !empty($input['auto_save']);
        $sanitized['show_population'] = !empty($input['show_population']);
        $sanitized['show_district_names'] = !empty($input['show_district_names']);
        $sanitized['canvas_width'] = absint($input['canvas_width'] ?? 800);
        $sanitized['canvas_height'] = absint($input['canvas_height'] ?? 600);
        $sanitized['hexgrinder_integration'] = !empty($input['hexgrinder_integration']);
        $sanitized['remove_data_on_uninstall'] = !empty($input['remove_data_on_uninstall']);

        return $sanitized;
    }

    /**
     * Add plugin action links
     *
     * @param array $links Existing links
     * @return array
     */
    public static function add_plugin_links($links) {
        $plugin_links = [
            '<a href="' . admin_url('admin.php?page=citygrinder-settings') . '">' .
            __('Settings', 'citygrinder') . '</a>',
            '<a href="' . home_url('/city-explorer/') . '">' .
            __('City Explorer', 'citygrinder') . '</a>',
        ];

        return array_merge($plugin_links, $links);
    }

    /**
     * Add dashboard widget
     */
    public static function add_dashboard_widget() {
        wp_add_dashboard_widget(
            'citygrinder_dashboard',
            __('CityGrinder', 'citygrinder'),
            [__CLASS__, 'render_dashboard_widget']
        );
    }

    // =========================================================================
    // RENDER METHODS
    // =========================================================================

    /**
     * Render main admin page
     */
    public static function render_main_page() {
        $total_cities = 0;
        global $wpdb;
        $total_cities = $wpdb->get_var(
            "SELECT COUNT(*) FROM " . CityGrinder_DB::get_table('cities')
        );

        ?>
        <div class="wrap">
            <h1><?php esc_html_e('CityGrinder', 'citygrinder'); ?></h1>

            <div class="citygrinder-admin-dashboard">
                <div class="citygrinder-admin-stats">
                    <div class="stat-card">
                        <span class="stat-number"><?php echo esc_html($total_cities); ?></span>
                        <span class="stat-label"><?php esc_html_e('Total Cities', 'citygrinder'); ?></span>
                    </div>
                </div>

                <div class="citygrinder-admin-actions">
                    <h2><?php esc_html_e('Quick Actions', 'citygrinder'); ?></h2>
                    <p>
                        <a href="<?php echo esc_url(home_url('/city-explorer/')); ?>" class="button button-primary">
                            <?php esc_html_e('Open City Explorer', 'citygrinder'); ?>
                        </a>
                        <a href="<?php echo esc_url(admin_url('admin.php?page=citygrinder-settings')); ?>" class="button">
                            <?php esc_html_e('Settings', 'citygrinder'); ?>
                        </a>
                        <a href="<?php echo esc_url(admin_url('admin.php?page=citygrinder-cities')); ?>" class="button">
                            <?php esc_html_e('Manage Cities', 'citygrinder'); ?>
                        </a>
                    </p>
                </div>

                <?php if (!CityGrinder::is_hexgrinder_active()): ?>
                <div class="citygrinder-admin-notice">
                    <h3><?php esc_html_e('HexGrinder Integration', 'citygrinder'); ?></h3>
                    <p><?php esc_html_e('CityGrinder works best with HexGrinder! Install HexGrinder to enable seamless transition between your world hex map and city exploration.', 'citygrinder'); ?></p>
                </div>
                <?php endif; ?>
            </div>
        </div>
        <?php
    }

    /**
     * Render settings page
     */
    public static function render_settings_page() {
        ?>
        <div class="wrap">
            <h1><?php esc_html_e('CityGrinder Settings', 'citygrinder'); ?></h1>

            <form method="post" action="options.php">
                <?php
                settings_fields('citygrinder_options');
                do_settings_sections('citygrinder-settings');
                submit_button();
                ?>
            </form>
        </div>
        <?php
    }

    /**
     * Render cities management page
     */
    public static function render_cities_page() {
        global $wpdb;

        $per_page = 20;
        $current_page = isset($_GET['paged']) ? max(1, absint($_GET['paged'])) : 1;
        $offset = ($current_page - 1) * $per_page;

        $total = $wpdb->get_var("SELECT COUNT(*) FROM " . CityGrinder_DB::get_table('cities'));
        $cities = $wpdb->get_results($wpdb->prepare(
            "SELECT c.*, u.display_name as author_name
             FROM " . CityGrinder_DB::get_table('cities') . " c
             LEFT JOIN {$wpdb->users} u ON c.user_id = u.ID
             ORDER BY c.updated_at DESC
             LIMIT %d OFFSET %d",
            $per_page, $offset
        ));

        $total_pages = ceil($total / $per_page);
        ?>
        <div class="wrap">
            <h1><?php esc_html_e('All Cities', 'citygrinder'); ?></h1>

            <table class="wp-list-table widefat fixed striped">
                <thead>
                    <tr>
                        <th><?php esc_html_e('Name', 'citygrinder'); ?></th>
                        <th><?php esc_html_e('Type', 'citygrinder'); ?></th>
                        <th><?php esc_html_e('Size', 'citygrinder'); ?></th>
                        <th><?php esc_html_e('Population', 'citygrinder'); ?></th>
                        <th><?php esc_html_e('Author', 'citygrinder'); ?></th>
                        <th><?php esc_html_e('Created', 'citygrinder'); ?></th>
                        <th><?php esc_html_e('Actions', 'citygrinder'); ?></th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (empty($cities)): ?>
                    <tr>
                        <td colspan="7"><?php esc_html_e('No cities found.', 'citygrinder'); ?></td>
                    </tr>
                    <?php else: ?>
                        <?php foreach ($cities as $city): ?>
                        <tr>
                            <td><strong><?php echo esc_html($city->name); ?></strong></td>
                            <td><?php echo esc_html(ucfirst($city->city_type)); ?></td>
                            <td><?php echo esc_html(ucfirst($city->size_class)); ?></td>
                            <td><?php echo esc_html(number_format($city->population)); ?></td>
                            <td><?php echo esc_html($city->author_name ?: 'Unknown'); ?></td>
                            <td><?php echo esc_html(date_i18n(get_option('date_format'), strtotime($city->created_at))); ?></td>
                            <td>
                                <a href="<?php echo esc_url(add_query_arg('city_id', $city->id, home_url('/city-explorer/'))); ?>">
                                    <?php esc_html_e('View', 'citygrinder'); ?>
                                </a>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </tbody>
            </table>

            <?php if ($total_pages > 1): ?>
            <div class="tablenav bottom">
                <div class="tablenav-pages">
                    <?php
                    echo paginate_links([
                        'base' => add_query_arg('paged', '%#%'),
                        'format' => '',
                        'prev_text' => '&laquo;',
                        'next_text' => '&raquo;',
                        'total' => $total_pages,
                        'current' => $current_page,
                    ]);
                    ?>
                </div>
            </div>
            <?php endif; ?>
        </div>
        <?php
    }

    /**
     * Render dashboard widget
     */
    public static function render_dashboard_widget() {
        $user_id = get_current_user_id();
        $user_cities = CityGrinder_DB::get_user_cities($user_id, ['limit' => 5]);
        ?>
        <div class="citygrinder-widget">
            <?php if (empty($user_cities)): ?>
                <p><?php esc_html_e('You haven\'t created any cities yet.', 'citygrinder'); ?></p>
            <?php else: ?>
                <ul class="citygrinder-widget-list">
                    <?php foreach ($user_cities as $city): ?>
                    <li>
                        <a href="<?php echo esc_url(add_query_arg('city_id', $city->id, home_url('/city-explorer/'))); ?>">
                            <?php echo esc_html($city->name); ?>
                        </a>
                        <span class="city-meta">
                            <?php echo esc_html(ucfirst($city->city_type)); ?> -
                            <?php echo esc_html(number_format($city->population)); ?> pop.
                        </span>
                    </li>
                    <?php endforeach; ?>
                </ul>
            <?php endif; ?>
            <p class="citygrinder-widget-actions">
                <a href="<?php echo esc_url(home_url('/city-explorer/')); ?>" class="button">
                    <?php esc_html_e('Open City Explorer', 'citygrinder'); ?>
                </a>
            </p>
        </div>
        <?php
    }

    // =========================================================================
    // SETTINGS FIELD RENDERERS
    // =========================================================================

    public static function render_general_section() {
        echo '<p>' . esc_html__('Configure default settings for city generation.', 'citygrinder') . '</p>';
    }

    public static function render_display_section() {
        echo '<p>' . esc_html__('Configure how cities are displayed.', 'citygrinder') . '</p>';
    }

    public static function render_integration_section() {
        echo '<p>' . esc_html__('Configure integration with other plugins.', 'citygrinder') . '</p>';
    }

    public static function render_advanced_section() {
        echo '<p>' . esc_html__('Advanced settings. Use with caution.', 'citygrinder') . '</p>';
    }

    public static function render_select_field($args) {
        $options = get_option('citygrinder_options', []);
        $value = $options[$args['id']] ?? '';
        ?>
        <select name="citygrinder_options[<?php echo esc_attr($args['id']); ?>]" id="<?php echo esc_attr($args['id']); ?>">
            <?php foreach ($args['options'] as $key => $label): ?>
            <option value="<?php echo esc_attr($key); ?>" <?php selected($value, $key); ?>>
                <?php echo esc_html($label); ?>
            </option>
            <?php endforeach; ?>
        </select>
        <?php
        if (!empty($args['description'])) {
            echo '<p class="description">' . esc_html($args['description']) . '</p>';
        }
    }

    public static function render_checkbox_field($args) {
        $options = get_option('citygrinder_options', []);
        $checked = !empty($options[$args['id']]);
        ?>
        <label>
            <input type="checkbox"
                   name="citygrinder_options[<?php echo esc_attr($args['id']); ?>]"
                   id="<?php echo esc_attr($args['id']); ?>"
                   value="1"
                   <?php checked($checked); ?>>
            <?php if (!empty($args['description'])): ?>
                <?php echo esc_html($args['description']); ?>
            <?php endif; ?>
        </label>
        <?php
    }

    public static function render_number_field($args) {
        $options = get_option('citygrinder_options', []);
        $value = $options[$args['id']] ?? '';
        ?>
        <input type="number"
               name="citygrinder_options[<?php echo esc_attr($args['id']); ?>]"
               id="<?php echo esc_attr($args['id']); ?>"
               value="<?php echo esc_attr($value); ?>"
               min="<?php echo esc_attr($args['min'] ?? 0); ?>"
               max="<?php echo esc_attr($args['max'] ?? 9999); ?>"
               step="<?php echo esc_attr($args['step'] ?? 1); ?>"
               class="small-text">
        <?php
        if (!empty($args['description'])) {
            echo '<p class="description">' . esc_html($args['description']) . '</p>';
        }
    }
}
