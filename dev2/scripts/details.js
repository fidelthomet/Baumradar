function details(tree) {
	new Promise(
		function(resolve, reject) {
			getDetails(resolve, reject, tree)
		}
	).then(function(tree) {

		createDetails(tree)

		tree.wikimediaCat = getWikimediaCat(tree)
		if (!state.wiki[tree.wikimediaCat]) {
			// state.wiki[tree.wikimediaCat] = {
			// 	loading: true
			// }
			new Promise(
				function(resolve, reject) {
					getWiki(resolve, reject, tree.wikimediaCat)
				}
			).then(function(data) {

				state.wiki[tree.wikimediaCat] = {
					imgs: data.imgs,
					extract: data.extract
				}
				addWikiDetails(tree.Baumnummer, data)
			})
		} else {
			addWikiDetails(tree.Baumnummer, state.wiki[tree.wikimediaCat])
		}
	})
}

function createDetails(tree) {

	cleanDetails(tree)

	var title = template(detailDom.title, tree)
	var details = template(detailDom.details, tree)

	var container = $(template(detailDom.container, tree))
	$(title + details).insertBefore(container.children(".images"))
	$("#trees").html($(container))

	updateDirection()

	initOverview(tree)
}

function addWikiDetails(Baumnummer, wiki) {
	if ($("#" + Baumnummer).length) {
		if (wiki.imgs) {
			if (wiki.imgs.length > 2) {
				var imgs = {
					img1: wikiThumb(wiki.imgs[0]),
					lurl1: wiki.imgs[0].licenceUrl,
					artist1: wiki.imgs[0].artist,
					licence1: wiki.imgs[0].licence,
					img2: wikiThumb(wiki.imgs[1]),
					lurl2: wiki.imgs[1].licenceUrl,
					artist2: wiki.imgs[1].artist,
					licence2: wiki.imgs[1].licence,
					img3: wikiThumb(wiki.imgs[2]),
					lurl3: wiki.imgs[2].licenceUrl,
					artist3: wiki.imgs[2].artist,
					licence3: wiki.imgs[2].licence
				}
				var domImgs = template(detailDom.images, imgs)
			} else {
				var imgs = {
					img1: wikiThumb(wiki.imgs[0]),
					lurl1: wiki.imgs[0].licenceUrl,
					artist1: wiki.imgs[0].artist,
					licence1: wiki.imgs[0].licence
				}
				var domImgs = template(detailDom.singleImage, imgs)
			}
			$("#" + Baumnummer + " .images").html(domImgs)
		} else {
			$("#" + Baumnummer + " .images").hide()
		}



		if (wiki.extract.extract) {
			var domExtr = template(detailDom.extract, wiki.extract)
			$("#" + Baumnummer + " .wiki").html(domExtr)
		} else {
			$("#" + Baumnummer + " .wiki").hide()
		}
	}
}

function getWikimediaCat(tree) {
	var wikimediaCat = tree.Baumgattung + "_" + tree.Baumart_LAT
	return wikimediaCat.replace(/ /g, '_');
}

function cleanDetails(tree) {
	tree.number = ""

	tree.height = tree.width = "-"

	switch (tree.Baumtyp.split(",")[0]) {
		case "Höhe:>20m":
			tree.height = "über 20m"
			break
		case "Höhe:10-20m":
			tree.height = "10-20m"
			break
		case "Höhe:<10m":
			tree.height = "bis 10m"
			break
	}

	switch (tree.Baumtyp.split(",")[1]) {
		case " Breite:>10m":
			tree.width = "über 10m"
			break
		case " Breite:<10m":
			tree.width = "bis 10m"
			break
	}

	tree.distance = "-"

	if (tree.Pflanzjahr == 0) {
		tree.Pflanzjahr = "-"
	}
}

var detailDom = {
	container: '<div id="{Baumnummer}" class="tree"><div class="images"></div><div class="wiki"></div><div id="overviewTitle">Vorkommen</div><div id="overview"></div>',
	title: '<div class="title"><div class="left"><div class="dir"></div><div class="num">{number}</div><div class="dist">{distance}</div></div><div class="border"></div><div class="right"><div class="ger">{Baumname_D}</div><div class="lat">{Baumname_LAT}</div></div></div>',
	details: '<div class="details">	<div class="detail year">{Pflanzjahr}</div>	<div class="detail height">{height}</div>	<div class="detail width">{width}</div>	<div class="detail baumnum">{Baumnummer}</div></div><div class="location"><div>{Strasse}, {Quartier}</div></div></div>',
	images: '<div class="img1" style="background-image:url({img1})" attr-artist="{artist1}" attr-licence="{licence1}" attr-lurl="{lurl1}"></div><div class="img2" style="background-image:url({img2})" attr-artist="{artist2}" attr-licence="{licence2}" attr-lurl="{lurl2}"></div><div class="img3" style="background-image:url({img3})" attr-artist="{artist3}" attr-licence="{licence3}" attr-lurl="{lurl3}"></div>',
	singleImage: '<div class="simg" style="background-image:url({img1})" attr-artist="{artist1}" attr-licence="{licence1}" attr-lurl="{lurl1}"></div>',
	extract: '{extract} <a href="{url}">Wikipedia</a>'
}