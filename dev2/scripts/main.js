var state = {
	watchposition: true,
	geolocation: false,
	compass: false,
	user: {
		location: [8.545953265970327, 47.364551977441565],
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
	//proxy: "http://crossorigin.me/",
	proxy: "https://cors-proxy.xiala.net/",
	satelite: false,
	search: false,
	searchTreesP: undefined,
	searchAddressesP: undefined,
	tileSize: 200,
	tiles: [],
}

$(function() {
	// Detect Mobile/Desktop Devices
	state.desktop = document.documentElement.clientWidth >= 800 ? true : false

	// initialize map (openlayers) and location (geolocation and heading)
	var initPromises = []
	initPromises.push(new Promise(initMap))
	initPromises.push(new Promise(initLocation))

	Promise.all(initPromises).then(function() {


		panTo(state.user.location)
		state.ready = true
		
		new Promise(checkForReload).then(function(trees) {
			var sortedTrees = sortTreesByDistance(trees)

			details(sortedTrees[0].Baumnummer)

			addSelectedTree([sortedTrees[0].lon, sortedTrees[0].lat])
			state.tree = [sortedTrees[0].lon, sortedTrees[0].lat]
			

			$("#splashscreen").addClass("hide")
		})

		initUser()

		if (!state.desktop) {
			// Overwrite CSS for mobile devices (window height might change when scrolling)
			$("#map").css("height", $("#map").height() + "px")
			$("#geolocation").css("top", ($("#map").height() - 114) + "px")
		}
	})

	$("#geolocation").click(function() {
		state.watchposition = true
		if (state.ready) {
			panTo(state.user.location)
			updateUser()
		}
	})

	$("#splashscreen").on("transitionend", function(){
		$(this).remove()
	})


	$("header .btBack").click(function() {
		state.search = !state.search
		$("header, #results, #trees").toggleClass("search")

		if (state.search) {
			$("header .search").removeClass("hide")
			$("header .input").focus()
			$("header .input").html("")
		}
	})

	$("header .btOpt").click(function() {
		$("#info").addClass("active")
	})

	$("#info .close").click(function() {
		$("#info").addClass("active")
	})

	$("header .input").click(function() {
		state.search = true
		$("header .search").removeClass("hide")
		$("header .input").html("")
		$("header, #results, #trees").addClass("search")
	})

	$("header .input").on("keyup", function() {
		if ($(this).html()) {
			$("header .search").addClass("hide")

			if ($(this).html().length >= 3) {
				makeSearch($(this).html())
			} else {
				$("#results #rInner").html("")
			}

		} else {
			$("header .search").removeClass("hide")
		}
	})

	$("#imgDetail .close").click(function() {
		$("#imgDetail").removeClass("active")
	})

	$("#info .close").click(function() {
		$("#info").removeClass("active")
	})


})

function checkForReload(resolve, reject) {
	if (!state.ready)
		return

	var tiles = generateTiles(map.getView().calculateExtent(map.getSize()))
	var tilePromises = []
	tiles.forEach(function(tile) {
		if (state.tiles.indexOf(tile[0] + "-" + tile[1]) == -1) {
			state.tiles.push(tile[0] + "-" + tile[1])
			tilePromises.push(new Promise(
				function(resolve, reject) {
					getTreeTile(resolve, reject, tile, tile[0] + "-" + tile[1])
				}
			))
		}
	})

	Promise.all(tilePromises).then(function(trees) {

		var merged = [].concat.apply([], trees);

		updateTrees(merged)
		resolve(merged)
	})
}

function generateTiles(extent) {
	extent.forEach(function(point, i) {
		extent[i] = point - point % state.tileSize
	})

	var lons = [extent[0], extent[2]]

	if (!(lons[1] - lons[0]) / state.tileSize) {
		lons = [lons[0]]
	} else {
		for (var i = 1; i < (lons[1] - lons[0]) / state.tileSize; i++) {
			lons.push(lons[0] + state.tileSize * i)
		}
	}

	var lats = [extent[1], extent[3]]
	if (!(lats[1] - lats[0]) / state.tileSize) {
		lats = [lats[0]]
	} else {
		for (var i = 1; i < (lats[1] - lats[0]) / state.tileSize; i++) {
			lats.push(lats[0] + state.tileSize * i)
		}
	}

	var tiles = []
	lons.forEach(function(lon) {
		lats.forEach(function(lat) {
			var coord1 = proj4('EPSG:21781', 'EPSG:4326', [lon, lat])
			var coord2 = proj4('EPSG:21781', 'EPSG:4326', [lon + state.tileSize, lat + state.tileSize])
			tiles.push([coord1[0], coord1[1], coord2[0], coord2[1]])
		})
	})

	return tiles
}

function hideSearch() {
	state.search = !state.search
	$("header, #results, #trees").removeClass("search")
}