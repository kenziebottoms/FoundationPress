<?php
/**
 * The main template file
 *
 * This is the most generic template file in a WordPress theme
 * and one of the two required files for a theme (the other being style.css).
 * It is used to display a page when nothing more specific matches a query.
 * e.g., it puts together the home page when no home.php file exists.
 *
 * Learn more: {@link https://codex.wordpress.org/Template_Hierarchy}
 *
 * @package FoundationPress
 * @since FoundationPress 1.0.0
 */

get_header();
get_template_part( 'template-parts/featured-image' ); ?>

<div id="page-full-width" role="main">
    <article class="main-content links">
    <?php if ( have_posts() ) : ?>

        <?php /* Start the Loop */ ?>
        <?php while ( have_posts() ) : the_post(); ?>
            <div id="post-<?php the_ID(); ?>" <?php post_class('blogpost-entry'); ?>>
                <header>
                    <h2><a href="<?php the_field('link'); ?>" target="blank"><?php the_title(); ?> <i class="material-icons md-36">open_in_new</i></a></h2>
                    <date><?php the_date(); ?></date>
                </header>
                <div class="entry-content">
                    <?php the_content( __( 'Continue reading...', 'foundationpress' ) ); ?>
                </div>
                <footer>
                    <?php $tag = get_the_tags(); if ( $tag ) { ?><p><?php the_tags(); ?></p><?php } ?>
                </footer>
                <hr />
            </div>
        <?php endwhile; ?>

        <?php else : ?>
            <?php get_template_part( 'template-parts/content', 'none' ); ?>

        <?php endif; // End have_posts() check. ?>

        <?php /* Display navigation to next/previous pages when applicable */ ?>
        <?php
        if ( function_exists( 'foundationpress_pagination' ) ) :
            foundationpress_pagination();
        elseif ( is_paged() ) :
        ?>
            <nav id="post-nav">
                <div class="post-previous"><?php next_posts_link( __( '&larr; Older posts', 'foundationpress' ) ); ?></div>
                <div class="post-next"><?php previous_posts_link( __( 'Newer posts &rarr;', 'foundationpress' ) ); ?></div>
            </nav>
        <?php endif; ?>

    </article>

</div>

<?php get_footer();
