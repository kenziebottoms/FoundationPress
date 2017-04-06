<?php
/**
 * Author: Ole Fredrik Lie
 * URL: http://olefredrik.com
 *
 * FoundationPress functions and definitions
 *
 * Set up the theme and provides some helper functions, which are used in the
 * theme as custom template tags. Others are attached to action and filter
 * hooks in WordPress to change core functionality.
 *
 * @link https://codex.wordpress.org/Theme_Development
 * @package FoundationPress
 * @since FoundationPress 1.0.0
 */

/** Various clean up functions */
require_once( 'library/cleanup.php' );

/** Required for Foundation to work properly */
require_once( 'library/foundation.php' );

/** Register all navigation menus */
require_once( 'library/navigation.php' );

/** Add menu walkers for top-bar and off-canvas */
require_once( 'library/menu-walkers.php' );

/** Create widget areas in sidebar and footer */
require_once( 'library/widget-areas.php' );

/** Return entry meta information for posts */
require_once( 'library/entry-meta.php' );

/** Enqueue scripts */
require_once( 'library/enqueue-scripts.php' );

/** Add theme support */
require_once( 'library/theme-support.php' );

/** Add Nav Options to Customer */
require_once( 'library/custom-nav.php' );

/** Change WP's sticky post class */
require_once( 'library/sticky-posts.php' );

/** Configure responsive image sizes */
require_once( 'library/responsive-images.php' );

/** If your site requires protocol relative url's for theme assets, uncomment the line below */
// require_once( 'library/protocol-relative-theme-assets.php' );

add_theme_support( 'custom-logo', array() );

register_nav_menus( array(
    'top_left' => 'Top Left',
    'bottom_left' => 'Bottom Left',
    'bottom_right' => 'Bottom Right',
) );

add_image_size('square', 400, 400, true);
function my_custom_sizes($sizes) {
    return array_merge($sizes, array(
        'square' => __('Square'),
    ));
}
add_filter('image_size_names_choose', 'my_custom_sizes');

/** settings page */
function mn_register_settings() {
    register_setting( 'mn', 'facebook' );
    register_setting( 'mn', 'twitter' );
    register_setting( 'mn', 'instagram' );
    register_setting( 'mn', 'address1' );
    register_setting( 'mn', 'address2' );
    register_setting( 'mn', 'maps_link' );
    register_setting( 'mn', 'phone' );
}

add_action( 'admin_init', 'mn_register_settings' );

function mn_theme_options() {
    add_theme_page('Theme Options', 'Theme Options', 'edit_theme_options', 'theme_options', 'mn_theme_options_page');
}

add_action('admin_menu', 'mn_theme_options');

function mn_theme_options_page() {
    if (!isset($_REQUEST['updated'])) {
        $_REQUEST['updated'] = false;
    } ?>
    <div class='wrap'>
        <?php screen_icon(); ?>
        <h2>Make Nashville Theme Options</h2>
        <form method="post" action="options.php">
            <h3>Contact Info</h3>
            <?php settings_fields('mn');
            do_settings_sections('mn'); ?>
            <table class="form-table">
                <tr>
                    <th>Address Line 1</th>
                    <td>
                        <input type='text' name='address1' value='<?php echo esc_attr(get_option('address1')); ?>' />
                    </td>
                </tr>
                <tr>
                    <th>Address Line 2</th>
                    <td>
                        <input type='text' name='address2' value='<?php echo esc_attr(get_option('address2')); ?>' />
                    </td>
                </tr>
                <tr>
                    <th>Google Maps Link</th>
                    <td>
                        <input type='text' name='maps_link' value='<?php echo esc_attr(get_option('maps_link')); ?>' />
                    </td>
                </tr>
                <tr>
                    <th>Phone Number (no link)</th>
                    <td>
                        <input type='text' name='phone' value='<?php echo esc_attr(get_option('phone')); ?>' />
                    </td>
                </tr>
            </table>
            <h3>Social Links</h3>
            <table class="form-table">
                <tr>
                    <th>Facebook</th>
                    <td>
                        <input type='text' name='facebook' value='<?php echo esc_attr(get_option('facebook')); ?>' />
                    </td>
                </tr>
                <tr>
                    <th>Instagram</th>
                    <td>
                        <input type='text' name='instagram' value='<?php echo esc_attr(get_option('instagram')); ?>' />
                    </td>
                </tr>
                <tr>
                    <th>Twitter</th>
                    <td>
                        <input type='text' name='twitter' value='<?php echo esc_attr(get_option('twitter')); ?>' />
                    </td>
                </tr>
            </table>
            <?php submit_button(); ?>
        </form>
    </div>
<?php }