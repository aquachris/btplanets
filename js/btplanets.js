define(['js/lib/d3.min'], function(d3) {
	'use strict';

	return {
		// constants
		PLANET_RADIUS : 4,
		ZOOM_FACTOR_MIN : 0.5,
		ZOOM_FACTOR_MAX : 40,

		// browser detection (edge)
		isEdge : false,

		// data array handles
		borders : null,
		labels : null,
		planets : null,
		capitals : null,
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
		labelRepositionTimeout : null,

		// functions
		/**
		 * Initialize the object and its components
		 */
		init : function () {
			this.isEdge = window.navigator.userAgent.indexOf("Edge") > -1;
			d3.json('./data/borders.json'+'?v'+window.BTPLANETS_VERSION, function (error, json) {
				if(error) {
					return console.warn(error);
				}
				this.borders = json;
				d3.json('./data/systems.json'+'?v'+window.BTPLANETS_VERSION, function (error, json) {
					var cur, nb;
					if(error) {
						return console.warn(error);
					}
					this.planets = json;
					this.capitals = [];
					for(var i = 0, len = this.planets.length; i < len; i++) {
						this.planets[i].index = i;
						cur = this.planets[i].name.toLowerCase();
						if(	cur === 'sian' || cur === 'luthien'
							|| cur === 'new avalon' || cur === 'atreus'
							|| cur === 'tharkad' || cur === 'terra') {
							this.planets[i].isCapital = true;
							this.capitals.push(this.planets[i]);
						}
						this.planets[i].userData = localStorage.getItem(this.planets[i].name);
					}
					this.selectedPlanets = [];
					this.instantiateComponents();
					this.onResize();
					window.addEventListener('resize', function () {
						this.onResize();
					}.bind(this));
					this.fireEvent('initialized');
				}.bind(this));
			}.bind(this));
			d3.selectAll('#disclaimer button.close, #about button.close').on('click', function () {
				d3.select(this.parentNode).classed('visible', false);
			});
			d3.select('#disclaimer-link').on('click', function () {
				var disclaimer = d3.select('#disclaimer');
				var about = d3.select('#about');
				var controls = d3.selectAll('.controls-background, .controls-tab-title, .controls');
				if(!disclaimer.classed('visible')) {
					controls.classed('expanded', false).classed('active', false);
				}
				disclaimer.classed('visible', !disclaimer.classed('visible'));
				about.classed('visible', false);
				d3.event.preventDefault();
			});
			d3.select('#about-link').on('click', function () {
				var disclaimer = d3.select('#disclaimer');
				var about = d3.select('#about');
				var controls = d3.selectAll('.controls-background, .controls-tab-title, .controls');
				if(!about.classed('visible')) {
					controls.classed('expanded', false).classed('active', false);
				}
				disclaimer.classed('visible', false);
				about.classed('visible', !about.classed('visible'));
				d3.event.preventDefault();
			});
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
					//.attr('fill', function (d) { return 'url(#hatch-'+d.name+')'; })
					.attr('class', function (d) { return 'border ' + d.name; });
			var stateLabelsCt = me.svg.select('g.state-labels');
			var stateLabels = stateLabelsCt.selectAll('g')
					.data(me.borders)
				.enter().append('g')
					.attr('class', function (d, i) {
						var g = d3.select(this);
						var succ = d.type === 'successor-state';
						var maj = d.type === 'periphery-major';
						/*if(succ || maj) {
							g.append('image')
								.attr('xlink:href', './img/'+d.name.replace(/\-/g, '_')+'_64.png')
								.attr('width', succ ? 64 : 32)
								.attr('height', succ ? 64 : 32);
						}*/
						g.append('text')
							//.attr('x', succ ? 62 : 32)
							.attr('x', 0)
							.attr('y', succ ? 28 : 14)
							.text(d.display);

						if(d.rulers) {
							g.append('text')
								//.attr('x', succ ? 62 : 32)
								.attr('x', 0)
								.attr('y', succ ? 48: 30)
								.text(d.rulers);
						}
						return d.name + ' ' + d.type;
					});


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
							return 'uninhabited';
						}
						if(d.affiliation.toLowerCase().indexOf('clan') !== -1) {
							return 'clan';
						}
						if(d.affiliation.toLowerCase() === 'hidden system') {
							return 'hidden-system';
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
					.classed('periphery-capital', function (d) {
						var name = d.name.toLowerCase();
						return name === 'taurus' ||
							name === 'canopus' ||
							name === 'alphard' ||
							name === 'oberon' ||
							name === 'alpheratz';
					})
					.classed('has-userdata', function (d) {
						return !!d.userData;
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

			var capitals = circleGroup.selectAll('path.capital')
					.data(me.capitals)
				.enter().append('path')
					.attr('name', function(d) { return d.name; })
					.attr('d', 'M-8,0 a8,8 0 1,0 16,0 a8,8 0 1,0 -16,0')
					.attr('class', function (d) {
						if(d.affiliation === '?' || d.affiliation.toLowerCase() === 'no record') {
							return 'uninhabited';
						}
						if(d.affiliation.toLowerCase().indexOf('clan') !== -1) {
							return 'clan';
						}
						return d.affiliation.toLowerCase().replace(/[\'\/]+/g, '').replace(/\s+/g, '-');
					})
					.classed('capital', true)
					.attr('transform', me.transformers.planetCircle.bind(me));


			var namesGroup = me.svg.select('g.planet-names');
			var names = namesGroup.selectAll('text')
					.data(me.planets)
				.enter().append('text')
					.classed('planet-name', true)
					.classed('uninhabited', function(d) {
						return d.affiliation === '?' || d.affiliation.toLowerCase() === 'no record';
					})
					.classed('hidden-system', function(d) {
						return d.affiliation.toLowerCase() === 'hidden system';
					})
					.classed('inhabited', function(d) {
						return d.affiliation !== '?' && d.affiliation.toLowerCase() !== 'no record' && d.affiliation.toLowerCase() !== 'hidden system';
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
					.classed('periphery-capital', function (d) {
						var name = d.name.toLowerCase();
						return name === 'taurus' ||
							name === 'canopus' ||
							name === 'alphard' ||
							name === 'oberon' ||
							name === 'alpheratz';
					})
					.classed('has-userdata', function (d) {
						return !!d.userData;
					})
					.attr('name', function(d) { return d.name; })
					.text(function(d) {	return d.name; })
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

			if(me.svg.classed('labels-successor-states')
				|| me.svg.classed('labels-major-powers')
				|| me.svg.classed('labels-all')) {
				if(me.isEdge) {
					me.svg.selectAll('g.state-labels > g').attr('transform', me.transformers.labelGroup.bind(me));
				} else {
					me.svg.selectAll('g.state-labels > g').attr('style', me.transformers.labelGroup.bind(me));
				}
			}
			me.svg.select('circle.jump-range')
				.classed('visible', false)
			//this.svg.selectAll('path.jump-route')
			//	.attr('d', this.transformers.transformJumpRoute);
			me.svg.selectAll('circle.planet')
				.attr('transform', me.transformers.planetCircle.bind(me));
			me.svg.selectAll('path.capital')
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
			cy = -((((translation[1] / -1)  + halfHeight) / scale - halfHeight) / me.pxPerLy);
			return [cx, cy];
		},

		/**
		 * Center the map on any set of universe coordinates
		 */
		centerOnCoordinates : function (cx, cy, zoomScale) {
			var me = this;
			var bbox = me.svg.node().getBoundingClientRect();
			var scale;
			if(zoomScale !== undefined) {
				me.zoom.scale(zoomScale);
				scale = zoomScale;
			} else {
				scale = me.zoom.scale();
			}
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
			var planetName, circle, text;

			if(typeof planet === 'string') {
				planetName = planet.split('(')[0].trim();
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
			text = this.svg.select('text[name="'+planetName+'"]');
			for(var i = 0, len = this.selectedPlanets.length; i < len; i++) {
				if(this.selectedPlanets[i] === planet) {
					// deselect planet
					this.selectedPlanets.splice(i, 1);
					circle.classed('selected', false);
					text.classed('selected', false);
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
			text.classed('selected', true);
			this.fireEvent('selectionadded', planet);
			this.fireEvent('selectionchanged', this.selectedPlanets);
		},

		/**
		 * Update the system display after a single user data entry has changed.
		 */
		updateUserDataHighlight : function (idx, planet) {
			var circle, text;

			circle = this.svg.select('circle[name="'+planet.name+'"]');
			circle.classed('has-userdata', !!planet.userData);

			text = this.svg.select('text[name="'+planet.name+'"]');
			text.classed('has-userdata', !!planet.userData);
		},

		/**
		 * Update the system display after a new set of user data has been loaded.
		 */
		updateAllUserDataHighlights : function () {
			this.svg.selectAll('circle.has-userdata').classed('has-userdata', false);
			this.svg.selectAll('text.has-userdata').classed('has-userdata', false);

			this.svg.selectAll('g.planet-circles circle')
				.data(this.planets)
				.classed('has-userdata', function (d) {	return !!d.userData; });
			this.svg.selectAll('g.planet-names text')
				.data(this.planets)
				.classed('has-userdata', function (d) { return !!d.userData; });
		},

		/**
		 * Find planet id by name
		 */
		findPlanetId : function (name) {
			name = name.trim().toLowerCase();
			if(!name) {
				throw 'No planet name given';
			}
			// Pass 1: look for exact matches (system name, aliases and objects)
			for(var i = 0, len = this.planets.length; i < len; i++) {
				if(this.planets[i].name.toLowerCase() === name) {
					return i;
				}
				for(var j = 0, jlen = this.planets[i].aliases.length; j < jlen; j++) {
					if(this.planets[i].aliases[j].toLowerCase() === name) {
						return i;
					}
				}
				for(var j = 0, jlen = this.planets[i].objects.length; j < jlen; j++) {
					if(this.planets[i].objects[j].toLowerCase() === name) {
						return i;
					}
				}
			}
			// Pass 2: look for substring matches at the start
			for(var i = 0, len = this.planets.length; i < len; i++) {
				if(this.planets[i].name.toLowerCase().indexOf(name) === 0) {
					return i;
				}
				for(var j = 0, jlen = this.planets[i].aliases.length; j < jlen; j++) {
					if(this.planets[i].aliases[j].toLowerCase().indexOf(name) === 0) {
						return i;
					}
				}
				for(var j = 0, jlen = this.planets[i].objects.length; j < jlen; j++) {
					if(this.planets[i].objects[j].toLowerCase().indexOf(name) === 0) {
						return i;
					}
				}
			}
			// Pass 3: look for substring matches
			for(var i = 0, len = this.planets.length; i < len; i++) {
				if(this.planets[i].name.toLowerCase().indexOf(name) !== -1) {
					return i;
				}
				for(var j = 0, jlen = this.planets[i].aliases.length; j < jlen; j++) {
					if(this.planets[i].aliases[j].toLowerCase().indexOf(name) !== -1) {
						return i;
					}
				}
				for(var j = 0, jlen = this.planets[i].objects.length; j < jlen; j++) {
					if(this.planets[i].objects[j].toLowerCase().indexOf(name) !== -1) {
						return i;
					}
				}
			}
			throw 'Planet "' + name + '" could not be found';
		},

		/**
		 * Component transformation functions
		 */
		transformers : {
			planetGroup : function (d, i) {
				return 'translate('+this.xScale(0)+','+this.yScale(0)+') scale('+this.zoom.scale()*this.pxPerLy+')';
			},
			borderPath : function (d, i) {
				return 'translate('+this.xScale(d.x || 0)+','+this.yScale(d.y || 0) + ') scale('+this.zoom.scale()*this.pxPerLy+')';
			},
			labelGroup : function (d, i) {
				var label = d3.select('g.state-labels > g.' + d.name);
				var bbox = label.node().getBBox();
				var wWidth = window.innerWidth;
				var wHeight = window.innerHeight;
				// check if a significant part of the current region is visible
				var centroidX = this.xScale(d.centroid[0]);
				var centroidY = this.yScale(d.centroid[1]);
				var scale = this.zoom.scale();
				var sizeX = d.dims ? d.dims[0] * this.pxPerLy * scale : 1;
				var sizeY = d.dims ? d.dims[1] * this.pxPerLy * scale : 1;
				var left = centroidX - sizeX;
				var right = centroidX + sizeX;
				var top = centroidY - sizeY;
				var bottom = centroidY + sizeY;

				if(right < 0 || left > wWidth
					|| bottom < 0 || top > wHeight) {
					label.classed('out-of-vision', true);
				} else {
					label.classed('out-of-vision', false);
				}


				var x = this.xScale(d.centroid[0]);
				var y = this.yScale(d.centroid[1]);
				if(left >= 0 && right <= wWidth && top >= 0 && bottom <= wHeight) {
					x = this.xScale(d.preferredLabelPos[0]);
					y = this.yScale(d.preferredLabelPos[1]);
				} else {
					x = (Math.max(0, left) + Math.min(wWidth, right)) * .5;
					y = (Math.max(0, top) + Math.min(wHeight, bottom)) * .5;
				}

				// set label coordinates

				x -= bbox.width * .5;
				y -= bbox.height * .5;

				if(this.isEdge) {
					return 'translate('+x+','+y+')'
				} else {
					return 'transform:translate('+x+'px,'+y+'px)';
				}
			},
			planetCircle : function (d, i) {
				return 'translate('+this.xScale(d.x) + ',' + this.yScale(d.y) + ')';
			},
			planetText : function (d, i) {
				var ret = 'translate(';
				ret += (this.xScale(d.x) + this.PLANET_RADIUS*2 + (d.isCapital ? this.PLANET_RADIUS * 0.75 : 0));
				ret += ',' ;
				ret += (this.yScale(d.y)+(this.PLANET_RADIUS*0.5+2)) + ')';
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
		},

		// http://stackoverflow.com/questions/6157929/how-to-simulate-a-mouse-click-using-javascript
		simulateEvent : function(element, eventName) {
			console.log('event', arguments);
			var eventMatchers = {
				'HTMLEvents': /^(?:load|unload|abort|error|select|change|submit|reset|focus|blur|resize|scroll)$/,
				'MouseEvents': /^(?:click|dblclick|mouse(?:down|up|over|move|out))$/
			};
			var defaultOptions = {
				pointerX: 0,
				pointerY: 0,
				button: 0,
				ctrlKey: false,
				altKey: false,
				shiftKey: false,
				metaKey: false,
				bubbles: true,
				cancelable: true
			};
			var extend = function(destination, source) {
				for (var property in source)
				  destination[property] = source[property];
				return destination;
			}

		    var options = extend(defaultOptions, arguments[2] || {});
		    var oEvent, eventType = null;

		    for (var name in eventMatchers) {
		        if (eventMatchers[name].test(eventName)) { eventType = name; break; }
		    }

		    if (!eventType) {
		        throw new SyntaxError('Only HTMLEvents and MouseEvents interfaces are supported');
			}

		    if (document.createEvent) {
		        oEvent = document.createEvent(eventType);
		        if (eventType == 'HTMLEvents') {
					oEvent.initEvent(eventName, options.bubbles, options.cancelable);
		        } else {
		            oEvent.initMouseEvent(eventName, options.bubbles, options.cancelable, document.defaultView,
		            options.button, options.pointerX, options.pointerY, options.pointerX, options.pointerY,
		            options.ctrlKey, options.altKey, options.shiftKey, options.metaKey, options.button, element);
		        }
		        element.dispatchEvent(oEvent);
		    } else {
		        options.clientX = options.pointerX;
		        options.clientY = options.pointerY;
		        var evt = document.createEventObject();
		        oEvent = extend(evt, options);
		        element.fireEvent('on' + eventName, oEvent);
		    }
		    return element;
		}
	};
});
