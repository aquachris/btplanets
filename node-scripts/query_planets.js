'use strict';

var http = require('http');
var fs = require('fs');

// http request variables and functions
var requestCallback = function (response) {
};

var requestUrl = function (host, path, callback) {
	http.request({
		host : host,
		path : path,
	}, callback);
};

// http://www.sarna.net/wiki/Category:Planets
// http://www.sarna.net/wiki/Acala

var startingPlanet = 'A Place';
//startingPlanet = 'Azur';
//startingPlanet = 'Zwipadze';
var i = 0;
var requestNextPlanetBatch = function () {
	var host = 'http://www.sarna.net',
		path = '/wiki/index.php?title=Category:Planets&pagefrom='+encodeURIComponent(startingPlanet);

	console.log(host + path);
	http.get(host + path, function (res) {
		var body = '';
		res.setEncoding('utf-8');
		res.on('data', function (chunk) {
			body += chunk;
		}).on('end', function () {
			// parse and prepare planet list in body
			var idx = body.indexOf('<div id="mw-pages">');
			body = body.substring(idx);
			idx = body.indexOf('<div class="printfooter">');
			body = body.substring(0, idx);
			idx = body.indexOf('<li>');
			body = body.substring(idx);
			idx = body.indexOf('</div></div>');
			body = body.substring(0, idx);
			body = body.replace(/<span([^\r\n]+)\r?\n|\r/g, '');
			body = body.replace(/\<h3\>[^\<]+\<\/h3\>/g, '');
			body = body.replace(/\<ul\>/g, '');
			body = body.replace(/\<\/ul\>/g, '');
			body = body.replace(/\<li\>/g, '');
			body = body.replace(/\<\/li\>/g, '');
			body = body.replace(/\n+$/g, '');
			body = body.replace(/\<div class="mw-category-group"\>/g, '');
			body = body.replace(/\<\/div\>/g, '');

			// remove first line
			if(i > 0) {
				//body = body.replace(/(.+)\r?\n|\r/i, '');
			}

			var matches = body.match(/\<.+\>(.*)\<\/a\>$/i);
			if(!matches || matches.length < 2) {
				console.log('no more matches');
				return;
			}
			startingPlanet = matches[1];

			if(i === 0) {
				fs.writeFile('./planetNames.txt', body, function (err) {
					if(err) {
						return console.log('error!', err);
					}
					console.log('batch '+i+' written to file');
				});
			} else {
				fs.appendFile('./planetNames.txt', body, function (err) {
					if(err) {
						return console.log('error!', err);
					}
					console.log('batch '+i+' appended to file');
				});
			}
			i++;
			if(startingPlanet !== 'Úr Cruinne') {
				requestNextPlanetBatch();
			} else {
				console.log('DONE!');
			}
		});
		console.log('res: ' + res.statusCode);
		// find out last planet in the list
	}).on('error', function (e) {
		console.log('Error while requesting ' + host + path + ': ' + e.message);
	});
};

var main = function () {
	console.log('query_planets script started');
	// gather all planet pages on sarna wiki
	requestNextPlanetBatch();
};

main();
