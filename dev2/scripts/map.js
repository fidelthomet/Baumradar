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
	initMapEvents()

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
				src: state.compass ? 'icons/user-dir-accent.svg' : 'icons/user-accent.svg',
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
				src: 'icons/tree-green.png',
				opacity: .7,
				scale: .5,
			}))
		});

		state.styles.treeMapHighlight = new ol.style.Style({
			image: new ol.style.Icon(({
				src: 'icons/tree-green-active.png',
				scale: .5,
			}))
		});

		state.styles.treeAerial = new ol.style.Style({
			image: new ol.style.Icon(({
				src: 'icons/tree-white.png',
				opacity: .8,
				scale: .5,
			}))
		});

		state.styles.treeAerialHighlight = new ol.style.Style({
			image: new ol.style.Icon(({
				src: 'icons/tree-white-active.png',
				scale: .5,
			}))
		});

		state.layers.trees.setSource(new ol.source.Vector({}))
	}

	// create array of new features
	var newTrees = []
	trees.forEach(function(tree) {
			var feature = new ol.Feature({
				geometry: new ol.geom.Point(proj4('EPSG:4326', 'EPSG:21781', [tree.lon, tree.lat])),
				dist: parseInt(tree.distance),
				Baumnummer: tree.Baumnummer
			})
			feature.setStyle(state.aerial ? state.styles.treeAerial : state.styles.treeMap);
			features.trees.push(feature)
			newTrees.push(feature)
		})
		// add new features to map
	state.layers.trees.getSource().addFeatures(newTrees)
}

// --
// togglelayers
// --
// switch between default and aerial map
// --
function toggleLayers() {
	state.aerial = !state.aerial

	// toggle layers
	state.layers.map.setVisible(!state.aerial)
	state.layers.aerial.setVisible(state.aerial)

	// change style of tree features
	features.trees.forEach(function(item) {
		item.setStyle(state.aerial ? state.styles.treeAerial : state.styles.treeMap)
	})
	state.highlight.tree.setStyle(state.aerial ? state.styles.treeAerialHighlight : state.styles.treeMapHighlight)
}

// --
// initMapEvents
// --
// add map related event handlers
// --
function initMapEvents() {

	map.on('click', function(e) {

		// detect click on features (find the closest for multiple hits)
		var feature
		var dist
		map.forEachFeatureAtPixel(e.pixel, function(f, l) {
			var pixel = map.getPixelFromCoordinate(f.getGeometry().getCoordinates());
			var pixelDist = (e.pixel[0] - pixel[0]) * (e.pixel[0] - pixel[0]) + (e.pixel[1] - pixel[1]) * (e.pixel[1] - pixel[1])

			if (!dist || pixelDist < dist) {
				dist = pixelDist
				feature = f
			}
		})

		// highlight tree and get details
		if (feature) {
			if (feature.getProperties().Baumnummer) {
				state.watchposition = false;
				highlightTree(proj4('EPSG:21781', 'EPSG:4326', feature.getGeometry().getCoordinates()), true)
				details(feature.getProperties().Baumnummer)
			}
		}
	})

	// disable that map follows user
	map.on("pointerdrag", function() {
		state.watchposition = false;
	})

	// refresh trees
	map.on("moveend", function() {
		if (state.autoRefresh)
			refreshTrees(proj4('EPSG:21781', 'EPSG:4326', map.getView().getCenter()))
	})
}

// --
// getWmtsLayers
// --
// get WMTS Metadata and create map layers
// --
function getWmtsLayers(resolve, reject, url) {
	$.get(url).success(function(data) {

		// Generate a WMTSCapabilities-Object from XML-Ressource.
		// Key 'OperationsMetadata.GetTile' must be removed to work properly.
		var capabilities = new ol.format.WMTSCapabilities().read(data)
		delete capabilities.OperationsMetadata.GetTile

		capabilities.Contents.Layer.forEach(function(wmtsLayer, index) {
			// only create layers for "Luftbild_2011" and "UebersichtsplanAktuell"
			if (wmtsLayer.Identifier != "Luftbild_2011" && wmtsLayer.Identifier != "UebersichtsplanAktuell")
				return

			// create options from capabilities
			var options = ol.source.WMTS.optionsFromCapabilities(capabilities, {
				layer: wmtsLayer.Identifier
			})

			// set layer
			state.layers[wmtsLayer.Identifier == "UebersichtsplanAktuell" ? "map" : "aerial"] = new ol.layer.Tile({
				source: new ol.source.WMTS(options),
				opacity: wmtsLayer.Identifier == "UebersichtsplanAktuell" ? 0.4 : 1,
				visible: false,
			})
		})

		state.tilesLoadEnd = new Promise(function(resolve, reject){
			state.tilesLoadEndResolve = resolve
		})

		state.layers.map.getSource().on("tileloadstart", function(e){
			state.tileCount ++
		})

		state.layers.map.getSource().on("tileloadend", function(e){
			state.tileCount --
			if(!state.tileCount){
				state.tilesLoadEndResolve()
			}
		})

		resolve()

	}).fail(function() {
		goToFail("Kartenmaterial konnte nicht geladen, bitte später erneut versuchen")
	})
}

// --
// panTo
// --
// pan map to specified location (EPSG:4326)
// --
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

// --
// highlightTree
// --
// add highlighted tree as new feature at specified location
// --
function highlightTree(location, pan) {
	state.tree = location

	// remove old highlighted tree
	if (state.highlight.tree)
		state.layers.trees.getSource().removeFeature(state.highlight.tree)

	// create new one
	state.highlight.tree = new ol.Feature({
		geometry: new ol.geom.Point(proj4('EPSG:4326', 'EPSG:21781', location)),
	})

	// set style, add features
	state.highlight.tree.setStyle(state.aerial ? state.styles.treeAerialHighlight : state.styles.treeMapHighlight);
	state.layers.trees.getSource().addFeature(state.highlight.tree)

	if (pan)
		panTo(location)
}