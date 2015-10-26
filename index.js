'use strict';

var PLANET_RADIUS = 3;
var svg = null;
var x = null;
var y = null;
var zoom = null;
var planets = null;

var setScales = function () {
	var bbox = svg.node().getBoundingClientRect();
	var diff = bbox.width - bbox.height;
	var zoomTranslate = null;
	var zoomScale = null;
	var zoomCenter = null;
	
	if(zoom) {
		zoomTranslate = zoom.translate();
		zoomCenter = zoom.center();
		zoomScale = zoom.scale();
		console.log(zoomTranslate[1], zoomScale);
	}
	
	x = d3.scale.linear()
		.domain([-600, 600])
		.range([diff /2, bbox.width - diff/2]);
	y = d3.scale.linear()
		.domain([-600, 600])
		.range([bbox.height, 0]);
	
	if(zoom) {
		zoom.x(x).y(y).scale(zoomScale).translate(zoomTranslate);
	}
};

var transform = function (d, i) {
	return 'translate('+x(d.x) + ',' + y(d.y) + ')';
};

var faction = function(d) {
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
	if(d.affiliation !== 'No record' && d.affiliation !== '?') {
		return 'grey';
	}
	return 'lightblue';
};

var setViewport = function () {
	svg.selectAll('g')
		.attr('transform', transform);
};

var createVisualization = function () {
	zoom = d3.behavior.zoom()
		.x(x)
		.y(y)
		.scaleExtent([0.5,8])
		.on('zoom', setViewport)
		.on('zoomstart', function () {
			svg.classed('dragging', true);
		})
		.on('zoomend', function () {
			svg.classed('dragging', false);
		});
	svg.call(zoom);
	
	var groups = svg.selectAll('g')
			.data(planets)
		.enter().append('g')
			.attr('transform', transform);
	
	groups.append('circle')
		.attr('r', PLANET_RADIUS)
		.attr('cx', -PLANET_RADIUS*0.5)
		.attr('cy', -PLANET_RADIUS*0.5)
		.attr('fill', faction);
		
	groups.append('text')
		.attr('x', 5)
		.attr('y', PLANET_RADIUS*0.5)
		.text(function (d, i) {
			return d.name;
		});
	/*/var circle = b.selectAll('circle')
			.data(planets)
		.enter().append('circle')
			.attr('r', 3)
			.attr('transform', transform)
			.attr('fill', faction);*/
};

var centerOnTerra = function () {
	zoom && zoom.scale(0).translate([0,0]);
	setViewport();
};

var main = function () {
	svg = d3.select('svg');
	d3.json('./files/planets.json', function (error, json) {
		if(error) { 
			return console.warn(error); 
		}
		planets = json;
		setScales();
		createVisualization();
		window.addEventListener('resize', function () {
			setScales();
			setViewport();
		});
		d3.select('body')
			.on('keydown', function () {
				//centerOnTerra();
			});
	});
};

main();
