<?php
// If a featured image is set, insert into layout and use Interchange
// to select the optimal image size per named media query.
if ( has_post_thumbnail( $post->ID ) && !is_archive() && ($post->post_type != 'members') ) { 
    $id = $post->ID;
} else {
    $home = get_page_by_path('make-nashville');
    if ($home) { $id = $home->ID; }
} ?>

    <header id="featured-hero" role="banner" data-interchange="[<?php echo get_the_post_thumbnail_url($id, 'featured-small'); ?>, small], [<?php echo get_the_post_thumbnail_url($id, 'featured-medium'); ?>, medium], [<?php echo get_the_post_thumbnail_url($id, 'featured-large'); ?>, large], [<?php echo get_the_post_thumbnail_url($id, 'featured-xlarge'); ?>, xlarge]">
        <div class="overlay">
            <div class="chaperone">
                <?php the_custom_logo(); ?>
            </div>

            <div class="bottom-menus">
                <div class="left">
                    <?php wp_nav_menu(array('theme_location' => 'bottom_left')); ?>
                </div>
                <div class="right">
                    <?php wp_nav_menu(array('theme_location' => 'bottom_right')); ?>
                </div>
            </div>
        </div>
    </header>
<?php 