<?php
/**
 * REST API Endpoints routing and authorization checks
 * @package ParsTechMediaCenterSync
 */

defined('ABSPATH') || exit;

class ParsTechMediaCenter_API {

    private $db;

    public function __construct() {
        $this->db = ParsTechMediaCenter_DB::get_instance();
        add_action('rest_api_init', array($this, 'register_endpoints'));
        add_action('wp_ajax_nopriv_mediacenter_telemetry', array($this, 'legacy_ajax_fallback'));
        add_action('wp_ajax_mediacenter_telemetry', array($this, 'legacy_ajax_fallback'));
    }

    /**
     * Map WordPress routes: cofeclick.ir/wp-json/parstech-mediacenter/v1/telemetry
     */
    public function register_endpoints() {
        register_rest_route('parstech-mediacenter/v1', '/telemetry', array(
            'methods' => 'POST',
            'callback' => array($this, 'incoming_telemetry_webhook'),
            'permission_callback' => '__return_true', // Public receiver so applets can synchronize securely
        ));

        // Submit new support ticket
        register_rest_route('parstech-mediacenter/v1', '/tickets', array(
            'methods' => 'POST',
            'callback' => array($this, 'submit_ticket_endpoint'),
            'permission_callback' => '__return_true',
        ));

        // Retrieve support tickets list
        register_rest_route('parstech-mediacenter/v1', '/tickets', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_tickets_endpoint'),
            'permission_callback' => '__return_true',
        ));
    }

    /**
     * Handle support ticket submission
     */
    public function submit_ticket_endpoint($request) {
        $params = $request->get_json_params();
        if (empty($params)) {
            $params = $request->get_params(); // Query String fallback
        }

        $success = $this->db->save_ticket($params);

        if ($success) {
            return new WP_REST_Response(array(
                'success' => true,
                'message' => 'تیکت شما با موفقیت در سیستم پشتیبانی ثبت گردید کانت ایندکس.'
            ), 200);
        } else {
            return new WP_REST_Response(array(
                'success' => false,
                'message' => 'ارسال تیکت ناموفق بود. داده‌های ارسالی ناقص هستند.'
            ), 400);
        }
    }

    /**
     * Handle support tickets listing
     */
    public function get_tickets_endpoint($request) {
        $client_id = $request->get_param('client_id');
        
        if (empty($client_id)) {
            return new WP_REST_Response(array(
                'success' => false,
                'message' => 'شناسه کلاینت الزامی است.'
            ), 400);
        }

        $tickets = $this->db->get_client_tickets($client_id);
        
        // Format items to match target TypeScript interfaces
        $formatted_tickets = array();
        foreach($tickets as $t) {
            $formatted_tickets[] = array(
                'id' => intval($t->id),
                'clientId' => $t->client_id,
                'fullName' => $t->full_name,
                'subject' => $t->subject,
                'messageType' => $t->message_type,
                'message' => $t->message,
                'reply' => $t->reply,
                'status' => $t->status,
                'createdAt' => $t->created_at,
                'repliedAt' => $t->replied_at
            );
        }

        return new WP_REST_Response(array(
            'success' => true,
            'tickets' => $formatted_tickets
        ), 200);
    }

    /**
     * Processes incoming REST request payloads from React
     */
    public function incoming_telemetry_webhook($request) {
        $params = $request->get_json_params();
        if (empty($params)) {
            $params = $request->get_params(); // Query String fallback
        }

        $response = $this->store_and_prepare_response($params);
        return new WP_REST_Response($response, 200);
    }

    /**
     * Traditional WP admin-ajax.php caller for absolute backwards-compatibility
     */
    public function legacy_ajax_fallback() {
        $response = $this->store_and_prepare_response($_POST);
        wp_send_json($response);
    }

    /**
     * Processes telemetry write and provides current update details
     */
    private function store_and_prepare_response($data) {
        if (!empty($data)) {
            $this->db->save_client($data);
        }

        // Return latest version specifications from database options
        return array(
            'success' => true,
            'message' => 'ارتباط با موفقیت برقرار شد.',
            'latestVersion' => get_option('mediacenter_latest_version', '1.1.0'),
            'downloadUrl' => get_option('mediacenter_download_url', 'https://cofeclick.ir/downloads/mediacenter-latest.zip'),
            'changelog' => get_option('mediacenter_update_changelog', 'افزودن امکان پایش زنده و رفع تداخلات لود پوسترهای PNG/WEBP.')
        );
    }
}
