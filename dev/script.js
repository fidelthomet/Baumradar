var userLocation = {
	lat: 47.367010,
	lon: 8.545085
}

pictos = {
	"Ahorn": 3,
	"Amberbaum": 8,
	"Apfel": 5,
	"Aralie": 10,
	"Birke": 2,
	"Birne": 5,
	"Buche": 3,
	"Dattelpflaume": 3,
	"Eibe": 8,
	"Eiche": 3,
	"Erle": 8,
	"Esche": 3,
	"Esskastanie": 3,
	"Feige": 4,
	"Felsenbirne": 3,
	"Fichte": 9,
	"Flügelnuss": 3,
	"Ginkgo": 8,
	"Gleditschie": 3,
	"Goldregen": 10,
	"Hartriegel": 10,
	"Hasel": 8,
	"Hemlocktanne": 9,
	"Hickory": 8,
	"Hopfenbuche": 7,
	"Judasbaum": 4,
	"Kiefer": 9,
	"Kopfeibe": 10,
	"Lärche": 9,
	"Lebensbaum": 9,
	"Linde": 7,
	"Magnolie": 4,
	"Mammutbaum": 9,
	"Maulbeerbaum": 3,
	"Mehlbeere": 1,
	"nicht identifiziert": 1,
	"Ölweide": 8,
	"Pappel": 8,
	"Platane": 1,
	"Prunus": 4,
	"Quitte": 5,
	"Rhus": 1,
	"Robinie": 8,
	"Rosskastanie": 3,
	"Scheinzypresse": 9,
	"Schnurrbaum": 3,
	"Stechpalme": 1,
	"Tanne": 9,
	"Trompetenbaum": 1,
	"Tulpenbaum": 8,
	"Ulme": 7,
	"Wacholder": 9,
	"Walnuss": 7,
	"Weide": 7,
	"Weissdorn": 1,
	"Zeder": 9,
	"Zürgelbaum": 3,
	"Zypress": 9,
	"Andere": 1
}

var layers = [];
var projection;
var map, view
var markers

var featureUser = new ol.Feature({
	geometry: new ol.geom.Point(proj4('EPSG:4326', 'EPSG:21781', [8.525636, 47.394982])),
	name: 'Null Island',
	population: 4000,
	rainfall: 500
});

var styleUser = new ol.style.Style({
	image: new ol.style.Icon( /** @type {olx.style.IconOptions} */ ({


		src: 'icons/position.svg'
	}))
});

var styleTree = new ol.style.Style({
	image: new ol.style.Icon( /** @type {olx.style.IconOptions} */ ({


		src: 'icons/tree.svg'
	}))
});

featureUser.setStyle(styleUser);

var vectorSource = new ol.source.Vector({
	features: [featureUser]
});

var vectorTreeSource = new ol.source.Vector()

var vectorLayer = new ol.layer.Vector({
	source: vectorSource
});

var vectorTreeLayer = new ol.layer.Vector({
	source: vectorTreeSource
});

