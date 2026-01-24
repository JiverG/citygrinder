<?php
/**
 * CityGrinder Shortcodes Class
 *
 * Handles all shortcode registrations and rendering.
 *
 * @package CityGrinder
 * @since 1.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Shortcodes handler class
 */
class CityGrinder_Shortcodes {

    /**
     * Initialize shortcodes
     */
    public static function init() {
        add_shortcode('citygrinder', [__CLASS__, 'render_citygrinder']);
        add_shortcode('city_view', [__CLASS__, 'render_city_view']);
        add_shortcode('city_generator', [__CLASS__, 'render_city_generator']);
        add_shortcode('city_list', [__CLASS__, 'render_city_list']);
    }

    /**
     * Main CityGrinder shortcode
     * Full-featured city explorer with generation and viewing capabilities
     *
     * @param array $atts Shortcode attributes
     * @return string
     */
    public static function render_citygrinder($atts) {
        $atts = shortcode_atts([
            'mode' => 'full',          // full, view, generate
            'city_id' => 0,            // Load specific city
            'seed' => '',              // Generate from seed
            'city_type' => '',         // Default city type
            'size_class' => '',        // Default size class
            'width' => '100%',         // Container width
            'height' => '600px',       // Container height
            'show_controls' => 'true', // Show generation controls
            'show_sidebar' => 'true',  // Show info sidebar
            'allow_save' => 'true',    // Allow saving (if logged in)
        ], $atts, 'citygrinder');

        // Parse boolean attributes
        $show_controls = filter_var($atts['show_controls'], FILTER_VALIDATE_BOOLEAN);
        $show_sidebar = filter_var($atts['show_sidebar'], FILTER_VALIDATE_BOOLEAN);
        $allow_save = filter_var($atts['allow_save'], FILTER_VALIDATE_BOOLEAN);

        // Check for share token in URL
        $share_token = isset($_GET['token']) ? sanitize_text_field($_GET['token']) : '';

        // Build configuration for JS
        $config = [
            'mode' => sanitize_text_field($atts['mode']),
            'cityId' => absint($atts['city_id']),
            'seed' => sanitize_text_field($atts['seed']),
            'cityType' => sanitize_text_field($atts['city_type']),
            'sizeClass' => sanitize_text_field($atts['size_class']),
            'shareToken' => $share_token,
            'showControls' => $show_controls,
            'showSidebar' => $show_sidebar,
            'allowSave' => $allow_save && is_user_logged_in(),
        ];

        $container_id = 'citygrinder-' . wp_rand(1000, 9999);

        ob_start();
        ?>
        <div id="<?php echo esc_attr($container_id); ?>"
             class="citygrinder-container citygrinder-mode-<?php echo esc_attr($atts['mode']); ?>"
             style="width: <?php echo esc_attr($atts['width']); ?>; min-height: <?php echo esc_attr($atts['height']); ?>;"
             data-config="<?php echo esc_attr(wp_json_encode($config)); ?>">

            <!-- Header / Toolbar -->
            <?php if ($show_controls): ?>
            <div class="citygrinder-header">
                <h2 class="citygrinder-title">
                    <span class="city-name"><?php esc_html_e('City Explorer', 'citygrinder'); ?></span>
                </h2>
                <div class="citygrinder-toolbar">
                    <?php echo self::render_generation_controls($atts); ?>
                </div>
            </div>
            <?php endif; ?>

            <!-- Main Content Area -->
            <div class="citygrinder-main">
                <!-- Canvas Container -->
                <div class="citygrinder-canvas-wrapper">
                    <canvas class="citygrinder-canvas"></canvas>

                    <!-- Canvas Controls -->
                    <div class="canvas-controls">
                        <button type="button" class="cg-btn cg-btn--icon" data-action="zoom-in" title="<?php esc_attr_e('Zoom In', 'citygrinder'); ?>">
                            <span class="dashicons dashicons-plus-alt2"></span>
                        </button>
                        <button type="button" class="cg-btn cg-btn--icon" data-action="zoom-out" title="<?php esc_attr_e('Zoom Out', 'citygrinder'); ?>">
                            <span class="dashicons dashicons-minus"></span>
                        </button>
                        <button type="button" class="cg-btn cg-btn--icon" data-action="reset-view" title="<?php esc_attr_e('Reset View', 'citygrinder'); ?>">
                            <span class="dashicons dashicons-image-rotate"></span>
                        </button>
                    </div>

                    <!-- Loading Overlay -->
                    <div class="citygrinder-loading" style="display: none;">
                        <div class="loading-spinner"></div>
                        <div class="loading-text"><?php esc_html_e('Generating city...', 'citygrinder'); ?></div>
                    </div>
                </div>

                <!-- Sidebar -->
                <?php if ($show_sidebar): ?>
                <div class="citygrinder-sidebar">
                    <?php echo self::render_sidebar_panels($atts); ?>
                </div>
                <?php endif; ?>
            </div>

            <!-- Tooltip container -->
            <div class="cg-tooltip" style="display: none;">
                <div class="cg-tooltip__title"></div>
                <div class="cg-tooltip__content"></div>
            </div>
        </div>

        <script>
        (function() {
            document.addEventListener('DOMContentLoaded', function() {
                if (typeof CityGrinderApp !== 'undefined') {
                    var container = document.getElementById('<?php echo esc_js($container_id); ?>');
                    if (container) {
                        new CityGrinderApp(container);
                    }
                }
            });
        })();
        </script>
        <?php
        return ob_get_clean();
    }

