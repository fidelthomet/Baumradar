function getTrees(resolve, reject, params) {

	var url = "http://api.flaneur.io/baumkataster/"

	if (params.location) {
		url += "loc/" + params.location[0] + "/" + params.location[1]
		state.lastRequest = [params.location[0], params.location[1]]
	}

	$.get(url, function(data) {
		var trees = JSON.parse(data)

		if (!state.treeList.length) {
			trees.forEach(function(tree) {
				state.treeList.push(tree.Baumnummer)
			})
			resolve(trees)
		} else {
			var newTrees = []
			trees.forEach(function(tree) {
				if (state.treeList.indexOf(tree.Baumnummer) == -1) {
					state.treeList.push(tree.Baumnummer)
					newTrees.push(tree)
				}
			})
			resolve(newTrees)
		}
	})
}

function getTreeTile(resolve, reject, tile) {
	var url = "http://api.flaneur.io/baumkataster/area"
	tile.forEach(function (item){
		url+="/"+item
	})

	$.get(url).success(function(data) {
		resolve(JSON.parse(data))
	}).fail(function(){
		state.reqTiles.splice(state.reqTiles.indexOf(tile[0] + "-" + tile[1]), 1)
		resolve()
	})
}

function getDetails(resolve, reject, tree) {

	var url = "http://api.flaneur.io/baumkataster/tree/" + tree

	$.get(url, function(data) {
		resolve(JSON.parse(data)[0])
	})
}

function getWiki(resolve, reject, wikimediaCat) {
	var url = state.proxy + "https://commons.wikimedia.org/w/api.php?action=query&format=json&list=categorymembers&rawcontinue&cmtype=file&cmtitle=Category:"
	url += wikimediaCat

	var wikiPromises = []

	wikiPromises.push(new Promise(function(res, rej) {

		$.get(url, function(data) {
			var titles = ""

			data.query.categorymembers.forEach(function(item) {
				if (!titles)
					titles = item.title
				else
					titles += "|" + item.title
			})

			var url = state.proxy + "https://commons.wikimedia.org/w/api.php?action=query&titles=" + titles + "&prop=imageinfo&iiprop=url|size|extmetadata&format=json&rawcontinue"

			$.get(url, function(data) {
				
				var imgs = []
				if(!data.query){
					res()
					return
				}

				$.each(data.query.pages, function(index, item) {
					var img = item.imageinfo[0]
					if (img.extmetadata.Artist)
						imgs.push({
							url: img.url,
							height: img.height,
							width: img.width,
							artist: cleanArtist(img.extmetadata.Artist.value),
							licence: img.extmetadata.LicenseShortName.value,
							licenceUrl: img.extmetadata.LicenseUrl ? img.extmetadata.LicenseUrl.value : "",
						})
				})
				res(imgs)
			})
		})
	}))

	wikiPromises.push(new Promise(function(res, rej) {
		var url = state.proxy + "https://de.wikipedia.org/w/api.php?action=query&prop=extracts&format=json&exintro=&explaintext=&iwurl=&rawcontinue=&titles=" + wikimediaCat + "&redirects="

		$.get(url, function(data) {
			
			var url = "https://de.wikipedia.org/wiki/" + data.query.pages[Object.keys(data.query.pages)[0]].title
			var extract = data.query.pages[Object.keys(data.query.pages)[0]].extract

			res({
				url: url,
				extract: extract
			})
		})
	}))

	Promise.all(wikiPromises).then(function(data) {
		resolve({imgs: data[0], extract: data[1]})
	})
}

function getDistricts(resolve, reject){
	var url = state.proxy + "https://data.stadt-zuerich.ch/storage/f/stadtkreis/stadtkreis.json"

	$.get(url, function(data) {
		resolve(data)
	})
}

function getLocations(resolve, reject, name){
	var url = "http://api.flaneur.io/baumkataster/trees/Baumname_LAT="+name

	$.get(url, function(data) {
		resolve(JSON.parse(data))
	})
}

function tempTrees(resolve, reject, query){
	var url = "http://api.flaneur.io/baumkataster/search/"+query+"/limit=15&lon="+state.user.location[0]+"&lat="+state.user.location[1]
	
	$.get(url, function(data) {
		
		resolve(JSON.parse(data))
	})
}

function searchAddresses(resolve, reject, query){
	var url = "http://api.flaneur.io/zadressen/search/"+query+"/limit=15"
	
	$.get(url, function(data) {
		resolve(JSON.parse(data))
	})
}

function getZuerichsee(resolve, reject){
	var url = "Zuerichsee.json"

	$.get(url, function(data) {
		resolve(data)
	})
}