$(function() {



	projection = ol.proj.get('EPSG:21781');
	projection.setExtent([420000, 30000, 900000, 350000]);
	
	var wmtsUrl = 'https://cors-proxy.xiala.net/http://www.gis.stadt-zuerich.ch/wmts/wmts-zh-stzh-ogd.xml'
	var center = [683200, 246650];
	var zoom = 12;
	var extent = [420000, 30000, 900000, 350000]

	view = new ol.View({
		projection: projection,
		center: center,
		zoom: zoom,
		minZoom: 12,
		maxZoom: 14
	})



	var capabilities;
	var xhr = new XMLHttpRequest();
	xhr.open('GET', wmtsUrl, true);
	xhr.onload = function() {
		if (xhr.status === 200) {
			var parser = new ol.format.WMTSCapabilities();
			capabilities = parser.read(xhr.responseXML);

			for (var i = 0; i < capabilities.Contents.Layer.length; i++) {
				var layer = capabilities.Contents.Layer[i];
				layer.layer = layer.Identifier
				delete capabilities.OperationsMetadata.GetTile


				var options = ol.source.WMTS.optionsFromCapabilities(capabilities, {
					layer: layer.Identifier,
					TileMatrixSetLink: layer.TileMatrixSetLink
				})

				options.tilePixelRatio = 1
				var olLayer = new ol.layer.Tile({
					extent: extent,
					source: new ol.source.WMTS(options),
					visible: i === 21
				})
				layers.push(olLayer);

			};

			layers.push(vectorLayer, vectorTreeLayer);

			// create map
			map = new ol.Map({
				layers: layers,
				target: 'map',
				view: view,
				interactions: ol.interaction.defaults({
					mouseWheelZoom: true,
					pinchZoom: true,
					pinchRotate: false,
					doubleClickZoom: false
				}),
				controls: [
					new ol.control.Attribution
				]
			});

			map.on('click', function(evt) {
				var feature = map.forEachFeatureAtPixel(evt.pixel,
					function(feature, layer) {
						return feature;
					});
				if (feature) {
					alert("1")
				} else {
					console.log("0")
				}
			});

			new Promise(watchPosition).then(function() {



				$.get("http://api.flaneur.io/baumkataster/loc/" + userLocation.lat + "/" + userLocation.lon, function(resp) {

					var featureTrees = []
					var data = JSON.parse(resp)
					console.log(data.length)
					data.forEach(function(item, index) {

						var featureTree = new ol.Feature({
							geometry: new ol.geom.Point(proj4('EPSG:4326', 'EPSG:21781', [item.lon, item.lat])),
							name: 'Null Island',
							population: 4000,
							rainfall: 500
						});
						featureTree.setStyle(styleTree);
						featureTrees.push(featureTree)
					})

					createList(data)

					vectorTreeSource.addFeatures(featureTrees)

				});
			})
		}
	};
	xhr.send();

})

/**
 * List
 *
 * createList: takes tree data to fill #list
 * @param  {array} data
 */
function createList(data) {
	data.forEach(function(item, index) {

		$("#list").append(createDom("treeItem", item))
	})
	$(".distance .icon").each(function() {

		var p2 = {
			x: parseFloat($(this).attr("attrx")),
			y: parseFloat($(this).attr("attry"))
		};

		var p1 = {
			x: parseFloat(userLocation.lat),
			y: parseFloat(userLocation.lon)
		};

		// angle in degrees
		var angleDeg = Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI;

		console.log(angleDeg)

		$(this).css("transform", "rotate(" + angleDeg + "deg)")
	})
}


/**
 * DOM
 *
 */
function createDom(type, data) {
	var el

	var div = function(classname, content, attr) {
		var contentString = ""
		if (content)
			for (var i = 0; i < content.length; i++) {
				contentString += content[i]
			};
		var attrString = ""
		if (attr)
			for (var i = 0; i < attr.length; i++) {
				attrString += attr[i][0] + "='" + attr[i][1] + "'"
			};

		return "<div class='" + classname + "' " + attrString + ">" + contentString + "</div>"
	}

	var values = function(data) {
		var string = div("distance", [div("icon", [], [
			["attrx", data.lat],
			["attry", data.lon]
		]), data.dist + "m"])


		if (data.Pflanzjahr != "0") {
			string += div("Pflanzjahr", [div("icon"), data.Pflanzjahr])
		}

		return string
	}

	switch (type) {
		case "treeItem":
			return str = div("treeItem", [div("left t"+pictos[data.Gruppe]), div("right", [div("title", [data.Baumname_D]), div("subtitle", [data.Baumname_LAT]), div("values", [values(data)])])])
			break;
	}
}

/**
 * GEOLOCATION
 *
 * watchPosition: track geolocation and update userLocation if changed
 */
function watchPosition(resolve, reject, test) {
	if ("geolocation" in navigator) {
		navigator.geolocation.watchPosition(function(position) {

			userLocation.lat = position.coords.latitude
			userLocation.lon = position.coords.longitude

			// view.setCenter(proj4('EPSG:4326', 'EPSG:21781', [userLocation.lon, userLocation.lat]))
			featureUser.setGeometry(new ol.geom.Point(proj4('EPSG:4326', 'EPSG:21781', [userLocation.lon, userLocation.lat])))
			resolve()
		})
	} else {
		resolve()
	}
}

function toggle(id){
	layers[id].setVisible(!layers[id].getVisible())
}
