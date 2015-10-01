var state = {
	watchposition: true,
	geolocation: false,
	compass: false,
	user: {
		location: [8.545953265970327, 47.364551977441565],
		heading: 0
	},
	lastRequest: [8.545953265970327, 47.364551977441565],
	ready: {
		center: false
	},
	params: {
		r: 250
	},
	trees: {},
	treeList: [],
	wiki: {},
	proxy: "http://crossorigin.me/",
	satelite: false,
	search: false,
	searchPromise: undefined
}

$(function() {


	var promises = {}



	promises.initMap = new Promise(initMap)
	promises.initLocation = new Promise(initLocation).then(function() {
		promises.getTrees = new Promise(
			function(resolve, reject) {
				getTrees(resolve, reject, {
					location: state.user.location
				})
			}
		)

		Promise.all([promises.initMap, promises.getTrees]).then(function(trees, f) {

			details(trees[1][0].Baumnummer)

			initTrees(trees[1])
		})
	})

	Promise.all([promises.initMap, promises.initLocation]).then(function() {
		state.ready.center = true
		centerMap(state.user.location)
		initUser()
		$("#map").css("height", $("#map").height() + "px")
		$("#geolocation").css("top", ($("#map").height() - 64) + "px")
	})

	$("#geolocation").click(function() {
		state.watchposition = true
		if (state.ready.center) {
			centerMap(state.user.location)
			updateUser()
				// Rearrange Trees & Numbers
		}
	})

	// 	window.addEventListener( "scroll", function( event ) {
	//     count++;
	// });

	$(window).resize(function() {
		map.updateSize()
		clearTimeout($.data(this, 'scrollTimer'));
		$.data(this, 'scrollTimer', setTimeout(function() {

		}, 250));
	});

	$("header .btBack").click(function() {
		state.search = !state.search
		$("header, #results, #trees").toggleClass("search")

		if (state.search) {
			$("header .search").removeClass("hide")
			$("header .input").focus()
			$("header .input").html("")
		}
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
				var query = $(this).html()
				state.searchPromise = new Promise(function(resolve, reject) {
					getSearch(resolve, reject, query)
				})

				Promise.all([state.searchPromise]).then(function(data) {
					handleResults(data[0])
				})
			} else {
				$("#results #rInner").html("")
			}

		} else {
			$("header .search").removeClass("hide")
		}
	})

})

function checkForReload(mapCenter) {
	if (getDistanceFromLatLonInM(state.lastRequest, mapCenter) > state.params.r - 50) {
		new Promise(
			function(resolve, reject) {
				getTrees(resolve, reject, {
					location: mapCenter
				})
			}
		).then(function(trees) {
			updateTrees(trees)
		})
	}
}

function handleResults(data) {
	$("#results #rInner").html("")
	var resultTemplate = '<div class="rItem" treeId="{Baumnummer}" lon="{lon}" lat="{lat}"><div class="rTitle">{Baumname_D}</div><div class="rLat">{Baumname_LAT}</div><div class="rDetails">{distance} · {Strasse} · {Quartier}</div></div>'
	data.forEach(function(tree) {

		tree.distance = tree.dist < 1000 ? tree.dist + "m" : (Math.round(tree.dist / 100)) / 10 + "km"

		$("#results #rInner").append(template(resultTemplate, tree))
	})

	$(".rItem").click(function() {
		

		details($(this).attr("treeId"))

		createSearchTree([$(this).attr("lon"),$(this).attr("lat")])

		selectedFeature.setStyle(state.satelite ? treeStyles.lwhite : treeStyles.lgreen)


		// selectedFeature = feature
		// feature.setStyle(state.satelite ? treeStyles.white : treeStyles.green)

		var pan = ol.animation.pan({
			duration: 400,
			source: /** @type {ol.Coordinate} */ (map.getView().getCenter())
		});
		map.beforeRender(pan);
		centerMap([$(this).attr("lon"),$(this).attr("lat")]);
		hideSearch()

	})
}

function hideSearch(){
	state.search = !state.search
	$("header, #results, #trees").removeClass("search")
}