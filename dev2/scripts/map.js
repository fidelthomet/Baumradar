var map,
	features = {},
	activeAddress


// --
// initMap
// --
// Initialize OpenLayers map
// --
function initMap(resolve, reject) {

	// init vector layers
	state.layers.trees = new ol.layer.Vector()
	state.layers.user = new ol.layer.Vector()

	// Set projection to EPSG:21781, more info: http://epsg.io/21781
	var projection = ol.proj.get('EPSG:21781')
	projection.setExtent([420000, 30000, 900000, 350000])

	// Set up Map
	map = new ol.Map({
		target: 'map',
		view: new ol.View({
			projection: projection,
			center: proj4('EPSG:4326', 'EPSG:21781', state.user.location),
			zoom: 12,
			minZoom: 10,
			maxZoom: 15
		}),
		// disable rotation and doubleckick zoom
		interactions: ol.interaction.defaults({
			pinchRotate: false,
			doubleClickZoom: false
		}),
		// disable Controlls
		controls: []
	});

	// add event handlers
	mapEventHandlers()

	// get layers
	new Promise(function(resolve, reject) {
		getWmtsLayers(resolve, reject, config.url.wmtsXml)
	}).then(function() {

		// add layers to map
		[state.layers.map, state.layers.aerial, state.layers.user, state.layers.trees].forEach(function(layer) {
			map.addLayer(layer)
		})
		resolve()
	})
}

// --
// initUser
// --
// intializes user feature
// --
function initUser() {
	state.layers.user.setSource(new ol.source.Vector())

	if (state.geolocation) {
		// create feature, set style and add it to layer source
		features.user = new ol.Feature({
			geometry: new ol.geom.Point(proj4('EPSG:4326', 'EPSG:21781', state.user.location)),
		})
		features.user.setStyle(new ol.style.Style({
			image: new ol.style.Icon(({
				src: state.compass ? 'svg/user-dir-accent.svg' : 'svg/user-accent.svg',
				size: [40, 40]
			}))
		}))
		state.layers.user.getSource().addFeature(features.user)
	} else {
		$("#geolocation, .left, .border").remove()
		$(".right").css("margin", "0px")
	}

	// enable location tracking
	state.ready = true
}

// --
// updateUser
// --
// update position and heading of user icon
// --
function updateUser() {
	features.user.getStyle().getImage().setRotation(state.user.heading * (Math.PI / 180))
	features.user.setGeometry(new ol.geom.Point(proj4('EPSG:4326', 'EPSG:21781', state.user.location)))
}

// --
// updateTrees
// --
// add trees to map
// --
function updateTrees(trees) {
	if (!features.trees) {
		// init tree features and tree styles
		features.trees = []

		state.styles.treeMap = new ol.style.Style({
			image: new ol.style.Icon(({
				src: 'svg/tree-green.png',
				opacity: .7,
				scale: .5,
			}))
		});

		state.styles.treeMapHighlight = new ol.style.Style({
			image: new ol.style.Icon(({
				src: 'svg/tree-green-active.png',
				scale: .5,
			}))
		});

		state.styles.treeAerial = new ol.style.Style({
			image: new ol.style.Icon(({
				src: 'svg/tree-white.png',
				opacity: .8,
				scale: .5,
			}))
		});

		state.styles.treeAerialHighlight = new ol.style.Style({
			image: new ol.style.Icon(({
				src: 'svg/tree-white-active.png',
				scale: .5,
			}))
		});

		state.layers.trees.setSource(new ol.source.Vector({}))
	}

	// add tree features
	var newFeatures = []
	trees.forEach(function(tree) {
		var feature = new ol.Feature({
			geometry: new ol.geom.Point(proj4('EPSG:4326', 'EPSG:21781', [tree.lon, tree.lat])),
			dist: parseInt(tree.distance),
			Baumnummer: tree.Baumnummer
		})
		feature.setStyle(state.aerial ? state.styles.treeAerial : state.styles.treeMap);
		features.trees.push(feature)
		newFeatures.push(feature)
	})
	state.layers.trees.getSource().addFeatures(newFeatures)
}

