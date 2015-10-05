var map, baseLayers = [],
	treeLayer = new ol.layer.Vector(),
	userLayer = new ol.layer.Vector(),
	features = {},
	treeStyles = {},
	userStyles = {},
	selectedFeature,
	searchTree,
	activeAddress



function initMap(resolve, reject) {
	// resolve()
	// return
	// WMTS Server Eigenschaften abfragen. Hier wird ein Proxy benötigt: https://cors-proxy.xiala.net/
	var wmtsUrl = state.proxy + 'http://www.gis.stadt-zuerich.ch/wmts/wmts-zh-stzh-ogd.xml'

	$.get(wmtsUrl).success(function(data) {


		var previewLayers = []

		// WMTS Server Eigenschaften einlesen. 
		var capabilities = new ol.format.WMTSCapabilities().read(data)
			// Hack: Parameter muss gelöscht werden, sonst funktioniert nichts.
		delete capabilities.OperationsMetadata.GetTile


		capabilities.Contents.Layer.forEach(function(layer, index) {
			if (layer.Identifier != "Luftbild_2011" && layer.Identifier != "UebersichtsplanAktuell")
				return

			var options = ol.source.WMTS.optionsFromCapabilities(capabilities, {
				layer: layer.Identifier
			})

			var olLayer = new ol.layer.Tile({
				extent: extent,
				source: new ol.source.WMTS(options),
				visible: layer.Identifier == "UebersichtsplanAktuell",
				opacity: layer.Identifier == "UebersichtsplanAktuell" ? 0.22 : 1
			})

			var olLayerPreview = new ol.layer.Tile({
				extent: extent,
				source: new ol.source.WMTS(options),
				visible: layer.Identifier != "UebersichtsplanAktuell",
				opacity: layer.Identifier == "UebersichtsplanAktuell" ? 0.44 : 1,
			})

			baseLayers.push(olLayer)
			previewLayers.push(olLayerPreview)
		})

		previewLayers.forEach(function(layer) {
			baseLayers.push(layer)
		})

		var center = proj4('EPSG:4326', 'EPSG:21781', state.user.location);
		var zoom = 12;
		var extent = [420000, 30000, 900000, 350000]
		var projection = ol.proj.get('EPSG:21781')
		projection.setExtent([420000, 30000, 900000, 350000])

		var view = new ol.View({
			projection: projection,
			center: center,
			zoom: zoom,
			minZoom: 10,
			maxZoom: 15
		})

		// Create Map
		map = new ol.Map({
			layers: [baseLayers[0], baseLayers[1], userLayer, treeLayer, baseLayers[2], baseLayers[3]],
			target: 'map',
			view: view,
			interactions: ol.interaction.defaults({
				mouseWheelZoom: true,
				pinchZoom: true,
				pinchRotate: false,
				doubleClickZoom: false
			}),
			controls: []
		});

		mapEvents()

		previewLayers.forEach(function(layer) {

			layer.on('precompose', function(event) {
				var ctx = event.context;
				ctx.save();
				ctx.translate(ctx.canvas.width - 54 * window.devicePixelRatio, ctx.canvas.height - 114 * window.devicePixelRatio);
				ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
				ctx.fillStyle = "rgb(255,255,255)";
				ctx.shadowColor = "rgba(0,0,0,0.5)";
				ctx.shadowBlur = 4;
				ctx.beginPath();
				ctx.moveTo(2, 0);
				ctx.lineTo(46, 0);
				ctx.quadraticCurveTo(48, 0, 48, 2);
				ctx.lineTo(48, 46);
				ctx.quadraticCurveTo(48, 48, 46, 48);
				ctx.lineTo(2, 48);
				ctx.quadraticCurveTo(0, 48, 0, 46);
				ctx.lineTo(0, 2);
				ctx.quadraticCurveTo(0, 0, 4, 0);
				ctx.fill();
				ctx.restore();
				ctx.save();

				ctx.translate(ctx.canvas.width - 54 * window.devicePixelRatio, ctx.canvas.height - 114 * window.devicePixelRatio);
				ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

				ctx.beginPath();
				ctx.moveTo(2, 0);
				ctx.lineTo(46, 0);
				ctx.quadraticCurveTo(48, 0, 48, 2);
				ctx.lineTo(48, 46);
				ctx.quadraticCurveTo(48, 48, 46, 48);
				ctx.lineTo(2, 48);
				ctx.quadraticCurveTo(0, 48, 0, 46);
				ctx.lineTo(0, 2);
				ctx.quadraticCurveTo(0, 0, 4, 0);
				ctx.clip();
				ctx.setTransform(1, 0, 0, 1, 0, 0);
			});


			layer.on('postcompose', function(event) {
				var ctx = event.context;
				ctx.restore();
			});

			resolve()

		})

	}).fail(function(e) {
		alert("Kartenmaterial konnte nicht geladen werden. Bitte später erneut versuchen.")
		reject()
	})
}

function centerMap(center) {
	var pan = ol.animation.pan({
		duration: 400,
		source: /** @type {ol.Coordinate} */ (map.getView().getCenter())
	});
	map.beforeRender(pan);
	map.getView().setCenter(proj4('EPSG:4326', 'EPSG:21781', center))
}

