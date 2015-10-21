// --
// details
// --
// create detail-view from tree id 
// --
function details(tree) {
	// fade out last detail view
	$("#trees .tree").removeClass("active")

	new Promise(
		// get metadata from baumkataster api
		function(resolve, reject) {
			getDetails(resolve, reject, tree)
		}
	).then(function(tree) {
		// display metadata
		createDetails(tree)

		// generate overview map
		initOverview(tree)

		// generate wikimedia-category name related to selected tree
		tree.wikimediaCat = getWikimediaCat(tree)

		// load wikipedia article and wikimedia images (only if those aren't loaded already)
		if (!state.wiki[tree.wikimediaCat]) {
			new Promise(
				function(resolve, reject) {
					getWiki(resolve, reject, tree.wikimediaCat)
				}
			).then(function(data) {
				// store retrieved data
				state.wiki[tree.wikimediaCat] = {
						imgs: data.imgs,
						extract: data.extract
					}
					// append retrieved data
				addWikiDetails(tree.Baumnummer, data)
			})
		} else {
			// append wiki data
			addWikiDetails(tree.Baumnummer, state.wiki[tree.wikimediaCat])
		}
	})
}

// --
// createDetails
// --
// build dom for tree details
// --
function createDetails(tree) {

	// make metadata human readable
	cleanDetails(tree)

	// create title dom (if geolocation is available, also show distance and direction to tree)
	var title = state.geolocation ? template(detailDom.titleGeo, tree) : template(detailDom.title, tree)

	// create dom for metadata and for overall structure
	var details = template(detailDom.details, tree)
	var container = $(template(detailDom.container, tree))

	// stitch dom together and insert result
	$(title + details).insertBefore(container.children(".images"))
	$("#trees").html($(container))

	// update heading of direction icon
	updateDirection()
}

// --
// addWikiDetails
// --
// display wikimedia & -pedia data
// --
function addWikiDetails(Baumnummer, wiki) {
	if ($("#" + Baumnummer).length) {
		// create dom for images (only if images are available, chooses layout depending on amount of available images)
		if (wiki.imgs) {
			if (wiki.imgs.length > 2) {
				var imgs = {
					img1: wikiThumb(wiki.imgs[0]), // create thumbnail url
					imgf1: wikiThumb(wiki.imgs[0], true), // create thumbnail url for fullscreen view
					lurl1: wiki.imgs[0].descriptionurl, // image description url
					artist1: wiki.imgs[0].artist, // artist name
					licence1: wiki.imgs[0].licence, // licence
					img2: wikiThumb(wiki.imgs[1]),
					imgf2: wikiThumb(wiki.imgs[1], true),
					lurl2: wiki.imgs[1].descriptionurl,
					artist2: wiki.imgs[1].artist,
					licence2: wiki.imgs[1].licence,
					img3: wikiThumb(wiki.imgs[2]),
					imgf3: wikiThumb(wiki.imgs[2], true),
					lurl3: wiki.imgs[2].descriptionurl,
					artist3: wiki.imgs[2].artist,
					licence3: wiki.imgs[2].licence
				}
				var domImgs = template(detailDom.images, imgs)
			} else {
				var imgs = {
					img1: wikiThumb(wiki.imgs[0]),
					lurl1: wiki.imgs[0].descriptionurl,
					artist1: wiki.imgs[0].artist,
					licence1: wiki.imgs[0].licence
				}
				var domImgs = template(detailDom.singleImage, imgs)
			}
			// append images and add eventlistener to enable fullscreen view
			$("#" + Baumnummer + " .images").html(domImgs)
			$("#" + Baumnummer + " .images .img").click(function() {
				console.log($(this).attr("attr-bg"))
				$("#imgDetail").css("background-image", "url(" + $(this).attr("attr-bg") + ")")
				$("#imgDetail").addClass("active")
				$("#imgDetail .licence a").html("Image by " + $(this).attr("attr-artist") + "<br/>Licence: " + $(this).attr("attr-licence"))
				$("#imgDetail .licence a").attr("href", $(this).attr("attr-lurl"))
			})
		} else {
			$("#" + Baumnummer + " .images").hide()
		}

		// append wikipedia extract
		if (wiki.extract.extract) {
			var domExtr = template(detailDom.extract, wiki.extract)
			$("#" + Baumnummer + " .wiki").html(domExtr)
		} else {
			$("#" + Baumnummer + " .wiki").hide()
		}
	}
	// fade in detail view
	$("#trees .tree").addClass("active")
}

// --
// getWikimediaCat
// --
// generate wikimedia category name based on Baumgattung und Baumart_LAT. This works for most trees.
// --
function getWikimediaCat(tree) {
	var wikimediaCat = tree.Baumgattung + "_" + tree.Baumart_LAT
	return wikimediaCat.replace(/ /g, '_').replace(/_x_/g, '_×_');
}

// --
// cleanDetails
// --
// make them more human readable
// --
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

// dom templates
var detailDom = {
	container: '<div id="{Baumnummer}" class="tree"><div class="images"></div><div class="wiki"></div><div id="overviewTitle">Vorkommen</div><div id="overview"></div>',
	titleGeo: '<div class="title"><div class="left"><div class="dir"></div><div class="num">{number}</div><div class="dist">{distance}</div></div><div class="border"></div><div class="right geo"><div class="ger">{Baumname_D}</div><div class="lat">{Baumname_LAT}</div></div></div>',
	title: '<div class="title"><div class="right"><div class="ger">{Baumname_D}</div><div class="lat">{Baumname_LAT}</div></div></div>',
	details: '<div class="details">	<div class="detail year">{Pflanzjahr}</div>	<div class="detail height">{height}</div>	<div class="detail width">{width}</div>	<div class="detail baumnum">{Baumnummer}</div></div><div class="location"><div>{Strasse}, {Quartier}</div></div></div>',
	images: '<div class="img1 img" style="background-image:url({img1})" attr-bg="{imgf1}" attr-artist="{artist1}" attr-licence="{licence1}" attr-lurl="{lurl1}"></div><div class="img2 img" style="background-image:url({img2})" attr-bg="{imgf2}" attr-artist="{artist2}" attr-licence="{licence2}" attr-lurl="{lurl2}"></div><div class="img3 img" style="background-image:url({img3})" attr-bg="{imgf3}" attr-artist="{artist3}" attr-licence="{licence3}" attr-lurl="{lurl3}"></div>',
	singleImage: '<div class="simg img" style="background-image:url({img1})" attr-bg="{imgf1}" attr-artist="{artist1}" attr-licence="{licence1}" attr-lurl="{lurl1}"></div>',
	extract: '{extract} <a target="_blank" href="{url}">Wikipedia</a>'
}