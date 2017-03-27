<?php
/**
 * The template for displaying archive pages
 *
 * Used to display archive-type pages if nothing more specific matches a query.
 * For example, puts together date-based pages if no date.php file exists.
 *
 * If you'd like to further customize these archive views, you may create a
 * new template file for each one. For example, tag.php (Tag archives),
 * category.php (Category archives), author.php (Author archives), etc.
 *
 * @link https://codex.wordpress.org/Template_Hierarchy
 *
 * @package FoundationPress
 * @since FoundationPress 1.0.0
 */

get_header();

get_template_part( 'template-parts/featured-image' ); ?>

<div id="page-full-width" role="main">
    <div class="breadcrumbs" typeof="BreadcrumbList" vocab="https://schema.org/">
        <?php if(function_exists('bcn_display'))
        {
            bcn_display();
        }?>
    </div>
    <article class="main-content projects archive">
    <?php if ( have_posts() ) : ?>

        <?php /* Start the Loop */ ?>
        <?php while ( have_posts() ) : the_post(); ?>
            <div class="large-3 medium-4 small-12 columns project">
                <a href="<?php the_permalink(); ?>">
                    <?php the_post_thumbnail('square'); ?>
                </a>
                <h3><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h3>
                <?php $members = get_field('makers');
                if ($members && sizeOf($members) > 1) {
                    foreach($members as $member) {
                        echo '<p class="maker">' . $member->post_title . '</p>';
                    }
                } else if ($members && sizeOf($members) == 1) {
                    echo '<p class="maker">' . $members[0]->post_title . '</p>';
                } ?>
                <p>
                    <?php the_field('areas_of_expertise'); ?>
                </p>
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
