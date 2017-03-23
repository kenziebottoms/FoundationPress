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
				<?php dynamic_sidebar( 'footer-widgets' ); ?>
				<ul id="social">
					<?php $fb = get_option('facebook');
					$insta = get_option('instagram');
					$tw = get_option('twitter'); ?>
					<?php if ($fb != '') { ?>
						<li>
							<a target="blank" href='<?php echo $fb; ?>'>
								<img src="<?php echo get_stylesheet_directory_uri(); ?>/assets/images/icons/fb.png" />
							</a>
						</li>
					<?php } ?>
					<?php if ($tw != '') { ?>
						<li>
							<a target="blank" href='<?php echo $tw; ?>'>
								<img src="<?php echo get_stylesheet_directory_uri(); ?>/assets/images/icons/tw.png" />
							</a>
						</li>
					<?php } ?>
					<?php if ($insta != '') { ?>
						<li>
							<a target="blank" href='<?php echo $insta; ?>'>
								<img src="<?php echo get_stylesheet_directory_uri(); ?>/assets/images/icons/insta.png" />
							</a>
						</li>
					<?php } ?>
				</ul>
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
