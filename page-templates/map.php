<?php
/*
Template Name: Map
*/
get_header(); ?>

<?php get_template_part( 'template-parts/featured-image' ); ?>

<div id="page-full-width" class="faq" role="main">
  <?php echo $post->post_content; ?>
  <article <?php post_class('main-content') ?> id="post-<?php the_ID(); ?>">
    <div id="map">
    </div>
  </article>

  <script type='text/javascript'>
    function initMap() {  
      var latLng = {lat: 36.176578, lng: -86.753180};
      var map = new google.maps.Map(document.getElementById('map'), {
        zoom: 22,
        center: latLng,
      });
      var makerspaceCoords = [
        {lat: 36.176709, lng: -86.753075},
        {lat: 36.176507, lng: -86.752958},
        {lat: 36.176449, lng: -86.753123},
        {lat: 36.176548, lng: -86.753177},
        {lat: 36.176519, lng: -86.753260},
        {lat: 36.176568, lng: -86.753288},
        {lat: 36.176534, lng: -86.753385},
        {lat: 36.176586, lng: -86.753412},
        {lat: 36.176709, lng: -86.753075}
      ];
      var makerspace = new google.maps.Polygon({
        path: makerspaceCoords,
        map: map,
        strokeOpacity: .2,
        fillOpacity: 0,
      });
    }

    $(document).ready(function() {
      initMap();
    });
  </script>

</div>

<?php get_footer();
