<?php
/**
 * The template for displaying the footer
 *
 * Contains the closing of the "off-canvas-wrap" div and all content after.
 *
 * @package FoundationPress
 * @since FoundationPress 1.0.0
 */

?>

		</section>
		<div id="footer-container" class="row">
			<div class="large-6 medium-6 small-12 columns">
				<?php $fb = get_option('facebook');
				$insta = get_option('instagram');
				$tw = get_option('twitter'); ?>
				<?php if ($fb != '') { ?>
					<a href='<?php echo $fb; ?>'>Facebook</a>
				<?php } ?>
				<?php dynamic_sidebar( 'footer-widgets' ); ?>
			</div>
			<div class="large-6 medium-6 small-12 columns">
				<?php dynamic_sidebar( 'map' ); ?>
			</div>
		</div>

		<?php do_action( 'foundationpress_layout_end' ); ?>

<?php if ( get_theme_mod( 'wpt_mobile_menu_layout' ) === 'offcanvas' ) : ?>
		</div><!-- Close off-canvas wrapper inner -->
	</div><!-- Close off-canvas wrapper -->
</div><!-- Close off-canvas content wrapper -->
<?php endif; ?>


<?php wp_footer(); ?>
<?php do_action( 'foundationpress_before_closing_body' ); ?>
</body>
</html>
