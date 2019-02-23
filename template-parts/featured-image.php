<?php
// If a featured image is set, insert into layout and use Interchange
// to select the optimal image size per named media query.
if ( has_post_thumbnail( $post->ID ) && is_page() && !is_archive()) { 
    $id = $post->ID;
} else {
    $home = get_page_by_title('Make Nashville');
    if ($home) { $id = $home->ID; }
} ?>
    <header id="featured-hero">
        <div class="overlay">
        </div>
    </header>
<?php 