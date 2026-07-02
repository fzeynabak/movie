<?php
/**
 * Admin Panel controls, style enqueuers and settings triggers
 * @package ParsTechMediaCenterSync
 */

defined('ABSPATH') || exit;

class ParsTechMediaCenter_Admin {

    private $plugin_url;
    private $plugin_path;

    public function __construct($plugin_url, $plugin_path) {
        $this->plugin_url = $plugin_url;
        $this->plugin_path = $plugin_path;

        add_action('admin_menu', array($this, 'register_admin_menu'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_custom_assets'));
    }

    /**
     * Creates custom WP Side menu entry
     */
    public function register_admin_menu() {
        add_menu_page(
            'پیش‌خوان مدیا سنتر پارس تک',
            'مدیا سنتر پارس تک',
            'manage_options',
            'parstech-mediacenter',
            array($this, 'render_dashboard_screen'),
            'dashicons-video-alt3',
            26
        );
    }

    /**
     * Enqueue beautiful stylesheet and uploader helper scripts
     */
    public function enqueue_custom_assets($hook) {
        // Only load on our custom plugin dashboard page to avoid conflicts with other plugins or themes
        if ($hook !== 'toplevel_page_parstech-mediacenter') {
            return;
        }

        // Native WordPress media uploader engine
        wp_enqueue_media();

        // Enqueue stylish custom Admin CSS file
        wp_enqueue_style(
            'parstech-mediacenter-admin-css',
            $this->plugin_url . 'admin/css/admin-style.css',
            array(),
            '1.0.0'
        );

        // Enqueue custom Admin JavaScript file
        wp_enqueue_script(
            'parstech-mediacenter-admin-js',
            $this->plugin_url . 'admin/js/admin-script.js',
            array('jquery'),
            '1.0.0',
            true
        );
    }

    /**
     * Processes settings write and renders partial template
     */
    public function render_dashboard_screen() {
        // Validate form submits and security nonces
        if (isset($_POST['mediacenter_update_submit']) && check_admin_referer('save_update_configs', 'mediacenter_nonce')) {
            update_option('mediacenter_latest_version', sanitize_text_field($_POST['latest_version']));
            update_option('mediacenter_download_url', esc_url_raw($_POST['download_url']));
            update_option('mediacenter_update_changelog', sanitize_textarea_field($_POST['update_changelog']));
            
            echo '<div class="notice notice-success is-dismissible" style="margin-right:0px; margin-top:20px;">
                    <p><strong>✓ تغییرات نگارش و بروزرسانی زیپ دسکتاپ با موفقیت در سراسر وب‌سایت توزیع و منتشر شد.</strong></p>
                  </div>';
        }

        // Include clean isolated markup
        include_once $this->plugin_path . 'admin/partials/dashboard-view.php';
    }
}
