<?php
/*
Template Name: Full Width
*/
get_header(); ?>

<?php get_template_part( 'template-parts/featured-image' ); ?>

<div id="page-full-width" class="not-found" role="main">

<?php do_action( 'foundationpress_before_content' ); ?>
  <article <?php post_class('main-content') ?> id="post-<?php the_ID(); ?>">
      <?php do_action( 'foundationpress_page_before_entry_content' ); ?>
      <div class="entry-content">
		  <div class="callout alert">
			  <strong>Uh-oh! The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.</strong>
		  </div>
		  <div class="focus">
			<img class="wp-image-1078 alignright" src="http://makenashville.org/wp-content/uploads/2017/10/Screenshot-2017-10-30-15.33.10-300x262.png" alt="" width="369" height="309" />

			Please try the following:
			<ul>
				<li>Check your spelling</li>
				<li><a href="/">Return to the home page</a></li>
				<li>Click the Back button</li>
				<li><a href="mailto:info@makenashville.org">Email the admin</a> if something seems wrong</li>
			</ul>
		</div>
      </div>
  </article>

<?php do_action( 'foundationpress_after_content' ); ?>

</div>

<?php get_footer();
