<?php 
function mn_register_settings() {
    register_setting( 'mn_theme_options', 'mn_options', 'mn_validate_options' );
}

add_action( 'admin_init', 'mn_register_settings' );