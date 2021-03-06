var config = {
	url: {
		// MAP
		wmtsXml: "https://cors-proxy.xiala.net/http://www.gis.stadt-zuerich.ch/wmts/wmts-zh-stzh-ogd.xml",
		wmtsXmlLocal: "wmts.xml", // fallback
		// API - Search
		searchTrees: "http://api.flaneur.io/baumkataster/search/{query}/limit=15&lon={lon}&lat={lat}",
		searchAddresses: "http://api.flaneur.io/zadressen/search/{query}/limit=15"
	},
	dom: {
		// SEARCH - Results
		resultTree: '<div class="rTreeItem" treeId="{Baumnummer}" lon="{lon}" lat="{lat}"><div class="rTitle">{Baumname_D}</div><div class="rLat">{Baumname_LAT}</div><div class="rDetails">{dist} · {Strasse} · {Quartier}</div></div>',
		resultAddress: '<div class="rAddressItem" lon="{lon}" lat="{lat}"><div class="rTitle">{Adresse}</div><div class="rDetails">{dist} · {PLZ} · {StatQuartier}</div></div>',
	}
}

var state = {
	watchposition: true,
	geolocation: false,
	compass: false,
	user: {
		location: [8.545079, 47.366989],
		defaultLocation: [8.545079, 47.366989],
		heading: 0
	},
	lastRequest: [8.545953265970327, 47.364551977441565],
	tree: [8.545953265970327, 47.364551977441565],
	params: {
		r: 250
	},
	trees: {},
	treeList: [],
	wiki: {},
	proxy: "https://cors-proxy.xiala.net/",
	aerial: false,
	search: false,
	searchTreesP: undefined,
	searchAddressesP: undefined,
	tileSize: .002,
	tileCount: 0,
	reqTiles: [],
	ready: false,
	autoRefresh: false,
	highlight: {},
	layers: {},
	styles: {}
}

$(function() {
	if (localStorage.getItem("geo")) {
		$("#splashscreen .text").hide();
		if(localStorage.getItem("geo")=="outofbounds"){
			localStorage.removeItem("geo")
			goToFail('Ihr aktueller Aufenthaltsort ist ausserhalb von Zürich')
			init(false);
		} else {
			init(true);
		}
		
	} else {
		$("#allowgeo").click(function() {
			init(true);
			$("#splashscreen .text").css("opacity", 0);
			localStorage.setItem("geo", true);
		})
		$("#denygeo").click(function() {
			$("#splashscreen .text").css("opacity", 0);
			init(false);
		})
	}
})

// --
// init
// --
// initializes everything
// --
function init(askForLocation) {
	// show (fake) progress bar
	NProgress.start();
	$("#splashscreen .ani").each(function(i, el){
		$(el).css("animation-name", Math.random() < 5 ? "ani1" : "ani2")
	})
	// Detect Mobile/Desktop Devices
	state.desktop = document.documentElement.clientWidth >= 800 ? true : false
	if (!state.desktop) {
		// Overwrite CSS for mobile devices (window height might change when scrolling)
		$("#map").css("height", $("#map").height() + "px")
		$("#geolocation").css("top", ($("#map").height() - 114) + "px")
		$("#mapchange").css("top", ($("#map").height() - 114) + "px")
	}

	// initialize map (openlayers) and location (geolocation and heading)
	var initPromises = []
	initPromises.push(new Promise(initMap))
	if (askForLocation)
		initPromises.push(new Promise(initLocation))

	Promise.all(initPromises).then(function() {
		// finish initialization 
		// center map on user location, show map, draw user 
		panTo(state.user.location, true)
		state.layers.map.setVisible(true)
		initUser()

		// Get trees for current location, then finish init (or wait until first map tile is loaded)$
		Promise.all([new Promise(refreshTrees), state.tilesLoadEnd]).then(finishInit)
	})

	initEvents()
}

// --
// finishInit
// --
// finishes initialization
// --
function finishInit(arr) {
	// finish progress bar
	NProgress.done();

	var trees = arr[0]
	// reset view if user is to far away from any tree and therefore probably not in zurich
	if (!trees.length) {
		panTo(state.user.defaultLocation, true)
		state.geolocation = false
		$("#geolocation").remove()
		new Promise(refreshTrees).then(finishInit)
		return
	}

	// highlight closest tree
	var closestTree = sortByDist(trees)[0]
	highlightTree([closestTree.lon, closestTree.lat])
	details(closestTree.Baumnummer)

	// hide splashscreen
	$("#splashscreen").addClass("hide")
	// automaticly refresh trees if map section changes
	state.autoRefresh = true
}

