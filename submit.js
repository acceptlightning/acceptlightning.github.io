function mapCallback(){window.map=new google.maps.Map(document.getElementById("map"),{center:{lat:0,lng:0},zoom:2,mapTypeControl:false});window.marker=new google.maps.Marker({position:{lat:0,lng:0},map:window.map,draggable:true});window.marker.addListener("position_changed",()=>{$("#long").val(window.marker.getPosition().lng());$("#lat").val(window.marker.getPosition().lat())});window.map.addListener("click",clickPosition=>{window.marker.setPosition(clickPosition.latLng);google.maps.event.trigger(window.map,"click",clickPosition)});const searchInput=document.getElementById("search");const searchBox=new google.maps.places.SearchBox(searchInput);window.map.controls[google.maps.ControlPosition.TOP_LEFT].push(searchInput);window.map.addListener("bounds_changed",()=>{searchBox.setBounds(window.map.getBounds())});searchBox.addListener("places_changed",()=>{const places=searchBox.getPlaces();if(places.length===0){return}const bounds=new google.maps.LatLngBounds;places.forEach(place=>{if(place.geometry.viewport){bounds.union(place.geometry.viewport)}else{bounds.extend(place.geometry.location)}window.marker.setPosition(place.geometry.location)});window.map.fitBounds(bounds)})}$(document).ready(()=>{$("#isOnlineRadioYes").click(()=>{$("#dragMarkerHelp").hide();$("#search").hide();$("#map").hide();$("#url").attr("placeholder","Enter URL");$("#url").show(400)});$("#isOnlineRadioNo").click(()=>{$("#dragMarkerHelp").show();$("#search").show(400);$("#map").show(300);$("#url").attr("placeholder","Enter URL(optional)");$("#url").show(400);$("html, body").animate({scrollTop:$("#isOnlineOnly").offset().top},600)});$("form").keypress(keyCode=>{if(keyCode.which===13){return false}})});