function initUser() {
	features.user = new ol.Feature({
		geometry: new ol.geom.Point(proj4('EPSG:4326', 'EPSG:21781', state.user.location))
	});

	var source = new ol.source.Vector({
		features: [features.user]
	});

	userLayer.setSource(source)

	userStyles.green = new ol.style.Style({
		image: new ol.style.Icon(({
			src: state.compass ?  'svg/user-dir-accent.svg' : 'svg/user-accent.svg'
		}))
	});

	userStyles.white = new ol.style.Style({
		image: new ol.style.Icon(({
			src: state.compass ?  'svg/user-dir-accent.svg' : 'svg/user-accent.svg'
		}))
	});

	features.user.setStyle(userStyles.green);

	// map.addLayer(layer)
}

function initTrees(trees) {
	features.trees = []

	treeStyles.lgreen = new ol.style.Style({
		image: new ol.style.Icon(({
			src: 'svg/tree-green.png',
			opacity: .5,
			scale: .5,
			// size: [26,26]
		}))
	});

	treeStyles.green = new ol.style.Style({
		image: new ol.style.Icon(({
			src: 'svg/tree-green-active.svg'
		}))
	});

	treeStyles.lwhite = new ol.style.Style({
		image: new ol.style.Icon(({
			src: 'svg/tree-white.png',
			opacity: .6,
			scale: .5
		}))
	});

	treeStyles.white = new ol.style.Style({
		image: new ol.style.Icon(({
			src: 'svg/tree-white-active.svg'
		}))
	});

	trees.forEach(function(tree) {

		var feature = new ol.Feature({
			geometry: new ol.geom.Point(proj4('EPSG:4326', 'EPSG:21781', [tree.lon, tree.lat])),
			dist: parseInt(tree.distance),
			Baumnummer: tree.Baumnummer
		})
		if (!features.trees.length) {
			feature.setStyle(treeStyles.green)
			selectedFeature = feature

		} else
			feature.setStyle(treeStyles.lgreen)

		features.trees.push(feature)
	})

	var source = new ol.source.Vector({
		features: features.trees
	})

	treeLayer.setSource(source)
}

function updateUser() {
	features.user.getStyle().getImage().setRotation(state.user.heading * (Math.PI / 180))
	features.user.setGeometry(new ol.geom.Point(proj4('EPSG:4326', 'EPSG:21781', state.user.location)))
}

function updateTrees(trees) {
	if(!features.trees){
		initTrees(trees)
		return
	}

	var newFeatures = []

	trees.forEach(function(tree) {

		var feature = new ol.Feature({
			geometry: new ol.geom.Point(proj4('EPSG:4326', 'EPSG:21781', [tree.lon, tree.lat])),
			dist: parseInt(tree.distance),
			Baumnummer: tree.Baumnummer
		})
		feature.setStyle(state.satelite ? treeStyles.lwhite : treeStyles.lgreen);
		features.trees.push(feature)

		newFeatures.push(feature)

	})
	treeLayer.getSource().addFeatures(newFeatures)
}

function switchMaps() {
	state.satelite = !state.satelite

	baseLayers.forEach(function(layer) {
		layer.setVisible(!layer.getVisible())
	})

	features.trees.forEach(function(item) {
		item.setStyle(state.satelite ? treeStyles.lwhite : treeStyles.lgreen)
	})
	selectedFeature.setStyle(state.satelite ? treeStyles.white : treeStyles.green)

	features.user.setStyle(state.satelite ? userStyles.white : userStyles.green)

	$("body").toggleClass("satelite")
}

function mapEvents() {
	map.on('click', function(e) {
		// Check for Map Change
		if (e.pixel[0] > window.innerWidth - 60 && e.pixel[0] < window.innerWidth - 12 && e.pixel[1] > window.innerHeight - 174 && e.pixel[1] < window.innerHeight - 126) {
			switchMaps()
		}

		var feature = map.forEachFeatureAtPixel(e.pixel,
			function(feature, layer) {
				return feature;
			});
		if (feature) {
			if (feature.getProperties().Baumnummer) {
				if (searchTree) {
					treeLayer.getSource().removeFeature(searchTree)
					searchTree = null
				}

				state.tree = proj4('EPSG:21781', 'EPSG:4326', feature.getGeometry().getCoordinates())
				
				details(feature.getProperties().Baumnummer)

				selectedFeature.setStyle(state.satelite ? treeStyles.lwhite : treeStyles.lgreen)


				selectedFeature = feature
				feature.setStyle(state.satelite ? treeStyles.white : treeStyles.green)

				var pan = ol.animation.pan({
					duration: 400,
					source: /** @type {ol.Coordinate} */ (map.getView().getCenter())
				});
				map.beforeRender(pan);
				map.getView().setCenter(feature.getGeometry().getCoordinates());


			}
		} else {

		}
	});

	map.on("pointerdrag", function() {
		state.watchposition = false;

		checkForReload(proj4('EPSG:21781', 'EPSG:4326', map.getView().getCenter()))
	});

	map.on("moveend", function() {
		state.watchposition = false;
		checkForReload(proj4('EPSG:21781', 'EPSG:4326', map.getView().getCenter()))
	});
}

function createSearchTree(location) {
	if (searchTree) {
		treeLayer.getSource().removeFeature(searchTree)
	}
	searchTree = new ol.Feature({
		geometry: new ol.geom.Point(proj4('EPSG:4326', 'EPSG:21781', location)),
	})
	searchTree.setStyle(state.satelite ? treeStyles.white : treeStyles.green);

	treeLayer.getSource().addFeature(searchTree)
}