<?php
/**
 * CityGrinder Templates Class
 *
 * Handles template rendering and partial loading.
 *
 * @package CityGrinder
 * @since 1.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Templates handler class
 */
class CityGrinder_Templates {

    /**
     * Initialize templates
     */
    public static function init() {
        // Add template filters
        add_filter('template_include', [__CLASS__, 'template_loader']);

        // Register template hooks
        add_action('wp_footer', [__CLASS__, 'render_modals']);
    }

    /**
     * Template loader
     *
     * @param string $template Current template
     * @return string
     */
    public static function template_loader($template) {
        // Check if we're on a CityGrinder page
        if (self::is_citygrinder_page()) {
            $custom_template = self::locate_template('city-explorer.php');
            if ($custom_template) {
                return $custom_template;
            }
        }

        return $template;
    }

    /**
     * Check if current page is a CityGrinder page
     *
     * @return bool
     */
    public static function is_citygrinder_page() {
        // Check for citygrinder query var
        if (get_query_var('citygrinder')) {
            return true;
        }

        // Check for city explorer page
        $page_id = get_option('citygrinder_explorer_page_id');
        if ($page_id && is_page($page_id)) {
            return true;
        }

        return false;
    }

    /**
     * Locate a template file
     *
     * @param string $template_name Template file name
     * @return string|false
     */
    public static function locate_template($template_name) {
        // Look in theme first
        $template = locate_template([
            'citygrinder/' . $template_name,
            $template_name,
        ]);

        // Fall back to plugin templates
        if (!$template) {
            $plugin_template = CITYGRINDER_PLUGIN_DIR . 'templates/' . $template_name;
            if (file_exists($plugin_template)) {
                $template = $plugin_template;
            }
        }

        return $template;
    }

    /**
     * Get a template part
     *
     * @param string $slug Template slug
     * @param string $name Template name (optional)
     * @param array $args Arguments to pass to template
     */
    public static function get_template_part($slug, $name = '', $args = []) {
        $templates = [];

        if ($name) {
            $templates[] = "{$slug}-{$name}.php";
        }
        $templates[] = "{$slug}.php";

        // Make args available to template
        if (!empty($args) && is_array($args)) {
            extract($args);
        }

        foreach ($templates as $template) {
            $located = self::locate_template($template);
            if ($located) {
                include $located;
                return;
            }
        }
    }

    /**
     * Render a template and return as string
     *
     * @param string $template_name Template name
     * @param array $args Arguments to pass to template
     * @return string
     */
    public static function render_template($template_name, $args = []) {
        ob_start();
        self::get_template_part($template_name, '', $args);
        return ob_get_clean();
    }

    /**
     * Render modal templates in footer
     */
    public static function render_modals() {
        // Only render on pages that need it
        global $post;
        if (!is_a($post, 'WP_Post')) {
            return;
        }

        $shortcodes = ['citygrinder', 'city_view', 'city_generator', 'city_explorer'];
        $has_shortcode = false;

        foreach ($shortcodes as $shortcode) {
            if (has_shortcode($post->post_content, $shortcode)) {
                $has_shortcode = true;
                break;
            }
        }

        if (!$has_shortcode) {
            return;
        }

        // Render modals
        self::render_save_modal();
        self::render_load_modal();
        self::render_share_modal();
        self::render_export_modal();
    }

    /**
     * Render save city modal
     */
    private static function render_save_modal() {
        ?>
        <div id="cg-modal-save" class="cg-modal" style="display: none;">
            <div class="cg-modal__backdrop"></div>
            <div class="cg-modal__content">
                <div class="cg-modal__header">
                    <h3 class="cg-modal__title"><?php esc_html_e('Save City', 'citygrinder'); ?></h3>
                    <button type="button" class="cg-modal__close" data-action="close-modal">&times;</button>
                </div>
                <div class="cg-modal__body">
                    <form id="cg-save-form" class="cg-form">
                        <div class="cg-form-group">
                            <label for="cg-save-name" class="cg-label">
                                <?php esc_html_e('City Name', 'citygrinder'); ?>
                            </label>
                            <input type="text" id="cg-save-name" name="name" class="cg-input" required>
                        </div>

                        <div class="cg-form-row">
                            <div class="cg-form-group">
                                <label for="cg-save-type" class="cg-label">
                                    <?php esc_html_e('City Type', 'citygrinder'); ?>
                                </label>
                                <select id="cg-save-type" name="city_type" class="cg-select">
                                    <?php foreach (CityGrinder::get_city_types() as $value => $label): ?>
                                    <option value="<?php echo esc_attr($value); ?>">
                                        <?php echo esc_html($label); ?>
                                    </option>
                                    <?php endforeach; ?>
                                </select>
                            </div>
                            <div class="cg-form-group">
                                <label for="cg-save-size" class="cg-label">
                                    <?php esc_html_e('Size', 'citygrinder'); ?>
                                </label>
                                <select id="cg-save-size" name="size_class" class="cg-select">
                                    <?php foreach (CityGrinder::get_size_classes() as $value => $data): ?>
                                    <option value="<?php echo esc_attr($value); ?>">
                                        <?php echo esc_html($data['label']); ?>
                                    </option>
                                    <?php endforeach; ?>
                                </select>
                            </div>
                        </div>

                        <input type="hidden" name="seed" id="cg-save-seed">
                        <input type="hidden" name="city_id" id="cg-save-id" value="0">
                    </form>
                </div>
                <div class="cg-modal__footer">
                    <button type="button" class="cg-btn" data-action="close-modal">
                        <?php esc_html_e('Cancel', 'citygrinder'); ?>
                    </button>
                    <button type="button" class="cg-btn cg-btn--primary" data-action="confirm-save">
                        <?php esc_html_e('Save City', 'citygrinder'); ?>
                    </button>
                </div>
            </div>
        </div>
        <?php
    }

