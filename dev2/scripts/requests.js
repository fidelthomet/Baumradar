// --
// getTreeTile
// --
// request all trees in specified tile
// --
function getTreeTile(resolve, reject, tile) {
	var url = "http://api.flaneur.io/baumkataster/area/"
	url += tile.join("/")

	$.get(url).success(function(data) {
		// return parsed result
		resolve(JSON.parse(data))
	}).fail(function() {
		// remove tile from state.reqTiles, it might work next time :)
		state.reqTiles.splice(state.reqTiles.indexOf(tile[0] + "-" + tile[1]), 1)
		resolve()
	})
}

// --
// getDetails
// --
// request tree details by Baumnummer
// --
function getDetails(resolve, reject, Baumnummer) {
	var url = "http://api.flaneur.io/baumkataster/tree/" + Baumnummer

	$.get(url).success(function(data) {
		// return parsed result
		resolve(JSON.parse(data)[0])
	}).fail(function(){
		goToFail("Details konnten nicht geladen werden, bitte später erneut versuchen.")
		reject()
	})
}

// --
// getWiki
// --
// request wikicommons images and wikipedia article by wikimediaCat
// --
function getWiki(resolve, reject, wikimediaCat) {
	var wikiPromises = []

	// request images
	wikiPromises.push(new Promise(function(res, rej) {
		// get category contents (hopefully there is one)
		var url = state.proxy + "https://commons.wikimedia.org/w/api.php?action=query&format=json&list=categorymembers&rawcontinue&cmtype=file&cmtitle=Category:"
		url += wikimediaCat
		$.get(url, function(data) {

			// Stringify image titles
			var titles = ""
			data.query.categorymembers.forEach(function(item, index) {
				titles += titles ? "|" + item.title : item.title
			})

			// get images
			var url = state.proxy + "https://commons.wikimedia.org/w/api.php?action=query&titles=" + titles + "&prop=imageinfo&iiprop=url|size|extmetadata&format=json&rawcontinue"
			$.get(url, function(data) {

				if (!data.query) {
					res()
					return
				}

				// create image objects, storing only relevant metadata
				var imgs = []
				$.each(data.query.pages, function(index, item) {
						var img = item.imageinfo[0]
						if (img.extmetadata.Artist)
							imgs.push({
								url: img.url,
								descriptionurl: img.descriptionurl,
								height: img.height,
								width: img.width,
								artist: cleanArtist(img.extmetadata.Artist.value), // Sometimes there come some HTML with the artists name, we don't want that.
								licence: img.extmetadata.LicenseShortName.value,
							})
					})
					// resolve images
				res(imgs)
			})
		})
	}))

	// request article
	wikiPromises.push(new Promise(function(res, rej) {
		// get the articles first paragraph (hopefully wiki will redirect us from the latin name to the actual article)
		var url = state.proxy + "https://de.wikipedia.org/w/api.php?action=query&prop=extracts&format=json&exintro=&explaintext=&iwurl=&rawcontinue=&titles=" + wikimediaCat + "&redirects="
		$.get(url, function(data) {
			// create and resolve article object
			res({
				url: "https://de.wikipedia.org/wiki/" + data.query.pages[Object.keys(data.query.pages)[0]].title,
				extract: data.query.pages[Object.keys(data.query.pages)[0]].extract,
				title: data.query.pages[Object.keys(data.query.pages)[0]].title
			})
		})
	}))

	// resolve image and extract
	Promise.all(wikiPromises).then(function(data) {
		resolve({
			imgs: data[0],
			extract: data[1]
		})
	})
}

// --
// getByUrl
// --
// get and resolve data from specified url (uses proxy if p.proxy is true, parses data if p.parse is true)
// --
function getByUrl(resolve, reject, url, p) {
	!p && (p = {}) // create empty object if p is not defined
	$.get(p.proxy ? state.proxy + url : url, function(data) {
		resolve(p.parse ? JSON.parse(data) : data)
	})
}

function searchTrees(resolve, reject, query) {
	$.get(url, function(data) {
		resolve(JSON.parse(data))
	})
}

function searchAddresses(resolve, reject, query) {
	var url = "http://api.flaneur.io/zadressen/search/" + query + "/limit=15"

	$.get(url, function(data) {
		resolve(JSON.parse(data))
	})
}