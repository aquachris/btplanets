// script uses cheeriojs (https://github.com/cheeriojs/cheerio)
// run npm install cheerio before executing
'use strict';

var http = require('http');
var fs = require('fs');
var cheerio = require('cheerio');

// http://www.sarna.net/wiki/Category:Planets
// http://www.sarna.net/wiki/Acala

var startingPlanet = 'A Place';
var i = 0;
var requestNextPlanetBatch = function () {
	var host = 'http://www.sarna.net',
		path;

	startingPlanet = startingPlanet.replace(/\([^\)]+\)/g, '');
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
				body = body.replace(/(.+)\r?\n|\r/i, "\r\n");
			}

			var matches = body.match(/\<a href=\"(.+)\"[^\>]+\>(.*)\<\/a\>$/i);
			if(!matches || matches.length < 2) {
				console.log('no more matches');
				return;
			}
			startingPlanet = matches[2];

			body = body.replace(/\<a href="([^\"]+)"[^\>]+\>([^\<]+)\<\/a>/g, '$1\t$2');
			body = body.replace(/\&\#039\;/g, "'");

			if(i === 0) {
				fs.writeFile('../temp/planetNames.txt', body, 'utf8', function (err) {
					if(err) {
						return console.log('error!', err);
					}
					console.log('batch '+i+' written to file');
				});
			} else {
				fs.appendFile('../temp/planetNames.txt', body, 'utf8', function (err) {
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
				console.log('Done assembling planet names / links');
				//requestPlanetDetails();
			}
		});
		console.log('res: ' + res.statusCode);
		// find out last planet in the list
	}).on('error', function (e) {
		console.log('Error while requesting ' + host + path + ': ' + e.message);
	});
};

var lines;
var planetData;
var errorData;
var requestPlanetDetails = function () {
	fs.readFile('../temp/planetNames.txt', 'utf8', function (err, data) {
		if(err) {
			throw err;
		}
		data = data.trim();
		lines = data.split('\n');
		//lines = ['/wiki/A%20Place\tA Place'];
		//lines = ['/wiki/Terra\tTerra'];
		//lines = ['/wiki/A%20Place\tA Place', '/wiki/Tathis\tTathis', '/wiki/Sichuan\tSichuan'];
		//lines = ['/wiki/Inglesmond\tInglesmond', '/wiki/Clovis\tClovis'];
		//lines = ['/wiki/Abagnar\tAbagnar', '/wiki/Barada\tBarada'];
		i = 0; // change to start at different point
		planetData = 'SARNA.NET PATH\tPLANET NAME\tCOORDINATES\t3025 AFFILIATION\n';
		errorData = '';
		requestNextPlanet();
	});
};

var requestNextPlanet = function () {
	var path, name, url;

	var tokens = lines[i].split('\t');
	path = tokens[0];
	name = tokens[1];
	url = 'http://www.sarna.net' + path;

	console.log(path + ' (' + (i + 1) + '/' + lines.length + ')');

	http.get(url, function (res) {
		var body = '', idx;
		var $, $search;
		res.setEncoding('utf-8');
		res.on('data', function (chunk) {
			body += chunk;
		}).on('end', function () {
			var coordinates, affiliation;
			var idx, bodyPart;
			var matches;

			var $ = cheerio.load(body);

			// coordinates
			if((name+'').trim() === 'Terra') {
				coordinates = '0:0';
			} else {
				$search = $('sup.noprint').first();
				$search.each(function (index, element) {
					if($search.text().trim() === 'e' || $search.text().trim() === '[e]') {
						coordinates = $search.parent().text();
						idx = coordinates.indexOf('[e]');
						coordinates = coordinates.substr(0,idx);
						coordinates = coordinates.replace(/\[[^\]]+\]/g, '');
						coordinates = coordinates.replace(/\s+/g, '');
						coordinates = coordinates.replace(/x\:/gi, '');
						coordinates = coordinates.replace(/y/gi, '');
						coordinates = coordinates.replace(/,/g, '');
						//console.log('coordinates read for ' + name + ': ' + coordinates);
						return false;
					}
				});
			}

			if(!coordinates) {
				// try finding coordinates with a string search
				bodyPart = body;
				idx = bodyPart.indexOf('<h1>');
				bodyPart = bodyPart.substr(idx);
				idx = bodyPart.indexOf('<div id="footer"');
				bodyPart = bodyPart.substr(0,idx);
				bodyPart = bodyPart.replace(/\&[^\;]+\;/gi, '');
				bodyPart = bodyPart.replace(/\s+/g, '');
				matches = bodyPart.match(/[0-9\.\,\-]+\:[0-9\.\,\-]+/gi);
				if(matches) {
					coordinates = matches[0];
				} else {
					console.error('NO COORDINATES for ' + name);
					errorData += 'NO COORDINATES for ' + name + '\n';
				}
			}

			// affiliation
			$search = $('#Political_Affiliation,#Owner_History');
			if($search.length === 0) {
				$search = $('#Political_Affilation');
				if($search.length > 0) {
					errorData += 'typo on sarna.net ("Affilation" instead of "Affiliation") for ' + name + '\n';
				}
			}
			if($search.length > 0) {
				$search = $search.parent().next().find('li');
				if($search.length > 0) {
					$search.each(function () {
						if($(this).text().trim().startsWith('3025')) {
							affiliation = $(this).text();
							affiliation = affiliation.replace(/\s*3025\s*-\s*/i, '');
							affiliation = affiliation.replace(/\[[^\]]+\]/g, '').trim();
							return false;
						}
					});
				}
			}
			if(!affiliation && body.indexOf('Strana Mechty') > 0) {
				affiliation = 'Clans';
			}
			if(affiliation) {
				//console.log('affiliation read for ' + name + ': ' + affiliation);
			} else {
				console.error('no affiliation info for ' + name);
				errorData += 'no affiliation info for ' + name + '\n';
				affiliation = 'No record';
			}

			planetData += path.trim() + '\t';
			planetData += (name+'').trim() + '\t';
			planetData += (''+coordinates).trim() + '\t';
			planetData += affiliation.trim() + '\n';

			i++;
			if(i < lines.length) {
				requestNextPlanet();
			} else {
				writePlanetData();
			}
		});
	}).on('error', function (e) {
		console.log('Error while requesting ' + url + ': ' + e.message);
	});
};

var writePlanetData = function () {
	fs.writeFile('../temp/errorData.tsv', errorData, function (err) {
		if(err) {
			return console.log('error!', err);
		}
		console.log('wrote error file');
	});

	fs.writeFile('../temp/planetData.tsv', planetData, function (err) {
		if(err) {
			return console.log('error!', err);
		}
		console.log('wrote data file, DONE!');
	});
};

var main = function () {
	console.log('query_planets script started');
	// gather all planet pages on sarna wiki
	requestNextPlanetBatch();

	// use assembled list to request all planet details
	//requestPlanetDetails();
};

main();
