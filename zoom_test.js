'use strict';

var planets = [];
//var x = null;
//var y = null;

// create 3500 random planets
var createPlanets = function () {
	for(var i = 0; i < 3500; i++) {
		planets.push({
			name : 'Planet ' + i,
			x : Math.floor(Math.random() * 1000 - 500),
			y : Math.floor(Math.random() * 1000 - 500)
		});
	}
};

var main = function () {
	var svg = d3.select('svg.map');
	var bbox = svg.node().getBoundingClientRect();
	var diff = bbox.width - bbox.height;
	var x = d3.scale.linear()
		.domain([-600, 600])
		.range([diff /2, bbox.width - diff/2]);
	var y = d3.scale.linear()
		.domain([-600, 600])
		.range([bbox.height, 0]);
	
	// create planets
	createPlanets();
	
	var pGroup = svg.select('g.circles');
	pGroup.selectAll('circle')
			.data(planets)
		.enter().append('circle')
			.attr('cx', function (d) { return d.x })
			.attr('cy', function (d) { return d.y -1 })
			.attr('r', 5);
	
	var tGroup = svg.select('g.names');
	tGroup.selectAll('text')
			.data(planets)
		.enter().append('text')
			.attr('x', function (d) { return d.x + 2})
			.attr('y', function (d) { return d.y })
			.text(function(d) { return d.name});
			
	var adjustViewport = function () {
		var scale = zoom.scale();
		pGroup.attr('transform', function () {
			return 'translate('+x(0)+','+y(0)+') scale('+scale+')';
		});
		pGroup.selectAll('circle')
			.attr('r', 5/scale);
		tGroup.attr('transform', function () {
			return 'translate('+x(0)+','+y(0)+') scale('+scale+')';
		});
		tGroup.selectAll('text')
			.attr('style', 'font-size: '+(1/scale * 100)+'%;');
		
	};
	
	var zoom = d3.behavior.zoom()
		.x(x)
		.y(y)
		.on('zoom', adjustViewport);
	svg.call(zoom);
	
	adjustViewport();
};

main();