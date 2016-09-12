'use strict';

var planetArr = [];

var calcDistance = function(p1, p2) {
	return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
};

var findNeighbors = function (idx) {
	var p = planetArr[idx];
	var neighbors = [];

	console.log('calculating neighbors for ' + p.name);
	for(var i = 0, len = planetArr.length; i< len; i++) {
		if(i === idx) {
			continue;
		}
		if(calcDistance(p, planetArr[i]) <= 30) {
			neighbors.push(i);
		}
	}
	p.neighbors = neighbors;
};

var init = function () {
	document.getElementById('filePicker').onchange = function () {
		var file = this.files[0];
		var reader = new FileReader();
		reader.onload = function (progressEvent) {
			var lines = this.result.split('\n'), tokens, coords;
			for(var i = 1, len = lines.length; i < len; i++) {
				tokens = lines[i].split('\t');
				
				if(!tokens || tokens.length < 4) {
					continue;
				}
				coords = tokens[2].split(':');
				if(!coords || coords.length < 2) {
					console.log('no coordinates for ' + tokens[1]);
					continue;
				}
				planetArr.push({
					link : 'http://www.sarna.net'+tokens[0],
					name : tokens[1],
					x : Number(coords[0]),
					y : Number(coords[1]),
					affiliation : tokens[3]
				});
			}
			for(var i = 0, len = planetArr.length; i < len; i++) {
				findNeighbors(i);
			}
			var res = JSON.stringify(planetArr);
			document.getElementById('json_content').innerHTML = res;
		};
		reader.readAsText(file);
	};
};

var main = function () {
	init();
};

main();