// --
// initMap
// --
// Initialize OpenLayers map
// --
$(function(){

	// Set projection to EPSG:21781, more info: http://epsg.io/21781
	var projection = ol.proj.get('EPSG:21781')
	projection.setExtent([420000, 30000, 900000, 350000])

	// Set up Map
	var map = new ol.Map({
		target: 'map',
		view: new ol.View({
			projection: projection,
			center: proj4('EPSG:4326', 'EPSG:21781', [8.545079, 47.366989]), // center at Bellevue
			// set default & limit zoom
			zoom: 12,
			minZoom: 7,
			maxZoom: 15
		}),
		// disable controls
		controls: []
	});

	// use cors proxy (https://cors-proxy.xiala.net) to access wmts-zh-stzh-ogd.xml
	$.get("https://cors-proxy.xiala.net/http://www.gis.stadt-zuerich.ch/wmts/wmts-zh-stzh-ogd.xml").success(function(data) {

		// Generate a WMTSCapabilities-Object from XML-Resource.
		var capabilities = new ol.format.WMTSCapabilities().read(data)
		// Key 'OperationsMetadata.GetTile' must be removed to work properly (no idea why).
		delete capabilities.OperationsMetadata.GetTile

		capabilities.Contents.Layer.forEach(function(wmtsLayer, index) {
			// only create layer for "UebersichtsplanAktuell"
			if (wmtsLayer.Identifier != "Luftbild_1976")
				return

			// create options from capabilities
			var options = ol.source.WMTS.optionsFromCapabilities(capabilities, {
				layer: wmtsLayer.Identifier
			})

			// set layer
			var layer = new ol.layer.Tile({
				source: new ol.source.WMTS(options),
			})

			map.addLayer(layer)
		})

	}).fail(function() {
		alert("Kartenmaterial konnte nicht geladen werden")
	})			
})