    /**
     * Render generation controls
     *
     * @param array $atts Shortcode attributes
     * @return string
     */
    private static function render_generation_controls($atts) {
        $city_types = CityGrinder::get_city_types();
        $size_classes = CityGrinder::get_size_classes();

        ob_start();
        ?>
        <div class="generation-controls-inline">
            <select class="cg-select cg-select--sm" name="city_type" id="cg-city-type">
                <?php foreach ($city_types as $value => $label): ?>
                <option value="<?php echo esc_attr($value); ?>"
                        <?php selected($atts['city_type'], $value); ?>>
                    <?php echo esc_html($label); ?>
                </option>
                <?php endforeach; ?>
            </select>

            <select class="cg-select cg-select--sm" name="size_class" id="cg-size-class">
                <?php foreach ($size_classes as $value => $data): ?>
                <option value="<?php echo esc_attr($value); ?>"
                        <?php selected($atts['size_class'], $value); ?>>
                    <?php echo esc_html($data['label']); ?>
                </option>
                <?php endforeach; ?>
            </select>

            <button type="button" class="cg-btn cg-btn--primary" data-action="generate">
                <?php esc_html_e('Generate', 'citygrinder'); ?>
            </button>

            <?php if (is_user_logged_in()): ?>
            <button type="button" class="cg-btn" data-action="save" style="display: none;">
                <?php esc_html_e('Save', 'citygrinder'); ?>
            </button>
            <button type="button" class="cg-btn" data-action="my-cities">
                <?php esc_html_e('My Cities', 'citygrinder'); ?>
            </button>
            <?php endif; ?>

            <button type="button" class="cg-btn" data-action="export">
                <?php esc_html_e('Export', 'citygrinder'); ?>
            </button>
        </div>
        <?php
        return ob_get_clean();
    }

