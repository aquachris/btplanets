'use strict';

var planets = null;
var zoomLevel = 1;
var viewBox = [-500, -500, 1000, 1000];

var setViewBox = function () {
	var size = 1000 / zoomLevel;
	var sizeFactor = Math.sqrt(zoomLevel);
	viewBox = [-size * 0.5, -size * 0.5, size, size];
	
	var map = d3.select('.map').attr('viewBox', viewBox[0] + ' ' + viewBox[1] + ' ' + viewBox[2] + ' ' + viewBox[3]);
	map.selectAll('circle').attr('r', 4 / sizeFactor);
	map.selectAll('text')
		.attr('style', 'font-size: ' + 100 / sizeFactor + '%;');
};

var createViz = function () {
	var map = d3.select('.map');
	var pg = map.select('.main-ct')
		.selectAll('circle')
			.data(planets)
		.enter();
	
	pg.append('circle')
			.attr('r', 5).attr('fill', 'black')
			.attr('cx', function(d, i) { return d.x })
			.attr('cy', function(d, i) { return -d.y })
			.attr('fill', function(d, i) {
				switch(d.affiliation) {
					case 'Lyran Commonwealth':
						return 'blue';
					case 'Federated Suns':
						return 'orange';
					case 'Draconis Combine':
						return 'red';
					case 'Free Worlds League':
						return 'purple';
					case 'Capellan Confederation':
						return 'green';
					case 'ComStar':
						return 'silver';
				}
				if(d.affiliation.indexOf('Clan') >= 0) {
					return 'brown';
				}
				return 'lightblue';
			});
			
	pg.append('text')
			.attr('x', function(d) { return d.x })
			.attr('y', function(d) { return -d.y })
			.attr('padding', '1em 1em')
			.text(function(d) { return d.name });
};

$(document).ready(function () {
	$.ajax('./files/planets.json').done(function (data) {
		planets = data;
		createViz();
	}).fail(function (jqXHR, text, error) {
		console.error('Could not retrieve planets.json: ', error);
	});
	
	$('.map-ct').on('mousewheel', function (e) {
		if(e.originalEvent.deltaY > 0) {
			zoomLevel = Math.max(zoomLevel / 1.5, 0.1);
		} else if(e.originalEvent.deltaY < 0) {
			zoomLevel = Math.min(zoomLevel * 1.5, 20);
		}
		setViewBox();
	});
});