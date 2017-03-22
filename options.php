<?php

add_action('admin_init', 'theme_options_init');
add_action( 'admin_menu', 'theme_options_add_page' ); 

function theme_options_init() {
    register_setting( 'sample_options', 'sample_theme_options');
} 

function theme_options_add_page() {
    add_theme_page( __( 'Theme Options', 'makenash' ), __( 'Theme Options', 'makenash' ), 'edit_theme_options', 'theme_options', 'theme_options_do_page' );
} 
function theme_options_do_page() {
    global $select_options;
    if (! isset( $_REQUEST['settings-updated'])) {
        $_REQUEST['settings-updated'] = false;
    }
}

