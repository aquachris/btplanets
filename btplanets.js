'use strict';

window.BTPLANETS = {
	// constants
	PLANET_RADIUS : 4,
	ZOOM_FACTOR_MIN : 0.5,
	ZOOM_FACTOR_MAX : 40,
	
	// data array handles 
	planets : null,
	
	// DOM  / SVG object handles
	svg : null,
	
	// D3 object handles
	zoom : null,
	legendAxis : null,
	
	// scales
	xScale : null,
	yScale : null,
	legendScale : null,
	
	// miscellaneous state variables
	bbox : null, // the current bounding box
	pxPerLy : 1, // pixel per lightyear for the unzoomed view
	
	// functions
	/**
	 * Initialize the object and its components
	 */
	init : function () {
		d3.json('./data/planets.json', function (error, json) {
			var cur, nb;
			if(error) { 
				return console.warn(error); 
			}
			BTPLANETS.planets = json;
			BTPLANETS.instantiateComponents();
			BTPLANETS.onResize();
			window.addEventListener('resize', function () {
				BTPLANETS.onResize();
				//setScales();
				//repaintLegend();
				//setViewport();
			});
			//d3.select('body')
				//.on('keydown', handleKeys);
		});
	},
	
	/**
	 * Create all necessary components.
	 * Planets array should be loaded.
	 * (function should only be called once)
	 */
	instantiateComponents : function () {
		var me = BTPLANETS;
		
		// instantiate DOM / SVG handles
		me.svg = d3.select('svg.map');
		
		// instantiate D3 objects
		me.zoom = d3.behavior.zoom()
			.scaleExtent([me.ZOOM_FACTOR_MIN, me.ZOOM_FACTOR_MAX])
			.on('zoom', me.repositionComponents)
			.on('zoomstart', function () {
				me.svg.classed('dragging', true);
			}.bind(me))
			.on('zoomend', function () {
				me.svg.classed('dragging', false);
			}.bind(me));
		me.svg.call(me.zoom);
		me.xScale = d3.scale.linear();
		me.yScale = d3.scale.linear();
		me.legendScale = d3.scale.linear();
		me.legendAxis = d3.svg.axis()
			.scale(me.legendScale)
			.orient('top');
		
		/*var jumpGroup = me.svg.select('g.jump-routes');*/
		/*var routes = jumpGroup.selectAll('path')
				.data(jumpRoutes)
			.enter().append('path')
				.classed('jump-route', true)
				.attr('d', transformJumpRoute);*/
		
		var circleGroup =me.svg.select('g.planet-circles');
		var circles = circleGroup.selectAll('circle')
				.data(me.planets)
			.enter().append('circle')
				.attr('r', me.PLANET_RADIUS)
				.attr('cx', 0)
				.attr('cy', 0)
				.attr('class', function (d) {
					if(d.affiliation === '?' || d.affiliation.toLowerCase() === 'no record') {
						return 'uncharted';
					}
					return d.affiliation.toLowerCase().replace(/[\'\/]+/g, '').replace(/\s+/g, '-');
				})
				.classed('planet', true)
				.attr('transform', me.transformers.planetCircle)
				.on('mouseover', function (planet) {
					me.svg.select('circle.jump-range')
						.classed('visible', true)
						.attr('r', BTPLANETS.xScale(30) - BTPLANETS.xScale(0))
						.attr('cx', BTPLANETS.xScale(planet.x))
						.attr('cy', BTPLANETS.yScale(planet.y));
				}.bind(me))
				.on('mouseleave', function () {
					me.svg.select('circle.jump-range')
						.classed('visible', false);
				}.bind(me));
		
		var namesGroup = me.svg.select('g.planet-names');
		var names = namesGroup.selectAll('text')
				.data(me.planets)
			.enter().append('text')
				.classed('planet-name', true)
				.classed('uncharted', function(d) {
					if(d.affiliation === '?' || d.affiliation.toLowerCase() === 'no record') {
						return true;
					}
					return false;
				})
				.text(function(d) {
					return d.name;
				})
				.attr('transform', me.transformers.planetText);
		
		var legendGroup = me.svg.select('g.legend');
		var legendBackground = legendGroup.append('rect')
			.classed('scale-axis-background', true);
			
		var legendUnitText = legendGroup.append('text')
			.text('Light years');
			
		var legendAxisGroup = legendGroup.append('g')
			.classed('scale-axis', true)
			.call(me.legendScale);
	},

	/**
	 * React to a change in map size by setting the different scales
	 */
	onResize : function () {
		var me = BTPLANETS;
		var bbox = me.svg.node().getBoundingClientRect();
		var diff = bbox.width - bbox.height;
		var centerCoords = me.getCurrentCenterCoordinates();
		var scale = me.zoom.scale();
		
		me.xScale
			.domain([-600, 600])
			.range([diff / 2, bbox.width - diff / 2]);
		
		me.yScale
			.domain([-600, 600])
			.range([bbox.height, 0]);

		me.zoom
			.x(me.xScale)
			.y(me.yScale)
			.scale(scale);
		
		me.pxPerLy = bbox.height / 1200;
		
		me.centerOnCoordinates(centerCoords[0], centerCoords[1]);
		
		me.bbox = bbox;
	},
	
	/**
	 * Get the threshold from which zoom level to show the details
	 */
	getDetailThreshold : function () {
		var me = BTPLANETS;
		return 3 / me.pxPerLy;
	},
	
	/**
	 * Position all svg components 
	 */
	repositionComponents : function () {
		var me = BTPLANETS;
		me.svg.select('circle.jump-range')
			.classed('visible', false)
		//this.svg.selectAll('path.jump-route')
		//	.attr('d', this.transformers.transformJumpRoute);
		me.svg.selectAll('circle.planet')
			.attr('transform', me.transformers.planetCircle);
		me.svg.selectAll('text.planet-name')
			.attr('transform', me.transformers.planetText);
		me.svg.classed('zoomed-in', me.zoom.scale() > me.getDetailThreshold());
		me.fireEvent('repaint');
		
		me.repositionLegend();
	},
	
	/**
	 * Scale and position the legend objects correctly
	 */
	repositionLegend : function () {
		var me = BTPLANETS;
		var bbox = me.svg.node().getBoundingClientRect();
		var diff = bbox.width - bbox.height;
		var legendGroup = me.svg.select('g.legend');
		var legendBackground = legendGroup.select('rect.scale-axis-background');
		var legendUnitText = legendGroup.select('text');
		var legendAxisGroup = legendGroup.select('g.scale-axis');
		
		me.legendScale
			.domain([0, (300 / me.pxPerLy) / me.zoom.scale()])
			.range([0, 300]);
		
		legendGroup
			.attr('transform', 'translate(10,'+(bbox.height-54)+')');
		legendBackground
			.attr('height', 32)
			.attr('width', 410);
		legendUnitText
			.attr('x', 326)
			.attr('y', 20);
		me.legendAxis.scale(me.legendScale);
		legendAxisGroup
			.attr('transform', 'translate(10, 24)')
			.call(me.legendAxis);
	},
	
	/**
	 * Retrieve the map-space coordinates that are currently at the center of the viewport
	 */
	getCurrentCenterCoordinates : function () {
		var me = BTPLANETS;
		var bbox = me.bbox || me.svg.node().getBoundingClientRect();
		var cx = 0, cy = 0;
		var translation = me.zoom.translate();
		var scale = me.zoom.scale();
		var halfWidth = bbox.width * 0.5;
		var halfHeight = bbox.height * 0.5;
		cx = ((-translation[0] + halfWidth) / scale - halfWidth) / me.pxPerLy;
		cy = -((((translation[1] / -1)  + halfHeight) / scale - halfHeight) / me.pxPerLy)
		return [cx, cy];
	},
	
	/**
	 * Center the map on any set of universe coordinates
	 */
	centerOnCoordinates : function (cx, cy) {
		var me = BTPLANETS;
		var bbox = me.svg.node().getBoundingClientRect();
		var scale = me.zoom.scale();
		var xTranslate = -((bbox.width * 0.5 + cx * me.pxPerLy) * scale - bbox.width * 0.5);
		var yTranslate = -((bbox.height * 0.5 - cy * me.pxPerLy) * scale - bbox.height * 0.5);
		me.zoom.translate([xTranslate, yTranslate]);
		me.repositionComponents();
	},
	
	/**
	 * Reset to initial map view
	 */
	resetView : function () {
		var me = BTPLANETS;
		me.zoom.scale(1);
		me.centerOnCoordinates(0, 0);
	},
	
	/**
	 * Component transformation functions
	 */
	transformers : {
		planetCircle : function (d, i) {
			return 'translate('+BTPLANETS.xScale(d.x) + ',' + BTPLANETS.yScale(d.y) + ')';
		},
		planetText : function (d, i) {
			var ret = 'translate('+(BTPLANETS.xScale(d.x) + BTPLANETS.PLANET_RADIUS*2) + ',' ;
			ret += (BTPLANETS.yScale(d.y)+(BTPLANETS.PLANET_RADIUS*0.5+1)) + ')';
			return ret;
		}
	},
	
	/**
	 * Very simple pub/sub event system
	 */
	listeners : {},
	on : function (eventName, scope, fn) {
		var me = BTPLANETS;
		if(!me.listeners.hasOwnProperty(eventName)) {
			me.listeners[eventName] = [];
		}
		me.listeners[eventName].push({
			scope : scope,
			fn : fn
		});
		console.log(eventName + ' listener registered');
	},
	off : function (eventName, scope, fn) {
		var me = BTPLANETS;
		if(!me.listeners.hasOwnProperty(eventName)) {
			return;
		}
		for(var i = 0, len = me.listeners[eventName].length; i < len; i++) {
			if(me.listeners[eventName][i].fn === fn || me.listeners[eventName][i].scope === scope) {
				me.listeners[eventName].splice(i, 1);
				console.log(eventName + ' listener unregistered');
				return;
			}
		}
	},
	fireEvent : function(eventName) {
		var me = BTPLANETS;
		if(!me.listeners.hasOwnProperty(eventName)) {
			return;
		}
		for(var i = 0, len = me.listeners[eventName].length; i < len; i++) {
			me.listeners[eventName][i].fn.call(me.listeners[eventName][i].scope);
		}
	}
};