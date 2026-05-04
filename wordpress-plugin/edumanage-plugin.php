<?php
/**
 * Plugin Name: EduManage Integration
 * Description: Plugin para integrar la plataforma de servicios académicos EduManage (FastAPI backend).
 * Version: 1.0.0
 * Author: Augusto Acuña
 */

if (!defined('ABSPATH')) {
    exit; // Salir si se accede directamente
}

class EduManagePlugin {
    
    public function __construct() {
        // Registrar scripts y estilos
        add_action('wp_enqueue_scripts', array($this, 'enqueue_assets'));
        // Registrar shortcode
        add_shortcode('edumanage_checkout', array($this, 'render_checkout_form'));
    }

    public function enqueue_assets() {
        wp_enqueue_style('edumanage-style', plugin_dir_url(__FILE__) . 'assets/css/style.css');
        wp_enqueue_script('edumanage-script', plugin_dir_url(__FILE__) . 'assets/js/script.js', array(), '1.0.0', true);
        
        // Pasar la URL de la API al frontend JS
        wp_localize_script('edumanage-script', 'edumanage_settings', array(
            'api_url' => 'http://localhost:8001/api/v1'
        ));
    }

    public function render_checkout_form($atts) {
        ob_start();
        ?>
        <div class="edumanage-container" id="edumanage-app">
            <h3>Solicitar Servicio Académico</h3>
            <form id="edumanage-form">
                <div class="form-group">
                    <label>Nombre:</label>
                    <input type="text" id="em-first-name" required>
                </div>
                <div class="form-group">
                    <label>Apellido:</label>
                    <input type="text" id="em-last-name" required>
                </div>
                <div class="form-group">
                    <label>Email:</label>
                    <input type="email" id="em-email" required>
                </div>
                <div class="form-group">
                    <label>Servicio:</label>
                    <select id="em-service" required>
                        <option value="">Cargando servicios...</option>
                    </select>
                </div>
                <button type="submit" id="em-submit-btn">Generar Pedido y Pagar</button>
                <div id="em-message"></div>
            </form>
        </div>
        <?php
        return ob_get_clean();
    }
}

new EduManagePlugin();
