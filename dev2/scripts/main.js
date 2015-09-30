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
	proxy: "http://crossorigin.me/"
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
		$("#map").css("height", $("#map").height()+"px")
		$("#geolocation").css("top", ($("#map").height()-64)+"px")
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