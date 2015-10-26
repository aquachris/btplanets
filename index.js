'use strict';

var PLANET_RADIUS = 5;
var svg = null;
var x = null;
var y = null;
var legendScale = null;
var zoom = null;
var planets = null;
var legendAxis = null;
var legendGroup = null;
var legendUnitText = null;
var legendBackground = null;

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
	
	repaintLegend();
};

var repaintLegend = function () {
	var bbox = svg.node().getBoundingClientRect();
	legendScale
		.domain([0, 300/zoom.scale()])
		.range([0, 300]);

	if(legendBackground) {
		legendBackground
			.attr('x', 4)
			.attr('y', bbox.height-54)
			.attr('height', 32)
			.attr('width', 380);
		legendUnitText
			.attr('x', 326)
			.attr('y', bbox.height-36);
	}
	if(legendGroup) {
		legendAxis.scale(legendScale);
		legendGroup
			.attr('transform', 'translate(10,'+(bbox.height - 30)+')')
			.call(legendAxis);
	}
};

var transform = function (d, i) {
	return 'translate('+x(d.x) + ',' + y(d.y) + ')';
};

var transformText = function (d, i) {
	return 'translate('+(x(d.x) + 5) + ',' + (y(d.y)+(PLANET_RADIUS*0.5-1)) + ')';
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
	svg.selectAll('g.planet')
		.attr('transform', transform);
	svg.selectAll('text.planet-name')
		.attr('transform', transformText);
	svg.classed('zoomed-in', zoom.scale() > 3);
	repaintLegend();
};

var createVisualization = function () {
	zoom.x(x)
		.y(y)
		.scaleExtent([0.5,30])
		.on('zoom', setViewport)
		.on('zoomstart', function () {
			svg.classed('dragging', true);
		})
		.on('zoomend', function () {
			svg.classed('dragging', false);
		});
	svg.call(zoom);
	
	var groups = svg.selectAll('g.planet')
			.data(planets)
		.enter().append('g')
			.classed('planet', true)
			.classed('hidden', function (d) {
				if(d.affiliation === '?' || d.affiliation === 'No record') {
					return true;
				}
				return false;
			})
			.attr('transform', transform);
	
	groups.append('circle')
		.attr('r', PLANET_RADIUS)
		.attr('cx', -PLANET_RADIUS*0.5)
		.attr('cy', -PLANET_RADIUS*0.5)
		.attr('fill', faction);
		
	svg.selectAll('text')
			.data(planets)
		.enter().append('text')
			.classed('planet-name', true)
			.classed('hidden', function(d) {
				if(d.affiliation === '?' || d.affiliation === 'No record') {
					return true;
				}
				return false;
			})
			.text(function(d) {
				return d.name;
			})
			.attr('transform', transformText);
		
	legendBackground = svg.append('rect')
		.classed('scale-axis-background', true);
		
	legendUnitText = svg.append('text')
		.text('Light years');
		
	legendAxis = d3.svg.axis()
		.scale(legendScale)
		.orient('top');
		
	legendGroup = svg.append('g')
		.classed('scale-axis', true)
		.call(legendScale);
		
	repaintLegend();
};

var centerOnTerra = function () {
	zoom && zoom.scale(0).translate([0,0]);
	setViewport();
};

var main = function () {
	svg = d3.select('svg.map');
	legendScale = d3.scale.linear();
	zoom = d3.behavior.zoom();
	d3.json('./files/planets.json', function (error, json) {
		if(error) { 
			return console.warn(error); 
		}
		planets = json;
		setScales();
		createVisualization();
		window.addEventListener('resize', function () {
			setScales();
			repaintLegend();
			setViewport();
		});
		d3.select('body')
			.on('keydown', function () {
				console.log('keydown', arguments);
				//centerOnTerra();
			});
	});
};

main();
