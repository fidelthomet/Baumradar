function getDistanceFromLatLonInM(lastRequest, mapCenter) {
	//based on http://stackoverflow.com/questions/18883601/function-to-calculate-distance-between-two-coordinates-shows-wrong

	var R = 6371; // Radius of the earth in km
	var dLat = deg2rad(mapCenter[1] - lastRequest[1]); // deg2rad below
	var dLon = deg2rad(mapCenter[0] - lastRequest[0]);
	var a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos(deg2rad(lastRequest[1])) * Math.cos(deg2rad(mapCenter[1])) *
		Math.sin(dLon / 2) * Math.sin(dLon / 2);
	var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	var d = R * c * 1000; // Distance in km
	return Math.round(d);
}

function deg2rad(deg) {
	return deg * (Math.PI / 180)
}

function template(dom, object){
	return dom.replace(/{(\w+)}/g, function(_,k){
      return object[k];
	});
}

function cleanArtist(artist){
	if(artist.indexOf("</a>")!=-1){
		// console.log(artist)
		return artist.split('">')[1].split("</a>")[0]
	} else {
		return artist
	}
}

function wikiThumb(img){
	var factor = Math.round(window.devicePixelRatio*window.innerWidth)
	
	if(img.width<=factor)
		return img.url

	var url = img.url.split("/commons/").join("/commons/thumb/").split("/")
	url.push(factor+"px-"+url[url.length-1])

	return url.join("/")
}