    /**
     * Render sidebar panels
     *
     * @param array $atts Shortcode attributes
     * @return string
     */
    private static function render_sidebar_panels($atts) {
        ob_start();
        ?>
        <!-- City Info Panel -->
        <div class="cg-panel cg-panel--info">
            <div class="cg-panel__header">
                <h3 class="cg-panel__title"><?php esc_html_e('City Info', 'citygrinder'); ?></h3>
            </div>
            <div class="cg-panel__content">
                <div class="city-info-grid">
                    <span class="city-info-label"><?php esc_html_e('Type:', 'citygrinder'); ?></span>
                    <span class="city-info-value" data-field="city_type">-</span>

                    <span class="city-info-label"><?php esc_html_e('Size:', 'citygrinder'); ?></span>
                    <span class="city-info-value" data-field="size_class">-</span>

                    <span class="city-info-label"><?php esc_html_e('Population:', 'citygrinder'); ?></span>
                    <span class="city-info-value" data-field="population">-</span>

                    <span class="city-info-label"><?php esc_html_e('Districts:', 'citygrinder'); ?></span>
                    <span class="city-info-value" data-field="district_count">-</span>

                    <span class="city-info-label"><?php esc_html_e('Seed:', 'citygrinder'); ?></span>
                    <span class="city-info-value city-info-value--seed" data-field="seed">-</span>
                </div>
            </div>
        </div>

        <!-- Districts Panel -->
        <div class="cg-panel cg-panel--districts">
            <div class="cg-panel__header">
                <h3 class="cg-panel__title"><?php esc_html_e('Districts', 'citygrinder'); ?></h3>
            </div>
            <div class="cg-panel__content">
                <ul class="district-list">
                    <li class="district-list-empty"><?php esc_html_e('Generate a city to see districts', 'citygrinder'); ?></li>
                </ul>
            </div>
        </div>

        <!-- POIs Panel -->
        <div class="cg-panel cg-panel--pois">
            <div class="cg-panel__header">
                <h3 class="cg-panel__title"><?php esc_html_e('Notable Locations', 'citygrinder'); ?></h3>
            </div>
            <div class="cg-panel__content">
                <ul class="poi-list">
                    <li class="poi-list-empty"><?php esc_html_e('Generate a city to see locations', 'citygrinder'); ?></li>
                </ul>
            </div>
        </div>

        <!-- Layers Panel -->
        <div class="cg-panel cg-panel--layers">
            <div class="cg-panel__header">
                <h3 class="cg-panel__title"><?php esc_html_e('Layers', 'citygrinder'); ?></h3>
            </div>
            <div class="cg-panel__content">
                <label class="cg-checkbox">
                    <input type="checkbox" name="layer_districts" checked>
                    <span><?php esc_html_e('Districts', 'citygrinder'); ?></span>
                </label>
                <label class="cg-checkbox">
                    <input type="checkbox" name="layer_streets" checked>
                    <span><?php esc_html_e('Streets', 'citygrinder'); ?></span>
                </label>
                <label class="cg-checkbox">
                    <input type="checkbox" name="layer_buildings" checked>
                    <span><?php esc_html_e('Buildings', 'citygrinder'); ?></span>
                </label>
                <label class="cg-checkbox">
                    <input type="checkbox" name="layer_walls" checked>
                    <span><?php esc_html_e('Walls', 'citygrinder'); ?></span>
                </label>
                <label class="cg-checkbox">
                    <input type="checkbox" name="layer_labels" checked>
                    <span><?php esc_html_e('Labels', 'citygrinder'); ?></span>
                </label>
            </div>
        </div>
        <?php
        return ob_get_clean();
    }

    /**
     * City view shortcode - Display a specific city
     *
     * @param array $atts Shortcode attributes
     * @return string
     */
    public static function render_city_view($atts) {
        $atts = shortcode_atts([
            'id' => 0,
            'seed' => '',
            'width' => '100%',
            'height' => '500px',
        ], $atts, 'city_view');

        // If no ID or seed, show error
        if (empty($atts['id']) && empty($atts['seed'])) {
            return '<div class="citygrinder-error">' .
                   esc_html__('Please specify a city ID or seed.', 'citygrinder') .
                   '</div>';
        }

        // Use main shortcode with view mode
        return self::render_citygrinder([
            'mode' => 'view',
            'city_id' => $atts['id'],
            'seed' => $atts['seed'],
            'width' => $atts['width'],
            'height' => $atts['height'],
            'show_controls' => 'false',
            'show_sidebar' => 'true',
            'allow_save' => 'false',
        ]);
    }

