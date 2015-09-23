var express = require('express');
var fs = require("fs");
var request = require('request');
var time = require('time');
var CronJob = require('cron').CronJob;

var app = express();

var trees = "oh"

var file = "trees.db";
var exists = fs.existsSync(file);

var sqlite3 = require("sqlite3").verbose();
var db = new sqlite3.Database(file);

var dict = {
	"Baumname_D": "nameD",
	"Status": "status",
	"Quartier": "district",
	"Baumname_LAT": "nameLAT",
	"Strasse": "street",
	"Baumnummer": "treeID",
	"Baumart_LAT": "species",
	"Pflanzjahr": "year",
	"Kategorie": "category",
	"Baumtyp": "type",
	"Baumgattung": "genus",

	"nameD": "Baumname_D",
	"status": "Status",
	"district": "Quartier",
	"nameLAT": "Baumname_LAT",
	"street": "Strasse",
	"treeID": "Baumnummer",
	"species": "Baumart_LAT",
	"year": "Pflanzjahr",
	"category": "Kategorie",
	"type": "Baumtyp",
	"genus": "Baumgattung"
}

app.get('/', function(req, res) {
	console.log(req)
		// res.type('text/plain'); // set content-type
		//	res.send(trees); // send text response
});

app.get('/loc/:lat/:lon', function(req, res) {

	var params = {
		location: {
			lat: req.params.lat,
			lon: req.params.lon
		}
	}

	queryTrees(params, res)
});



app.listen(process.env.PORT || 4730);


// var stmt = db.prepare("INSERT INTO Stuff VALUES (?)");

// //Insert random data
//   var rnd;
//   for (var i = 0; i < 10; i++) {
//     rnd = Math.floor(Math.random() * 10000000);
//     stmt.run("Thing #" + rnd);
//   }

// stmt.finalize();

// db.each("SELECT rowid AS id, thing FROM Stuff", function(err, row) {
//     console.log(row.id + ": " + row.thing);
//   });
// });

//CRON
new CronJob('* * 04 * * *', function() {
	getTrees()
}, null, true, "Europe/Zurich");

function getTrees() {
	var url = 'https://data.stadt-zuerich.ch/storage/f/baumkataster/baumkataster.json'
	console.log("-")

	request(url, function(err, resp, body) {
		console.log("_")
		if (err)
			throw err;

		trees = body;
		var arr = JSON.parse(body);
		console.log(arr.name)
		console.log(arr.type)
		console.log(arr.features[0])


		db.serialize(function() {

			db.run("DROP TABLE Trees");
			db.run("CREATE TABLE Trees (lat FLOAT, lon FLOAT, treeID TEXT, nameD TEXT, nameLAT TEXT, genus TEXT, species TEXT, district TEXT, street TEXT, status TEXT, category TEXT, type TEXT, year INT)");
			var stmt = db.prepare("INSERT INTO Trees (lat, lon, treeID, nameD, nameLAT, genus, species, district, street, status, category, type, year) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)");

			arr.features.forEach(function(item, index) {
				// console.log(item.properties.Baumgattung)
				var props = item.properties
				stmt.run(item.geometry.coordinates[1], item.geometry.coordinates[0], props[dict.treeID], props[dict.nameD], props[dict.nameLAT], props[dict.genus], props[dict.species], props[dict.district], props[dict.street], props[dict.status], props[dict.category], props[dict.type], props[dict.year])
			})
			stmt.finalize(function() {
				console.log("DB updated at" + new Date().getTime())
			});
			//console.log(new Date().getTime())
			var counter = 0;
			db.each("SELECT (lon, lat, treeID, nameD, nameLAT, genus, species, district, street, status, category, type, year) FROM Trees", function(err, row) {
				//console.log(row);
				counter++;
			}, function() {
				console.log("done: " + counter + " results")
			});
		})
	})
}

//getTrees()

function logTrees() {
	db.serialize(function() {
		var counter = 0;
		var lat = 47.371507
		var lon = 8.544250
		console.log(pointToArea(lat, lon))
		db.each("SELECT lon, lat, treeID, nameD, nameLAT, genus, species, district, street, status, category, type, year FROM Trees WHERE" + pointToArea(lat, lon), function(err, row) {
			//db.each("SELECT lon, lat, treeID, nameD, nameLAT, genus, species, district, street, status, category, type, year FROM Trees ", function(err, row) {
			counter++;
			console.log(row.genus)
		}, function() {
			console.log("done: " + counter + " results")
		});
	})
}

//logTrees()

function queryTrees(params, res) {
	var sql = ""
	if (params.location) {
		sql = pointToArea(params.location.lat, params.location.lon)
	}


	var response = []

	db.serialize(function() {
		db.each("SELECT lon, lat, treeID, nameD, nameLAT, genus, species, district, street, status, category, type, year FROM Trees WHERE" + sql, function(err, row) {
			if (params.location) {
				row.dist = getDistanceFromLatLonInM(params.location.lat, params.location.lon, row.lat, row.lon)
			}

			response.push(row)
		}, function(e, f) {
			console.log("done: " + f + " results")

			if (params.location) {
				response.sort(sortByDist)
				// response.forEach(function(item, index) {
				// 	console.log(item.dist)
				// })
				res.type('text/plain'); // set content-type
				res.json(response); // send text response
			}



		});
	})


}

function pointToArea(lat, lon, r, returnObject) {
	// based on http://stackoverflow.com/questions/1253499/simple-calculations-for-working-with-lat-lon-km-distance

	lat = parseFloat(lat)
	lon = parseFloat(lon)

	if (!r)
		r = .5

	var rObject = {
		lat1: lat - r / 110.574,
		lat2: lat + r / 110.574,
		lon1: lon - r / (111.320 * Math.cos(lat * 0.0174532925)),
		lon2: lon + r / (111.320 * Math.cos(lat * 0.0174532925))
	}

	if (returnObject)
		return rObject;
	else
		return " lat >= " + rObject.lat1 + " AND lat <= " + rObject.lat2 + " AND lon >= " + rObject.lon1 + " AND lon <=" + rObject.lon2 + " ";

}

function getDistanceFromLatLonInM(lat1, lon1, lat2, lon2) {
	var R = 6371; // Radius of the earth in km
	var dLat = deg2rad(lat2 - lat1); // deg2rad below
	var dLon = deg2rad(lon2 - lon1);
	var a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
		Math.sin(dLon / 2) * Math.sin(dLon / 2);
	var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	var d = R * c * 1000; // Distance in km
	return Math.round(d);
}

function deg2rad(deg) {
	return deg * (Math.PI / 180)
}

function sortByDist(a, b) {
	if (a.dist < b.dist)
		return -1;
	if (a.dist > b.dist)
		return 1;
	return 0;
}