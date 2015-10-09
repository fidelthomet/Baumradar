var overview, tLayer

function initOverview(tree) {

	// get necessary data
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
		var styles = [
			new ol.style.Style({
				stroke: new ol.style.Stroke({
					color: '#C8C8C8',
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
					color: '#C8C8C8',
					width: .5
				}),
				fill: new ol.style.Fill({
					color: '#EEEEEE'
				})
			}),
		]


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



		var extent = map.getView().calculateExtent(map.getSize())

		var p = [
			proj4('EPSG:21781', 'EPSG:3857', [extent[0], extent[1]]),
			proj4('EPSG:21781', 'EPSG:3857', [extent[0], extent[3]]),
			proj4('EPSG:21781', 'EPSG:3857', [extent[2], extent[3]]),
			proj4('EPSG:21781', 'EPSG:3857', [extent[2], extent[1]]),
		]

		var extentGeoJson = {
			'type': 'FeatureCollection',
			'crs': {
				'type': 'name',
				'properties': {
					'name': 'EPSG:3857'
				}
			},
			'features': [{
				'type': 'Feature',
				'geometry': {
					'type': 'Polygon',
					'coordinates': [
						p
					]
				}
			}]
		}

		var sourceExtent = new ol.source.Vector({
			features: (new ol.format.GeoJSON()).readFeatures(extentGeoJson, {
				featureProjection: "EPSG:3857"
			}),
			projection: 'EPSG:3857'
		});

		var layerExtent = new ol.layer.Vector({
			source: sourceExtent,
			projection: 'EPSG:3857',
			style: stylesExtent
		});

		tLayer = new ol.layer.Vector()

		overview = new ol.Map({
			layers: [layer, layerLake, tLayer],
			target: 'overview',
			view: new ol.View({
				center: [8.536999947103082, 47.37367243001017],
				projection: 'EPSG:3857',
			}),
			interactions: ol.interaction.defaults({
				dragPan: false,
				mouseWheelZoom: false,
				pinchZoom: false,
				pinchRotate: false,
				doubleClickZoom: false
			}),
			controls: []
		});

		overview.getView().fit(
			source.getExtent(), /** @type {ol.Size} */ (overview.getSize()));

		createTreeLayer(locations, tree)
	})

}

function updateOverview() {

}

function createTreeLayer(locations, tree) {
	var style = new ol.style.Style({
		// image: new ol.style.Circle({
		// 	radius: 1,
		// 	fill: new ol.style.Fill({
		// 		color: 'rgba(45,214,147,.4)'
		// 	})
		// }),

		image: new ol.style.Icon(({
			src: 'svg/tree-min.png',
			opacity: .5,
			scale: .5,
			// size: [26,26]
		}))

	});

	var styleActive = new ol.style.Style({
		image: new ol.style.Icon(({
			src: 'svg/overview-center.png',
			// opacity: .5,
			scale: .5,
			// size: [26,26]
		}))
	});

	var tFeatures = []
	locations.forEach(function(location) {

		var feature = new ol.Feature({
			geometry: new ol.geom.Point(proj4('EPSG:4326', 'EPSG:3857', [location.lon, location.lat]))
		})

		feature.setStyle(style)
		tFeatures.push(feature)
	})


	var feature = new ol.Feature({
		geometry: new ol.geom.Point(proj4('EPSG:21781', 'EPSG:3857', map.getView().getCenter()))
	})
	feature.setStyle(styleActive)
	tFeatures.push(feature)

	var source = new ol.source.Vector({
		features: tFeatures
	})

	tLayer.setSource(source)

	// overview.addLayer(tLayer)
}