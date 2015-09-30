var map, baseLayers = [], treeLayer,
	features = {}, treeStyles = {}

function initMap(resolve, reject) {
	// resolve()
	// return
	// WMTS Server Eigenschaften abfragen. Hier wird ein Proxy benötigt: https://cors-proxy.xiala.net/
	var wmtsUrl = state.proxy+'http://www.gis.stadt-zuerich.ch/wmts/wmts-zh-stzh-ogd.xml'

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
				opacity: layer.Identifier == "UebersichtsplanAktuell" ? 0.3 : 1
			})

			var olLayerPreview = new ol.layer.Tile({
				extent: extent,
				source: new ol.source.WMTS(options),
				visible: layer.Identifier != "UebersichtsplanAktuell",
				opacity: layer.Identifier == "UebersichtsplanAktuell" ? 0.3 : 1,
			})

			baseLayers.push(olLayer)
			previewLayers.push(olLayerPreview)
		})

		previewLayers.forEach(function(layer) {
			baseLayers.push(layer)
		})

		var center = proj4('EPSG:4326', 'EPSG:21781', state.user.location);
		var zoom = 13;
		var extent = [420000, 30000, 900000, 350000]
		var projection = ol.proj.get('EPSG:21781')
		projection.setExtent([420000, 30000, 900000, 350000])

		var view = new ol.View({
			projection: projection,
			center: center,
			zoom: zoom,
			minZoom: 12,
			maxZoom: 15
		})

		// Create Map
		map = new ol.Map({
			layers: baseLayers,
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
				ctx.translate(ctx.canvas.width - 64 * window.devicePixelRatio, ctx.canvas.height - 64 * window.devicePixelRatio);
				ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
				ctx.fillStyle = "rgb(255,255,255)";
				ctx.shadowColor = "black";
				ctx.shadowBlur = 10;
				ctx.beginPath();
				ctx.moveTo(4, 0);
				ctx.lineTo(44, 0);
				ctx.quadraticCurveTo(48, 0, 48, 4);
				ctx.lineTo(48, 44);
				ctx.quadraticCurveTo(48, 48, 44, 48);
				ctx.lineTo(4, 48);
				ctx.quadraticCurveTo(0, 48, 0, 44);
				ctx.lineTo(0, 4);
				ctx.quadraticCurveTo(0, 0, 4, 0);
				ctx.fill();
				ctx.restore();
				ctx.save();

				ctx.translate(ctx.canvas.width - 64 * window.devicePixelRatio, ctx.canvas.height - 64 * window.devicePixelRatio);
				ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

				ctx.beginPath();
				ctx.moveTo(4, 0);
				ctx.lineTo(44, 0);
				ctx.quadraticCurveTo(48, 0, 48, 4);
				ctx.lineTo(48, 44);
				ctx.quadraticCurveTo(48, 48, 44, 48);
				ctx.lineTo(4, 48);
				ctx.quadraticCurveTo(0, 48, 0, 44);
				ctx.lineTo(0, 4);
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
	map.getView().setCenter(proj4('EPSG:4326', 'EPSG:21781', center))
}

function initUser() {
	features.user = new ol.Feature({
		geometry: new ol.geom.Point(proj4('EPSG:4326', 'EPSG:21781', state.user.location))
	});

	var source = new ol.source.Vector({
		features: [features.user]
	});

	var layer = new ol.layer.Vector({
		source: source
	});

	var style = new ol.style.Style({
		image: new ol.style.Icon(({
			src: 'svg/user-dir.svg'
		}))
	});

	features.user.setStyle(style);

	map.addLayer(layer)
}

function initTrees(trees) {
	features.trees = []

	treeStyles.lgreen = new ol.style.Style({
		image: new ol.style.Icon(({
			src: 'svg/tree-green-light.svg'
		}))
	});

	treeStyles.green = new ol.style.Style({
		image: new ol.style.Icon(({
			src: 'svg/tree-green.svg'
		}))
	});

	trees.forEach(function(tree) {

		var feature = new ol.Feature({
			geometry: new ol.geom.Point(proj4('EPSG:4326', 'EPSG:21781', [tree.lon, tree.lat])),
			dist: parseInt(tree.distance),
			Baumnummer: tree.Baumnummer
		})
		if(!features.trees.length)
			feature.setStyle(treeStyles.green);
		else
			feature.setStyle(treeStyles.lgreen);

		features.trees.push(feature)
	})

	var source = new ol.source.Vector({
		features: features.trees
	})

	treeLayer = new ol.layer.Vector({
		source: source
	})

	map.addLayer(treeLayer)
}

function updateUser() {
	features.user.getStyle().getImage().setRotation(state.user.heading * (Math.PI / 180))
	features.user.setGeometry(new ol.geom.Point(proj4('EPSG:4326', 'EPSG:21781', state.user.location)))
}

function updateTrees(trees) {

	var newFeatures = []

	trees.forEach(function(tree) {

		var feature = new ol.Feature({
			geometry: new ol.geom.Point(proj4('EPSG:4326', 'EPSG:21781', [tree.lon, tree.lat])),
			dist: parseInt(tree.distance),
			Baumnummer: tree.Baumnummer
		})
		feature.setStyle(treeStyles.lgreen);
		features.trees.push(feature)
		
		newFeatures.push(feature)

	})
	treeLayer.getSource().addFeatures(newFeatures)
}

function switchMaps() {
	baseLayers.forEach(function(layer) {
		layer.setVisible(!layer.getVisible())
	})
	$("body").toggleClass("satelite")
}

function mapEvents() {
	map.on('click', function(e) {
		// Check for Map Change
		if (e.pixel[0] > window.innerWidth - 60 && e.pixel[0] < window.innerWidth - 12 && e.pixel[1] > window.innerHeight - 204 && e.pixel[1] < window.innerHeight - 156) {
			switchMaps()
		}

		var feature = map.forEachFeatureAtPixel(e.pixel,
			function(feature, layer) {
				return feature;
			});
		if (feature) {
			details(feature.getProperties().Baumnummer)
			features.trees.forEach(function (item){
				item.setStyle(treeStyles.lgreen)
			})
			feature.setStyle(treeStyles.green)
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