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
    <article class="main-content members archive">
        <?php $posts = get_posts(array(
            'post_type'         => 'members',
            'posts_per_page'    => -1,
            'meta_key'          => 'level',
            'orderby'           => array(
                'meta_value' => 'ASC',
                'title' => 'ASC',
            ),
        )); ?>
    <?php if ( $posts ) : ?>

        <?php /* Start the Loop */ ?>
        <?php foreach ( $posts as $post ) : ?>
            <div class="large-6 medium-6 small-12 columns member">
                <a href="<?php the_permalink(); ?>">
                    <?php the_post_thumbnail('square'); ?>
                </a>
                <h3><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h3>
                <strong>
                    <?php $exp = get_field('level');
                    if ($exp == '0') { echo get_field('position_title'); }
                    else if ($exp == '1') { echo "Master"; }
                    else if ($exp == '2') { echo "Knight"; }
                    else if ($exp == '3') { echo "Padawan"; }
                    else if ($exp == '4') { echo "Youngling"; }
                    else { echo $exp; } ?>
                </strong>
                <p>
                    <?php the_field('areas_of_expertise'); ?>
                </p>
            </div>
        <?php endforeach; ?>

        <?php else : ?>
            <?php get_template_part( 'template-parts/content', 'none' ); ?>

        <?php endif; // End have_posts() check. ?>


    </article>

</div>

<?php get_footer();
