<?php
/**
 * The template for displaying all single members
 *
 * @package FoundationPress
 * @since FoundationPress 1.0.0
 */

get_header(); ?>

<?php get_template_part( 'template-parts/featured-image' ); ?>

<div id="page-full-width" class="member" role="main">
    <div class="breadcrumbs" typeof="BreadcrumbList" vocab="https://schema.org/">
        <?php if(function_exists('bcn_display'))
        {
            bcn_display();
        }?>
    </div>

<?php do_action( 'foundationpress_before_content' ); ?>
<?php while ( have_posts() ) : the_post(); ?>
    <article <?php post_class('main-content') ?> id="post-<?php the_ID(); ?>">
        <div class="large-4 medium-6 small-12 columns right">
            <?php the_post_thumbnail('square'); ?>
            <?php $terms = wp_get_post_terms(get_the_ID(), "office", array("fields" => "all")); 
            if (get_field("level") == 0) {
                echo "<p><strong>" . get_field("position_title") . "</strong></p>";
            }
            foreach ($terms as $term) {
                if ($term->name == "Board Members") {
                    echo "<p><strong>Board Member</strong></p>";
                }
            }
            foreach ($terms as $term) {
                if ($term->name == "Shop Captains") {
                    echo "<strong>Shop Captain</strong> of " . get_field('shop') . "<br/>";
                }
                if ($term->name == "Teachers") {
                    echo "<strong>Teacher</strong> of " . get_field('subjects') . "<br/>";
                }
            } ?>
        </div>
        <h1 class="entry-title">
            <?php the_title(); ?>
            <?php if (get_field('email') != '') { ?>
                <a href="mailto:<?php the_field('email'); ?>">&nbsp;<i class="material-icons md-36">mail_outline</i></a>
            <?php } ?>
            <h4><?php the_field('areas_of_expertise'); ?></h4>
        </h1>
        <div class="entry-content">
            <?php the_content(); ?>
            <?php edit_post_link( __( 'Edit', 'foundationpress' ), '<span class="edit-link">', '</span>' ); ?>
        </div>
    </article>
<?php endwhile;?>

<?php do_action( 'foundationpress_after_content' ); ?>
</div>
<?php get_footer();