    /**
     * City generator shortcode - Generation-only interface
     *
     * @param array $atts Shortcode attributes
     * @return string
     */
    public static function render_city_generator($atts) {
        $atts = shortcode_atts([
            'city_type' => 'town',
            'size_class' => 'medium',
            'width' => '100%',
            'height' => '500px',
        ], $atts, 'city_generator');

        return self::render_citygrinder([
            'mode' => 'generate',
            'city_type' => $atts['city_type'],
            'size_class' => $atts['size_class'],
            'width' => $atts['width'],
            'height' => $atts['height'],
            'show_controls' => 'true',
            'show_sidebar' => 'false',
            'allow_save' => 'true',
        ]);
    }

    /**
     * City list shortcode - Display user's saved cities
     *
     * @param array $atts Shortcode attributes
     * @return string
     */
    public static function render_city_list($atts) {
        $atts = shortcode_atts([
            'limit' => 10,
            'columns' => 3,
            'show_thumbnail' => 'true',
        ], $atts, 'city_list');

        if (!is_user_logged_in()) {
            return '<div class="citygrinder-login-required">' .
                   '<p>' . esc_html__('Please log in to view your saved cities.', 'citygrinder') . '</p>' .
                   '<a href="' . esc_url(wp_login_url(get_permalink())) . '" class="cg-btn cg-btn--primary">' .
                   esc_html__('Log In', 'citygrinder') .
                   '</a></div>';
        }

        $user_id = get_current_user_id();
        $cities = CityGrinder_DB::get_user_cities($user_id, [
            'limit' => absint($atts['limit']),
        ]);

        if (empty($cities)) {
            return '<div class="citygrinder-no-cities">' .
                   '<p>' . esc_html__('You haven\'t saved any cities yet.', 'citygrinder') . '</p>' .
                   '<a href="' . esc_url(home_url('/city-explorer/')) . '" class="cg-btn cg-btn--primary">' .
                   esc_html__('Generate Your First City', 'citygrinder') .
                   '</a></div>';
        }

        $columns = absint($atts['columns']);
        $show_thumbnail = filter_var($atts['show_thumbnail'], FILTER_VALIDATE_BOOLEAN);

        ob_start();
        ?>
        <div class="citygrinder-city-list" style="--columns: <?php echo esc_attr($columns); ?>">
            <?php foreach ($cities as $city): ?>
            <div class="city-card">
                <?php if ($show_thumbnail): ?>
                <div class="city-card__thumbnail">
                    <!-- Thumbnail placeholder - will be generated by JS -->
                    <div class="city-card__thumbnail-placeholder"
                         data-seed="<?php echo esc_attr($city->seed); ?>">
                    </div>
                </div>
                <?php endif; ?>

                <div class="city-card__content">
                    <h3 class="city-card__title"><?php echo esc_html($city->name); ?></h3>
                    <div class="city-card__meta">
                        <span class="city-card__type"><?php echo esc_html(ucfirst($city->city_type)); ?></span>
                        <span class="city-card__population">
                            <?php echo esc_html(number_format($city->population)); ?> pop.
                        </span>
                    </div>
                    <div class="city-card__actions">
                        <a href="<?php echo esc_url(add_query_arg('city_id', $city->id, home_url('/city-explorer/'))); ?>"
                           class="cg-btn cg-btn--sm">
                            <?php esc_html_e('View', 'citygrinder'); ?>
                        </a>
                        <button type="button"
                                class="cg-btn cg-btn--sm"
                                data-action="delete-city"
                                data-city-id="<?php echo esc_attr($city->id); ?>">
                            <?php esc_html_e('Delete', 'citygrinder'); ?>
                        </button>
                    </div>
                </div>
            </div>
            <?php endforeach; ?>
        </div>
        <?php
        return ob_get_clean();
    }
}
