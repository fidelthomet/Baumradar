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
	trees: [],
	treeList: []
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
		).then(function(trees) {
			initTrees(trees)
		})
	})

	Promise.all([promises.initMap, promises.initLocation]).then(function() {
		state.ready.center = true
		centerMap(state.user.location)
		initUser()
	})

	$("#geolocation").click(function(){
		state.watchposition = true
		if (state.ready.center) {
			centerMap(state.user.location)
			updateUser()
			// Rearrange Trees & Numbers
		}
	})
})

function checkForReload(mapCenter){
	if(getDistanceFromLatLonInM(state.lastRequest, mapCenter)>state.params.r){
		console.log("update")
		new Promise(
			function(resolve, reject) {
				getTrees(resolve, reject, {
					location: mapCenter
				})
			}
		).then(function(trees) {
			console.log(trees.length)
			updateTrees(trees)
		})
	}
}

