var overview
// --
// initOverview
// --
// generate overview map
// --
function initOverview(tree) {

	// get necessary data (all trees which have the same Baumname_LAT, a map of zurichs districts and a geojso file)
	var overviewPromises = []
	overviewPromises.push(new Promise(function(res, rej) {
		getByUrl(res, rej, "http://api.flaneur.io/baumkataster/trees/Baumname_LAT=" + tree.Baumname_LAT, {parse: true})
	}))
	overviewPromises.push(new Promise(function(res, rej) {
		getByUrl(res, rej, "https://data.stadt-zuerich.ch/storage/f/stadtkreis/stadtkreis.json", {proxy: true})
	}))
	overviewPromises.push(new Promise(function(res, rej) {
		getByUrl(res, rej, "Zuerichsee.json")
	}))

	Promise.all(overviewPromises).then(function(data) {
		var locations = data[0]
		var districts = data[1]
		var zuerichsee = data[2]

		// set feature styles
		var styles = [
			new ol.style.Style({
				stroke: new ol.style.Stroke({
					color: '#CCCCCC',
					width: .5
				}),
			}),
		];

		var stylesExtent = [
			new ol.style.Style({
				stroke: new ol.style.Stroke({
					color: '#FF4E92',
					width: .5
				}),
			}),
		];

		var stylesLake = [
			new ol.style.Style({
				stroke: new ol.style.Stroke({
					color: '#CCCCCC',
					width: .5
				}),
				fill: new ol.style.Fill({
					color: '#EEEEEE'
				})
			}),
		]

		// create layers for districts, lake and trees
		var source = new ol.source.Vector({
			features: (new ol.format.GeoJSON()).readFeatures(districts, {
				featureProjection: "EPSG:3857"
			}),
			projection: 'EPSG:3857'
		});

		var layer = new ol.layer.Vector({
			source: source,
			projection: 'EPSG:3857',
			style: styles
		});

		var sourceLake = new ol.source.Vector({
			features: (new ol.format.GeoJSON()).readFeatures(zuerichsee, {
				featureProjection: "EPSG:3857"
			}),
			projection: 'EPSG:3857'
		});

		var layerLake = new ol.layer.Vector({
			source: sourceLake,
			projection: 'EPSG:3857',
			style: stylesLake
		});

		var tLayer = new ol.layer.Vector()

		overview = new ol.Map({
			layers: [layer, layerLake, tLayer],
			target: 'overview',
			view: new ol.View({
				center: [8.536999947103082, 47.37367243001017],
				projection: 'EPSG:3857',
			}),
			// disable all interactions and controls
			interactions: [],
			controls: []
		});

		overview.getView().fit(
			source.getExtent(), /** @type {ol.Size} */ (overview.getSize()));

		// add trees
		tLayer.setSource(createTreeLayer(locations, tree))
	})

}

// --
// createTreeLayer
// --
// creates source for tLayer
// --
function createTreeLayer(locations, tree) {
	// set styles
	var style = new ol.style.Style({
		image: new ol.style.Icon(({
			src: 'icons/tree-min.png',
			opacity: .5,
			scale: .5,
		}))

	});

	var mapCenterStyle = new ol.style.Style({
		image: new ol.style.Icon(({
			src: 'icons/overview-center.png',
			scale: .5,
		}))
	});

	var tFeatures = []
	// add trees
	locations.forEach(function(location) {

		var feature = new ol.Feature({
			geometry: new ol.geom.Point(proj4('EPSG:4326', 'EPSG:3857', [location.lon, location.lat]))
		})

		feature.setStyle(style)
		tFeatures.push(feature)
	})

	// add a rectanngle to show where the other map is centered at
	var mapCenter = new ol.Feature({
		geometry: new ol.geom.Point(proj4('EPSG:21781', 'EPSG:3857', map.getView().getCenter()))
	})
	mapCenter.setStyle(mapCenterStyle)
	tFeatures.push(mapCenter)

	var source = new ol.source.Vector({
		features: tFeatures
	})

	return source
}