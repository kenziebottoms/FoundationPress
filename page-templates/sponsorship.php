<?php
/*
Template Name: Sponsorship
*/
get_header(); ?>

<?php get_template_part( 'template-parts/featured-image' ); ?>

<div id="page-sidebar-right" class="sponsorship">

<?php do_action( 'foundationpress_before_content' ); ?>
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

<?php do_action( 'foundationpress_after_content' ); ?>
<hr/>
</div>
<div id="sponsorship">
  <h3>Our Sponsors</h3>
  <?php $query = new WP_Query(array('post_type' => 'sponsor')); ?>
  <?php while ($query->have_posts()) : $query->the_post(); ?>
    <div class="sponsor">
      <a href="<?php the_field('website'); ?>" target="_blank">
        <?php the_post_thumbnail(); ?>
      </a>
      <a href="<?php the_field('website'); ?>" target="_blank">
        <?php the_title(); ?>
      </a>
    </div>
  <?php endwhile; ?>
</div>
<div class="clearfix"></div>

<?php get_footer();