    /**
     * Render load city modal
     */
    private static function render_load_modal() {
        ?>
        <div id="cg-modal-load" class="cg-modal" style="display: none;">
            <div class="cg-modal__backdrop"></div>
            <div class="cg-modal__content cg-modal__content--wide">
                <div class="cg-modal__header">
                    <h3 class="cg-modal__title"><?php esc_html_e('My Cities', 'citygrinder'); ?></h3>
                    <button type="button" class="cg-modal__close" data-action="close-modal">&times;</button>
                </div>
                <div class="cg-modal__body">
                    <div class="cg-cities-grid" id="cg-cities-list">
                        <div class="cg-loading">
                            <div class="loading-spinner"></div>
                            <div class="loading-text"><?php esc_html_e('Loading cities...', 'citygrinder'); ?></div>
                        </div>
                    </div>
                </div>
                <div class="cg-modal__footer">
                    <button type="button" class="cg-btn" data-action="close-modal">
                        <?php esc_html_e('Close', 'citygrinder'); ?>
                    </button>
                </div>
            </div>
        </div>
        <?php
    }

    /**
     * Render share modal
     */
    private static function render_share_modal() {
        ?>
        <div id="cg-modal-share" class="cg-modal" style="display: none;">
            <div class="cg-modal__backdrop"></div>
            <div class="cg-modal__content">
                <div class="cg-modal__header">
                    <h3 class="cg-modal__title"><?php esc_html_e('Share City', 'citygrinder'); ?></h3>
                    <button type="button" class="cg-modal__close" data-action="close-modal">&times;</button>
                </div>
                <div class="cg-modal__body">
                    <div class="cg-share-content">
                        <p><?php esc_html_e('Share this link to allow others to view your city:', 'citygrinder'); ?></p>
                        <div class="cg-share-url-wrapper">
                            <input type="text" id="cg-share-url" class="cg-input" readonly>
                            <button type="button" class="cg-btn" data-action="copy-share-url">
                                <?php esc_html_e('Copy', 'citygrinder'); ?>
                            </button>
                        </div>
                        <p class="cg-share-note">
                            <?php esc_html_e('Anyone with this link can view the city, but only you can edit it.', 'citygrinder'); ?>
                        </p>
                    </div>
                </div>
                <div class="cg-modal__footer">
                    <button type="button" class="cg-btn cg-btn--danger" data-action="disable-sharing">
                        <?php esc_html_e('Disable Sharing', 'citygrinder'); ?>
                    </button>
                    <button type="button" class="cg-btn" data-action="close-modal">
                        <?php esc_html_e('Close', 'citygrinder'); ?>
                    </button>
                </div>
            </div>
        </div>
        <?php
    }

    /**
     * Render export modal
     */
    private static function render_export_modal() {
        ?>
        <div id="cg-modal-export" class="cg-modal" style="display: none;">
            <div class="cg-modal__backdrop"></div>
            <div class="cg-modal__content">
                <div class="cg-modal__header">
                    <h3 class="cg-modal__title"><?php esc_html_e('Export City', 'citygrinder'); ?></h3>
                    <button type="button" class="cg-modal__close" data-action="close-modal">&times;</button>
                </div>
                <div class="cg-modal__body">
                    <div class="cg-export-options">
                        <button type="button" class="cg-btn cg-btn--block" data-action="export" data-format="png">
                            <strong><?php esc_html_e('PNG Image', 'citygrinder'); ?></strong>
                            <span><?php esc_html_e('High quality raster image', 'citygrinder'); ?></span>
                        </button>
                        <button type="button" class="cg-btn cg-btn--block" data-action="export" data-format="svg">
                            <strong><?php esc_html_e('SVG Vector', 'citygrinder'); ?></strong>
                            <span><?php esc_html_e('Scalable vector graphic', 'citygrinder'); ?></span>
                        </button>
                        <button type="button" class="cg-btn cg-btn--block" data-action="export" data-format="json">
                            <strong><?php esc_html_e('JSON Data', 'citygrinder'); ?></strong>
                            <span><?php esc_html_e('City data for backup/import', 'citygrinder'); ?></span>
                        </button>
                    </div>
                </div>
                <div class="cg-modal__footer">
                    <button type="button" class="cg-btn" data-action="close-modal">
                        <?php esc_html_e('Cancel', 'citygrinder'); ?>
                    </button>
                </div>
            </div>
        </div>
        <?php
    }
}
