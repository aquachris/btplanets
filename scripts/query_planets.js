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
			idx = body.indexOf('<tr');
			body = body.substring(idx);
			idx = body.indexOf('</tr>');
			body = body.substring(0, idx);
			body = body.replace(/\<tr.+\>\n/g, '');
			body = body.replace(/\<\/tr\>/g, '');
			body = body.replace(/\<td.+\n/g, '');
			body = body.replace(/\<\/td\>/g, '');
			body = body.replace(/\<ul\>/g, '');
			body = body.replace(/\<\/ul\>/g, '');
			body = body.replace(/\<li\>/g, '');
			body = body.replace(/\<\/li\>/g, '');
			body = body.replace(/\n+$/g, '');
			//var matches = body.match(/\<span.+\n/);
			//if(matches.length) {
				//console.log(matches[0]);
			//}
			var matches = body.match(/\<.+\>(.+)\<\/a\>$/g);
			if(matches && matches.length) {
				console.log(matches[0], matches[1]);
			}
			
			fs.writeFile('./planetNames_'+i+'.txt', body, function (err) {
				if(err) {
					return console.log('error!', err);
				}
				console.log('batch '+i+' written to file');
			});
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
