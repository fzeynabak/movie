<?php
/**
 * Plugin Name: همگام‌ساز و مانیتورینگ اختصاصی مدیا سنتر پارس تک
 * Plugin URI: https://cofeclick.ir
 * Description: پلاگین مانیتورینگ فوق‌پیشرفته، ردیابی کلاینت‌های فعال، دریافت تلمتری ثبت‌نام‌ها و سیستم توزیع بروزرسانی یکپارچه مدیا سنتر.
 * Version: 1.1.0
 * Author: کافه کلیک & پارس تک
 * Author URI: https://cofeclick.ir
 * License: GPL2
 * Text Domain: parstech-mediacenter-sync
 * 
 * @package ParsTechMediaCenterSync
 */

defined('ABSPATH') || exit;

class ParsTechMediaCenterSyncCore {

    private static $instance = null;
    private $plugin_url;
    private $plugin_path;

    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        // Formulate paths and links
        $this->plugin_path = plugin_dir_path(__FILE__);
        $this->plugin_url  = plugin_dir_url(__FILE__);

        // Load modules
        $this->includes_files();
        $this->init_components();

        // Register activation hook
        register_activation_hook(__FILE__, array($this, 'run_plugin_activation'));
    }

    /**
     * Include clean modular logic files
     */
    private function includes_files() {
        require_once $this->plugin_path . 'includes/class-database.php';
        require_once $this->plugin_path . 'includes/class-api.php';
        require_once $this->plugin_path . 'admin/class-admin.php';
    }

    /**
     * Boot up the custom subsystems
     */
    private function init_components() {
        // Instantiate Database manager
        ParsTechMediaCenter_DB::get_instance();

        // Boot Rest Routes and endpoint telemetry interceptors
        new ParsTechMediaCenter_API();

        // Load Admin Menu logic
        if (is_admin()) {
            new ParsTechMediaCenter_Admin($this->plugin_url, $this->plugin_path);
        }
    }

    /**
     * Performs DB initialization and option pre-loads on activation
     */
    public function run_plugin_activation() {
        // Instantiate database tables setup
        $db = ParsTechMediaCenter_DB::get_instance();
        $db->create_schema();

        // Feed standard fallback mock values if nothing set to prevent empty responses
        if (!get_option('mediacenter_latest_version')) {
            update_option('mediacenter_latest_version', '1.1.0');
            update_option('mediacenter_download_url', 'https://cofeclick.ir/downloads/mediacenter-latest.zip');
            update_option('mediacenter_update_changelog', 'ارتقای کامل همگام‌سازی تلمتری با وب‌سایت، همگام‌سازی آمار فیلم‌ها و بهینه‌سازی فرمت بارگذاری تصاویر پوستر.');
        }
    }
}

// Initialise the WordPress Plugin Bootstrap
ParsTechMediaCenterSyncCore::get_instance();