// toggle layers
function toggleLayers() {
	state.aerial = !state.aerial
	$("body").toggleClass("satelite")

	state.layers.map.setVisible(!state.aerial)
	state.layers.aerial.setVisible(state.aerial)
	// map.getLayers().setAt(state.aerial ? 3 : 0, state.layers.map)
	// map.getLayers().setAt(state.aerial ? 0 : 3, state.layers.aerial)
	state.layers.map.setOpacity(state.aerial ? .44 : .4)


	features.trees.forEach(function(item) {
		item.setStyle(state.aerial ? state.styles.treeAerial : state.styles.treeMap)
	})
	state.highlight.tree.setStyle(state.aerial ? state.styles.treeAerialHighlight : state.styles.treeMapHighlight)
}

// add event handlers to map
function mapEventHandlers() {

	map.on('click', function(e) {
		// Check for map change
		if (!state.desktop) {
			if (e.pixel[0] > window.innerWidth - 54 && e.pixel[0] < window.innerWidth - 6 && e.pixel[1] > window.innerHeight - 174 && e.pixel[1] < window.innerHeight - 126) {
				toggleLayers()
				return
			}
		} else {
			if (e.pixel[0] > 6 && e.pixel[0] < 54 && e.pixel[1] > window.innerHeight - 54 && e.pixel[1] < window.innerHeight - 6) {
				toggleLayers()
				return
			}
		}

		// Check for selected feature
		var feature = map.forEachFeatureAtPixel(e.pixel, function(feature, layer) {
			return feature;
		})

		if (feature) {
			if (feature.getProperties().Baumnummer) {
				state.watchposition = false;
				highlightTree(proj4('EPSG:21781', 'EPSG:4326', feature.getGeometry().getCoordinates()), true)
				details(feature.getProperties().Baumnummer)
			}
		}
	})

	map.on("pointerdrag", function() {
		state.watchposition = false;
	})

	map.on("moveend", function() {
		if (state.autoRefresh)
			refreshTrees(proj4('EPSG:21781', 'EPSG:4326', map.getView().getCenter()))
	})
}

// Generate WMTS Layers
function getWmtsLayers(resolve, reject, url) {
	$.get(url).success(function(data) {

		// Generate a WMTSCapabilities-Object from XML-Ressource.
		// Key 'OperationsMetadata.GetTile' must be removed to work properly.
		var capabilities = new ol.format.WMTSCapabilities().read(data)
		delete capabilities.OperationsMetadata.GetTile

		capabilities.Contents.Layer.forEach(function(wmtsLayer, index) {
			if (wmtsLayer.Identifier != "LuftbildHybrid2011" && wmtsLayer.Identifier != "UebersichtsplanAktuell")
				return

			var options = ol.source.WMTS.optionsFromCapabilities(capabilities, {
				layer: wmtsLayer.Identifier
			})

			state.layers[wmtsLayer.Identifier == "UebersichtsplanAktuell" ? "map" : "aerial"] = new ol.layer.Tile({
				source: new ol.source.WMTS(options),
				opacity: wmtsLayer.Identifier == "UebersichtsplanAktuell" ? 0.4 : 1,
				visible: wmtsLayer.Identifier == "UebersichtsplanAktuell",
			})
		})

		resolve()

	}).fail(function(e, d, f, g, h) {
		if (!state.loadingXmlFailed) {
			state.loadingXmlFailed = true
			getWmtsLayers(resolve, reject, config.url.wmtsXmlLocal)
		} else {
			console.log("failed for real")
			resolve()
		}
	})
}

// pan map to specified location (EPSG:4326)
function panTo(center, skipAnimation) {
	if (!skipAnimation) {
		var pan = ol.animation.pan({
			duration: 400,
			source: map.getView().getCenter()
		});
		map.beforeRender(pan);
	}
	map.getView().setCenter(proj4('EPSG:4326', 'EPSG:21781', center))
}


function highlightTree(location, pan) {
	state.tree = location

	if (state.highlight.tree)
		state.layers.trees.getSource().removeFeature(state.highlight.tree)

	state.highlight.tree = new ol.Feature({
		geometry: new ol.geom.Point(proj4('EPSG:4326', 'EPSG:21781', location)),
	})

	state.highlight.tree.setStyle(state.aerial ? state.styles.treeAerialHighlight : state.styles.treeMapHighlight);
	state.layers.trees.getSource().addFeature(state.highlight.tree)

	if (pan)
		panTo(location)
}