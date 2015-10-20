// --
// searchFor
// --
// Initiate Search for Trees and Addresses 
// --
function searchFor(query) {
	state.searchPromises = []

	state.searchPromises.push(new Promise(function(res, rej) {
		getByUrl(res, rej, "http://api.flaneur.io/baumkataster/search/" + query + "/limit=15&lon=" + state.user.location[0] + "&lat=" + state.user.location[1], {
			parse: true
		})
	}))
	state.searchPromises.push(new Promise(function(res, rej) {
		getByUrl(res, rej, "http://api.flaneur.io/zadressen/search/" + query + "/limit=15", {
			parse: true
		})
	}))

	Promise.all(state.searchPromises).then(function(data) {
		showResults(data)
	})
}

// --
// showResults
// --
// Display Search Results
// --
function showResults(data) {

	$("#results #rInner").html("")

	// add results for trees
	data[0].forEach(function(tree) {
		tree.dist = formatDist(tree.dist)
		$("#results #rInner").append(template(config.dom.resultTree, tree))
	})

	// add results for addresses
	data[1].forEach(function(address) {
		address.dist = formatDist(getDistanceFromLatLonInM([address.lon, address.lat], state.user.location))
		$("#results #rInner").append(template(config.dom.resultAddress, address))
	})

	// highlight tree on click
	$(".rTreeItem").click(function() {
		state.watchposition = false;

		highlightTree([$(this).attr("lon"), $(this).attr("lat")], true)
		details($(this).attr("treeId"))
		
		hideSearch()

	})

	// highlight address on click
	$(".rAddressItem").click(function() {
		state.watchposition = false;

		if (activeAddress) {
			state.layers.user.getSource().removeFeature(activeAddress)
		}

		activeAddress = new ol.Feature({
			geometry: new ol.geom.Point(proj4('EPSG:4326', 'EPSG:21781', [$(this).attr("lon"), $(this).attr("lat")]))
		});

		style = new ol.style.Style({
			image: new ol.style.Icon(({
				src: 'svg/user-accent.svg',
				size: [40, 40]
			}))
		});

		activeAddress.setStyle(style)
		state.layers.user.getSource().addFeature(activeAddress)

		panTo([$(this).attr("lon"), $(this).attr("lat")]);
		hideSearch()
	})
}