var overview;

function initOverview(tree) {

	var overviewPromises = []
	overviewPromises.push(new Promise(function(resolve, reject) {
		getLocations(resolve, reject, tree.Baumname_LAT)
	}))

	overviewPromises.push(new Promise(getDistricts))
	overviewPromises.push(new Promise(getZuerichsee))

	Promise.all(overviewPromises).then(function(data) {
		var locations = data[0]
		var districts = data[1]
		var zuerichsee = data[2]
		var styles = [
			/* We are using two different styles for the polygons:
			 *  - The first style is for the polygons themselves.
			 *  - The second style is to draw the vertices of the polygons.
			 *    In a custom `geometry` function the vertices of a polygon are
			 *    returned as `MultiPoint` geometry, which will be used to render
			 *    the style.
			 */
			new ol.style.Style({
				stroke: new ol.style.Stroke({
					color: '#C8C8C8',
					width: .5
				}),
				// fill: new ol.style.Fill({
				// 	color: 'rgba(0, 0, 255, 0.1)'
				// })
			}),
			// new ol.style.Style({
			// 	image: new ol.style.Circle({
			// 		radius: 5,
			// 		fill: new ol.style.Fill({
			// 			color: 'orange'
			// 		})
			// 	}),
			// 	geometry: function(feature) {
			// 		// return the coordinates of the first ring of the polygon
			// 		var coordinates = feature.getGeometry().getCoordinates()[0];
			// 		return new ol.geom.MultiPoint(coordinates);
			// 	}
			// })
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



		overview = new ol.Map({
			layers: [layer, layerLake],
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
		image: new ol.style.Circle({
			radius: 2,
			fill: new ol.style.Fill({
				color: 'rgba(45,214,147,.4)'
			})
		}),
	});

	var styleActive = new ol.style.Style({
		image: new ol.style.Circle({
			radius: 3,
			fill: new ol.style.Fill({
				color: '#AD86FF'
			})
		}),
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
		geometry: new ol.geom.Point(proj4('EPSG:4326', 'EPSG:3857', state.user.location))
	})
	feature.setStyle(styleActive)
	tFeatures.push(feature)

	var source = new ol.source.Vector({
		features: tFeatures
	})

	var tLayer = new ol.layer.Vector({
		source: source,
		// style: style
	})

	overview.addLayer(tLayer)
}