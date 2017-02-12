<?php
// If a featured image is set, insert into layout and use Interchange
// to select the optimal image size per named media query.
if ( has_post_thumbnail( $post->ID ) ) { 
    $id = $post->ID;
} else {
    $home = get_page_by_path('learn-stuff-build-things');
    $id = $home->ID;
} ?>

    <header id="featured-hero" role="banner" data-interchange="[<?php echo get_the_post_thumbnail_url($id, 'featured-small'); ?>, small], [<?php echo get_the_post_thumbnail_url($id, 'featured-medium'); ?>, medium], [<?php echo get_the_post_thumbnail_url($id, 'featured-large'); ?>, large], [<?php echo get_the_post_thumbnail_url($id, 'featured-xlarge'); ?>, xlarge]">
        <div class="overlay">
            <div class="chaperone">
                <?php the_custom_logo(); ?>
            </div>
        </div>
    </header>
<?php 