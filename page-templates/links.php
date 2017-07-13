<?php
/*
Template Name: Links
*/
get_header();
get_template_part( 'template-parts/featured-image' ); ?>

<div id="page-full-width" role="main">
    <?php while ( have_posts() ) : the_post(); ?>
      <article <?php post_class('main-content') ?> id="post-<?php the_ID(); ?>">
          <?php do_action( 'foundationpress_page_before_entry_content' ); ?>
          <div class="entry-content">
              <?php the_content(); ?>
          </div>
          <footer>
              <?php wp_link_pages( array('before' => '<nav id="page-nav"><p>' . __( 'Pages:', 'foundationpress' ), 'after' => '</p></nav>' ) ); ?>
              <p><?php the_tags(); ?></p>
          </footer>
      </article>
    <?php endwhile;?>
    <hr/>
    <article class="links">
    <?php $posts = new WP_Query(array('post_type' => 'link')); ?>
    <?php if ( $posts->have_posts() ) : ?>

        <?php /* Start the Loop */ ?>
        <?php while ( $posts->have_posts() ) : $posts->the_post(); ?>
            <div id="post-<?php the_ID(); ?>" <?php post_class('blogpost-entry'); ?>>
                <header>
                    <h3><a href="<?php the_field('link'); ?>" target="blank"><?php the_title(); ?> <i class="material-icons md-36">open_in_new</i></a></h3>
                    <date>
                        <?php if (get_field('site_name') != '') {
                            the_field('site_name');
                            echo "&nbsp;&nbsp;|&nbsp;";
                        } ?>
                        <?php the_date(); ?>
                    </date>
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
