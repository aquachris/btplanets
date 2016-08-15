define(['js/lib/d3.min'], function(d3) {
	'use strict';

	return {
		// constants
		PLANET_RADIUS : 4,
		ZOOM_FACTOR_MIN : 0.5,
		ZOOM_FACTOR_MAX : 40,

		// data array handles
		borders : null,
		planets : null,
		selectedPlanets : null,

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
		startTranslate : [0, 0], // translation coordinates at last zoom start

		// functions
		/**
		 * Initialize the object and its components
		 */
		init : function () {
			d3.json('./data/borders.json', function (error, json) {
				if(error) {
					return console.warn(error);
				}
				this.borders = json;
				d3.json('./data/planets.json', function (error, json) {
					var cur, nb;
					if(error) {
						return console.warn(error);
					}
					this.planets = json;
					this.selectedPlanets = [];
					this.instantiateComponents();
					this.onResize();
					window.addEventListener('resize', function () {
						this.onResize();
					}.bind(this));
					this.fireEvent('initialized');
				}.bind(this));
			}.bind(this));
		},

		/**
		 * Create all necessary components.
		 * Planets array should be loaded.
		 * (function should only be called once)
		 */
		instantiateComponents : function () {
			var me = this;

			// instantiate DOM / SVG handles
			me.svg = d3.select('svg.map');

			// instantiate D3 objects
			me.zoom = d3.behavior.zoom()
				.scaleExtent([me.ZOOM_FACTOR_MIN, me.ZOOM_FACTOR_MAX])
				.on('zoom', me.repositionComponents.bind(me))
				.on('zoomstart', function () {
					me.svg.classed('dragging', true);
					me.startTranslate = me.zoom.translate();
				}.bind(me))
				.on('zoomend', function () {
					// Check if the view was scaled, or translated a significant amount.
					// If yes, click events shortly after are suppressed to prevent
					// accidental planet selections while zooming / panning around using
					// the mouse.
					var endTranslate = me.zoom.translate();
					var endScale = me.zoom.scale();
					var xMove = Math.abs(me.startTranslate[0] / endScale - endTranslate[0] / endScale);
					var yMove = Math.abs(me.startTranslate[1] / endScale - endTranslate[1] / endScale);
					if(xMove + yMove < 2) {
						me.svg.classed('dragging', false);
					} else {
						// Insert a slight delay to prevent click events on
						// planets while still dragging. See planet circle click event below.
						setTimeout(function () {
							me.svg.classed('dragging', false);
						}, 50);
					}
				}.bind(me));
			me.svg.call(me.zoom);
			me.xScale = d3.scale.linear();
			me.yScale = d3.scale.linear();
			me.legendScale = d3.scale.linear();
			me.legendAxis = d3.svg.axis()
				.scale(me.legendScale)
				.orient('top');

			var borderCt = me.svg.select('g.borders');
			var borders = borderCt.selectAll('path.border')
					.data(me.borders)
				.enter().append('path')
					//.classed('border', true)
					.attr('d', function (d) { return d.path })
					.attr('fill', function (d) { return 'url(#hatch-'+d.name+')'; })
					.attr('class', function (d) { return 'border ' + d.name; });
			var circleGroup = me.svg.select('g.planet-circles');
			var circles = circleGroup.selectAll('circle')
					.data(me.planets)
				.enter().append('circle')
					.attr('name', function(d) { return d.name; })
					.attr('r', me.PLANET_RADIUS)
					.attr('cx', 0)
					.attr('cy', 0)
					.attr('class', function (d) {
						if(d.affiliation === '?' || d.affiliation.toLowerCase() === 'no record') {
							return 'uncharted';
						}
						if(d.affiliation.toLowerCase().indexOf('clan') !== -1) {
							return 'clan';
						}
						return 'inhabited ' + d.affiliation.toLowerCase().replace(/[\'\/]+/g, '').replace(/\s+/g, '-');
					})
					.classed('planet', true)
					.classed('capital', function (d) {
						var name = d.name.toLowerCase();
						return name === 'sian' ||
							name === 'terra' ||
							name === 'luthien' ||
							name === 'new avalon' ||
							name === 'atreus' ||
							name === 'tharkad';
					})
					.attr('transform', me.transformers.planetCircle.bind(me))
					.on('mouseover', function (planet) {
						me.svg.select('circle.jump-range')
							.classed('visible', true)
							.attr('r', me.xScale(30) - me.xScale(0))
							.attr('cx', me.xScale(planet.x))
							.attr('cy', me.yScale(planet.y));
					})
					.on('mouseleave', function () {
						me.svg.select('circle.jump-range')
							.classed('visible', false);
					})
					.on('click', function (planet) {
						if(!me.svg.classed('dragging')) {
							me.togglePlanetSelection(planet);
						}
					});

			var namesGroup = me.svg.select('g.planet-names');
			var names = namesGroup.selectAll('text')
					.data(me.planets)
				.enter().append('text')
					.classed('planet-name', true)
					.classed('uncharted', function(d) {
						return d.affiliation === '?' || d.affiliation.toLowerCase() === 'no record';
					})
					.classed('inhabited', function(d) {
						return d.affiliation !== '?' && d.affiliation.toLowerCase() !== 'no record';
					})
					.classed('clan', function(d) {
						return d.affiliation.toLowerCase().indexOf('clan') !== -1;
					})
					.classed('capital', function (d) {
						var name = d.name.toLowerCase();
						return name === 'sian' ||
							name === 'terra' ||
							name === 'luthien' ||
							name === 'new avalon' ||
							name === 'atreus' ||
							name === 'tharkad';
					})
					.text(function(d) {
						return d.name;
					})
					.attr('transform', me.transformers.planetText.bind(me));

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
			var me = this;
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
			return 3 / this.pxPerLy;
		},

		/**
		 * Position all svg components
		 */
		repositionComponents : function () {
			var me = this;
			var scale = me.zoom.scale();
			me.svg.selectAll('path.border')
				.attr('transform', me.transformers.borderPath.bind(me));
			me.svg.select('circle.jump-range')
				.classed('visible', false)
			//this.svg.selectAll('path.jump-route')
			//	.attr('d', this.transformers.transformJumpRoute);
			me.svg.selectAll('circle.planet')
				.attr('transform', me.transformers.planetCircle.bind(me));
			me.svg.selectAll('text.planet-name')
				.attr('transform', me.transformers.planetText.bind(me));
			me.svg.classed('zoomed-in', me.zoom.scale() > me.getDetailThreshold());
			me.fireEvent('repaint');

			me.repositionLegend();
		},

		/**
		 * Scale and position the legend objects correctly
		 */
		repositionLegend : function () {
			var me = this;
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
			var me = this;
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
			var me = this;
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
			var me = this;
			me.zoom.scale(1);
			me.centerOnCoordinates(0, 0);
		},

		/**
		 * Select or deselect a planet by its name
		 */
		togglePlanetSelection : function (planet) {
			var planetName, circle;

			if(typeof planet === 'string') {
				planetName = planet;
				planet = null;
				for(var i = 0, len = this.planets.length; i< len; i++) {
					if(this.planets[i].name.toLowerCase() === planetName.toLowerCase()) {
						planet = this.planets[i];
						break;
					}
				}
				if(!planet) {
					throw 'Cannot select/deselect planet: Planet cannot be found';
				}
			}
			planetName = planet.name;

			circle = this.svg.select('circle[name="'+planetName+'"]');
			for(var i = 0, len = this.selectedPlanets.length; i < len; i++) {
				if(this.selectedPlanets[i] === planet) {
					// deselect planet
					this.selectedPlanets.splice(i, 1);
					circle.classed('selected', false);
					this.fireEvent('selectionremoved', planet);
					this.fireEvent('selectionchanged', this.selectedPlanets);
					return;
				}
			}
			// select planet
			this.selectedPlanets.push(planet);
			/*this.selectedPlanets.sort(function (a,b) {
				if(a.name < b.name) {
					return -1;
				} else if(a.name > b.name) {
					return 1;
				}
				return 0;
			});*/
			circle.classed('selected', true);
			this.fireEvent('selectionadded', planet);
			this.fireEvent('selectionchanged', this.selectedPlanets);
		},

		/**
		 * Find planet id by name
		 */
		findPlanetId : function (name) {
			name = name.toLowerCase();
			for(var i = 0, len = this.planets.length; i < len; i++) {
				if(this.planets[i].name.toLowerCase() === name) {
					return i;
				}
			}
			throw 'Planet "' + name + '" could not be found';
		},

		/**
		 * Component transformation functions
		 */
		transformers : {
			borderPath : function (d, i) {
				return 'translate('+this.xScale(d.x)+','+this.yScale(d.y) + ') scale('+this.zoom.scale()*this.pxPerLy+')';
			},
			planetCircle : function (d, i) {
				return 'translate('+this.xScale(d.x) + ',' + this.yScale(d.y) + ')';
			},
			planetText : function (d, i) {
				var ret = 'translate('+(this.xScale(d.x) + this.PLANET_RADIUS*2) + ',' ;
				ret += (this.yScale(d.y)+(this.PLANET_RADIUS*0.5+1)) + ')';
				return ret;
			}
		},

		/**
		 * Very simple pub/sub event system
		 */
		listeners : {},
		on : function (eventName, scope, fn) {
			var me = this;
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
			var me = this;
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
			var me = this;
			var args = [];
			for(var i = 1, len = arguments.length; i < len; i++) {
				args.push(arguments[i]);
			}
			if(!me.listeners.hasOwnProperty(eventName)) {
				return;
			}
			for(var i = 0, len = me.listeners[eventName].length; i < len; i++) {
				me.listeners[eventName][i].fn.apply(me.listeners[eventName][i].scope, args);
			}
		}
	}
});
