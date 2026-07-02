<?php
/**
 * Database setups and records manager for ParsTech MediaCenter
 * @package ParsTechMediaCenterSync
 */

defined('ABSPATH') || exit;

class ParsTechMediaCenter_DB {

    private static $instance = null;
    private $table_name;
    private $tickets_table;

    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public function __construct() {
        global $wpdb;
        $this->table_name = $wpdb->prefix . 'mediacenter_clients';
        $this->tickets_table = $wpdb->prefix . 'mediacenter_tickets';
    }

    public function get_table_name() {
        return $this->table_name;
    }

    public function get_tickets_table() {
        return $this->tickets_table;
    }

    /**
     * Set up custom relational schema during plugin activation
     */
    public function create_schema() {
        global $wpdb;
        $charset_collate = $wpdb->get_charset_collate();

        // 1. Clients active instances table
        $sql1 = "CREATE TABLE {$this->table_name} (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            client_id varchar(100) NOT NULL UNIQUE,
            full_name varchar(255) NOT NULL,
            shop_name varchar(255) DEFAULT '',
            phone varchar(50) DEFAULT '',
            phone_secondary varchar(50) DEFAULT '',
            email varchar(255) DEFAULT '',
            app_version varchar(50) DEFAULT '1.0.0',
            total_movies int(11) DEFAULT 0,
            total_series int(11) DEFAULT 0,
            total_sales int(11) DEFAULT 0,
            os_platform varchar(100) DEFAULT '',
            registered_at datetime DEFAULT NULL,
            last_heartbeat datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id)
        ) {$charset_collate};";

        // 2. Custom online helpdesk support tickets table
        $sql2 = "CREATE TABLE {$this->tickets_table} (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            client_id varchar(100) NOT NULL,
            full_name varchar(255) NOT NULL,
            subject varchar(255) NOT NULL,
            message_type varchar(50) NOT NULL,
            message text NOT NULL,
            reply text DEFAULT '',
            status varchar(30) DEFAULT 'pending',
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            replied_at datetime DEFAULT NULL,
            PRIMARY KEY (id)
        ) {$charset_collate};";

        require_once ABSPATH . 'wp-admin/includes/upgrade.php';
        dbDelta($sql1);
        dbDelta($sql2);
    }

    /**
     * Stores a new support ticket submitted from client
     */
    public function save_ticket($data) {
        global $wpdb;

        $client_id = isset($data['clientId']) ? sanitize_text_field($data['clientId']) : '';
        $full_name = isset($data['fullName']) ? sanitize_text_field($data['fullName']) : 'کاربر ناشناس';
        $subject = isset($data['subject']) ? sanitize_text_field($data['subject']) : 'بدون موضوع';
        $message_type = isset($data['messageType']) ? sanitize_text_field($data['messageType']) : 'other';
        $message = isset($data['message']) ? sanitize_textarea_field($data['message']) : '';

        if (empty($client_id) || empty($message)) {
            return false;
        }

        return $wpdb->insert(
            $this->tickets_table,
            array(
                'client_id' => $client_id,
                'full_name' => $full_name,
                'subject' => $subject,
                'message_type' => $message_type,
                'message' => $message,
                'reply' => '',
                'status' => 'pending',
                'created_at' => current_time('mysql'),
                'replied_at' => null
            )
        );
    }

    /**
     * Answers an active ticket (sets reply text and status to answered)
     */
    public function reply_to_ticket($ticket_id, $reply_content) {
        global $wpdb;
        return $wpdb->update(
            $this->tickets_table,
            array(
                'reply' => sanitize_textarea_field($reply_content),
                'status' => 'answered',
                'replied_at' => current_time('mysql')
            ),
            array('id' => intval($ticket_id))
        );
    }

    /**
     * Fetch support tickets list for specific Client ID
     */
    public function get_client_tickets($client_id) {
        global $wpdb;
        return $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM {$this->tickets_table} WHERE client_id = %s ORDER BY created_at DESC", 
            $client_id
        ));
    }

    /**
     * Fetch all submitted support tickets
     */
    public function get_all_tickets() {
        global $wpdb;
        return $wpdb->get_results("SELECT * FROM {$this->tickets_table} ORDER BY created_at DESC");
    }

    /**
     * Dynamic store of heartbeat telemetry signal
     */
    public function save_client($data) {
        global $wpdb;

        $client_id = isset($data['clientId']) ? sanitize_text_field($data['clientId']) : '';
        if (empty($client_id)) {
            return false;
        }

        $full_name = isset($data['fullName']) ? sanitize_text_field($data['fullName']) : 'ثبت نشده';
        $shop_name = isset($data['shopName']) ? sanitize_text_field($data['shopName']) : '';
        $phone = isset($data['phone']) ? sanitize_text_field($data['phone']) : '';
        $phone_secondary = isset($data['phoneSecondary']) ? sanitize_text_field($data['phoneSecondary']) : '';
        $email = isset($data['email']) ? sanitize_email($data['email']) : '';
        $app_version = isset($data['appVersion']) ? sanitize_text_field($data['appVersion']) : '1.0.1';
        $total_movies = isset($data['totalMovies']) ? intval($data['totalMovies']) : 0;
        $total_series = isset($data['totalSeries']) ? intval($data['totalSeries']) : 0;
        $total_sales = isset($data['totalSales']) ? intval($data['totalSales']) : 0;
        $os_platform = isset($data['osPlatform']) ? sanitize_text_field($data['osPlatform']) : '';

        $existing = $wpdb->get_row($wpdb->prepare("SELECT id FROM {$this->table_name} WHERE client_id = %s", $client_id));

        if ($existing) {
            return $wpdb->update(
                $this->table_name,
                array(
                    'full_name' => $full_name,
                    'shop_name' => $shop_name,
                    'phone' => $phone,
                    'phone_secondary' => $phone_secondary,
                    'email' => $email,
                    'app_version' => $app_version,
                    'total_movies' => $total_movies,
                    'total_series' => $total_series,
                    'total_sales' => $total_sales,
                    'os_platform' => $os_platform,
                    'last_heartbeat' => current_time('mysql'),
                ),
                array('client_id' => $client_id)
            );
        } else {
            return $wpdb->insert(
                $this->table_name,
                array(
                    'client_id' => $client_id,
                    'full_name' => $full_name,
                    'shop_name' => $shop_name,
                    'phone' => $phone,
                    'phone_secondary' => $phone_secondary,
                    'email' => $email,
                    'app_version' => $app_version,
                    'total_movies' => $total_movies,
                    'total_series' => $total_series,
                    'total_sales' => $total_sales,
                    'os_platform' => $os_platform,
                    'registered_at' => current_time('mysql'),
                    'last_heartbeat' => current_time('mysql'),
                )
            );
        }
    }

    /**
     * Get all synced installations
     */
    public function get_all_clients() {
        global $wpdb;
        return $wpdb->get_results("SELECT * FROM {$this->table_name} ORDER BY last_heartbeat DESC");
    }
}
