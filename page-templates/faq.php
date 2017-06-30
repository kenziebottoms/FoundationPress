<?php
/*
Template Name: FAQ
*/
get_header(); ?>

<?php get_template_part( 'template-parts/featured-image' ); ?>

<div id="page-full-width" class="faq" role="main">
  <?php echo $post->post_content; ?>
  <article <?php post_class('main-content') ?> id="post-<?php the_ID(); ?>">
<?php do_action( 'foundationpress_before_content' ); ?>
<?php $query = new WP_Query(array('post_type' => 'faq')); ?>
<?php while ( $query->have_posts() ) : $query->the_post(); ?>
    <h4>
      <a href="#<?php echo $post->post_name; ?>">
        <?php the_title(); ?>
      </a>
    </h4>
<?php endwhile; ?>
<hr/>
<?php while ( $query->have_posts() ) : $query->the_post(); ?>
      <h3 class="q">Q:</h3>
      <h3><?php the_title(); ?></h3>
      <h3 class="a">A:</h3>
      <div id="<?php echo $post->post_name; ?>" class="entry-content">
          <?php the_content(); ?>
      </div>
      <footer>
          <?php wp_link_pages( array('before' => '<nav id="page-nav"><p>' . __( 'Pages:', 'foundationpress' ), 'after' => '</p></nav>' ) ); ?>
          <p><?php the_tags(); ?></p>
      </footer>
      <?php do_action( 'foundationpress_page_before_comments' ); ?>
      <?php comments_template(); ?>
      <?php do_action( 'foundationpress_page_after_comments' ); ?>
<?php endwhile;?>
  </article>

<?php do_action( 'foundationpress_after_content' ); ?>

</div>

<?php get_footer();
