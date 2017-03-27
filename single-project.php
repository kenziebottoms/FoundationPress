<?php
/**
 * The template for displaying all single projects
 *
 * @package FoundationPress
 * @since FoundationPress 1.0.0
 */

get_header(); ?>

<?php get_template_part( 'template-parts/featured-image' ); ?>

<div id="page-full-width" class="project" role="main">
    <div class="breadcrumbs" typeof="BreadcrumbList" vocab="https://schema.org/">
        <?php if(function_exists('bcn_display'))
        {
            bcn_display();
        }?>
    </div>

<?php do_action( 'foundationpress_before_content' ); ?>
<?php while ( have_posts() ) : the_post(); ?>
    <article <?php post_class('main-content') ?> id="post-<?php the_ID(); ?>">
        <h1 class="entry-title">
            <?php the_title(); ?>
            <?php if (get_field('email') != '') { ?>
                <a href="mailto:<?php the_field('email'); ?>">&nbsp;<i class="material-icons md-36">mail_outline</i></a>
            <?php } ?>
        </h1>
        <div class="entry-content">
            <?php the_post_thumbnail('large'); ?>
            <?php the_content(); ?>
            <?php edit_post_link( __( 'Edit', 'foundationpress' ), '<span class="edit-link">', '</span>' ); ?>
        </div>
    </article>
<?php endwhile;?>

<?php do_action( 'foundationpress_after_content' ); ?>
</div>
<?php get_footer();
