<?php
/*
Template Name: Map
*/
get_header(); ?>

<?php get_template_part( 'template-parts/featured-image' ); ?>

<div id="page-full-width" class="faq" role="main">
  <?php echo $post->post_content; ?>
  <article <?php post_class('main-content') ?> id="post-<?php the_ID(); ?>">
    <div id="legend" class="large-3 medium-4 small-12 columns">
      <div class="legend blue"></div>
      <p>Storage</p>
      <div class="legend red"></div>
      <p>Metal shop</p>
    </div>
    <div id="map" class="large-9 medium-8 small-12 columns">
    </div>
  </article>

  <script type='text/javascript'>
    function initMap() {  
      var latLng = {lat: 36.176578, lng: -86.753180};
      var map = new google.maps.Map(document.getElementById('map'), {
        zoom: 22,
        center: latLng,
        scrollwheel: false,
      });
      var makerspaceCoords = [
        {lat: 36.176709, lng: -86.753076}, // top right
        {lat: 36.176507, lng: -86.752958}, // bottom right
        {lat: 36.176449, lng: -86.753123}, // bottom sub-right
        {lat: 36.176565, lng: -86.753187}, // inside top right
        {lat: 36.176504, lng: -86.753368}, // sub-bottom left
        {lat: 36.176555, lng: -86.753396}, // sub-top left
        {lat: 36.176566, lng: -86.753364}, // inside bottom right
        {lat: 36.176597, lng: -86.753381}, // top sub-left
        {lat: 36.176709, lng: -86.753076} // top right
      ];
      var makerspace = new google.maps.Polygon({
        path: makerspaceCoords,
        map: map,
        strokeOpacity: .3,
        fillOpacity: 0,
      });

      // metal shop
      var metalshopCoords = [
        {lat: 36.176619, lng: -86.753317}, // top left
        {lat: 36.176649, lng: -86.753233}, // top right
        {lat: 36.176565, lng: -86.753187}, // bottom right
        {lat: 36.176535, lng: -86.753272}, // bottom left
      ];
      var metalshop = new google.maps.Polygon({
        path: metalshopCoords,
        map:map,
        strokeOpacity: 0,
        fillOpacity: .2,
        fillColor: '#33cc33',
      });

      // metal shop
      var storageCoords = [
        {lat: 36.176619, lng: -86.753317}, // top right
        {lat: 36.176535, lng: -86.753272}, // bottom right
        {lat: 36.176504, lng: -86.753368}, // bottom left
        {lat: 36.176555, lng: -86.753396}, // sub-top left
        {lat: 36.176566, lng: -86.753364}, // inside bottom right
        {lat: 36.176597, lng: -86.753381}, // top sub-left
      ];
      var storage = new google.maps.Polygon({
        path: storageCoords,
        map:map,
        strokeOpacity: 0,
        fillOpacity: .2,
        fillColor: '#3333ff',
      });
    }

    $(document).ready(function() {
      initMap();
    });
  </script>

</div>

<?php get_footer();