// -- 
// refreshTrees
// --
// handles requesting (if requiered) and displaying trees for current map section
// to optimize data usage and to prevent requesting trees mutliple times hte map is split into multiple tiles
// --
function refreshTrees(resolve, reject) {
	// calculate extents of tiles in current map section
	var tiles = calcTileExtents()



	// request trees for each tile if it's not already loaded/requested
	var tilePromises = []
	tiles.forEach(function(tile) {
		if (state.reqTiles.indexOf(tile[0] + "-" + tile[1]) == -1) {
			state.reqTiles.push(tile[0] + "-" + tile[1])
			tilePromises.push(new Promise(
				function(resolve, reject) {
					getTreeTile(resolve, reject, tile, tile[0] + "-" + tile[1])
				}
			))
		}
	})

	Promise.all(tilePromises).then(function(trees) {
		// merge all requested trees into one array
		var merged = [].concat.apply([], trees);
		// add new trees to map
		updateTrees(merged)

		if (resolve){
			resolve(merged)
		}
	})
}

// --
// calcTilesExtents
// --
// 1) determines extent (x1,y1,x2,y2) of current view
// 2) calculates points (x1,y1) of corresponding tiles
// 3) fills in missing tiles / removes duplicates
// 4) converts points from 'EPSG:21781' to 'EPSG:4326'
// 5) returns array of tile extents
// --
function calcTileExtents() {

	var section = map.getView().calculateExtent(map.getSize())
	var s1 = proj4('EPSG:21781', 'EPSG:4326', [section[0], section[1]])
	var s2 = proj4('EPSG:21781', 'EPSG:4326', [section[2], section[3]])
	section = [s1[0],s1[1],s2[0],s2[1]]
	console.log(section)

	

	section.forEach(function(point, i) {
		section[i] = point - point % state.tileSize
	})

	var lons = [section[0], section[2]]

	if (!(lons[1] - lons[0]) / state.tileSize) {
		lons = [lons[0]]
	} else {
		for (var i = 1; i < (lons[1] - lons[0]) / state.tileSize; i++) {
			lons.push(lons[0] + state.tileSize * i)
		}
	}

	var lats = [section[1], section[3]]
	if (!(lats[1] - lats[0]) / state.tileSize) {
		lats = [lats[0]]
	} else {
		for (var i = 1; i < (lats[1] - lats[0]) / state.tileSize; i++) {
			lats.push(lats[0] + state.tileSize * i)
		}
	}

	var tiles = []
	var tiles2 = []

	console.log(lons)
	console.log(lats)
	lons.forEach(function(lon) {
		lats.forEach(function(lat) {
			var coord1 = [lon, lat]
			var coord2 = [lon + state.tileSize, lat + state.tileSize]
			tiles.push([coord1[0], coord1[1], coord2[0], coord2[1]])
			tiles2.push([lon, lat, lon + state.tileSize, lat + state.tileSize])
		})
	})
	console.log(JSON.stringify(tiles))
	console.log(JSON.stringify(tiles2))

	return tiles
}

// --
// hide search
// --
// leave search state
// --
function hideSearch() {
	state.search = !state.search
	$("header, #results, #trees").removeClass("search")
}

// --
// initEvents
// --
// adds eventlisteners
// --
function initEvents() {
	// center map on user and activate tracking
	$("#geolocation").click(function() {
		state.watchposition = true
		if (state.ready) {
			panTo(state.user.location)
			updateUser()
		}
	})

	$("#mapchange").click(function() {
		$(this).toggleClass("map")
		toggleLayers()
	})

	// remove splashscreen after fadeout
	$("#splashscreen").on("transitionend", function() {
		$(this).remove()
	})
	// but not if other elements fade out
	$("#splashscreen .text").on("transitionend", function(e) {
		e.stopPropagation()
	})
	$("#splashscreen .ani").on("transitionend", function(e) {
		e.stopPropagation()
	})

	// toggle search state
	$("header .btBack").click(function() {
		state.search = !state.search
		$("header, #results, #trees").toggleClass("search")

		if (state.search) {
			$("header .search").removeClass("hide")
			$("header .input").focus()
			$("header .input").html("")
		}
	})

	// enter info state
	$("header .btOpt").click(function() {
		$("#info").toggleClass("active")
	})

	// leave info state
	$("#info .close").click(function() {
		$("#info").removeClass("active")
	})

	// enter search state
	$("header .input").click(function() {
		state.search = true
		$("header .search").removeClass("hide")
		$("header .input").html("")
		$("header, #results, #trees").addClass("search")
	})

	// search
	$("header .input").on("keyup", function() {
		var input = $(this).html()
		if (input) {
			$("header .search").addClass("hide")
			searchFor(input.replace(/\&nbsp;/g, " ")) // replace '&nbsp;' with ' '
		} else {
			$("header .search").removeClass("hide")
			$("#results #rInner").html("")
		}
	})

	// leave image state
	$("#imgDetail .close").click(function() {
		$("#imgDetail").removeClass("active")
	})
}

function goToFail(msg) {
	alert(msg)
}