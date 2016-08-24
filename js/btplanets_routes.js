define(['js/lib/d3.min', 'js/btplanets'], function (d3, btplanets) {
	'use strict';

	return {
		stops : null,

		/**
		 * Initialize module
		 */
		init : function () {
			console.log('initialising route planner');
			this.stops = [];
			btplanets.on('repaint', this, this.repaintRoute.bind(this));
		},

		addStop : function (planet) {
			this.stops.push(planet);
		},

		moveStop : function (iBefore, iAfter) {
			if(iBefore >= this.stops.length) {
				throw 'Index of planet to move is out of bounds';
			}
			if(iAfter < 0) {
				throw 'Cannot move planet to index < 0';
			}
			if(iAfter >= this.stops.length) {
				throw 'Index to move to is out of bounds';
			}
			var planet = this.stops.splice(iBefore, 1)[0];
			if(iBefore < iAfter) {
				//iAfter--;
			}
			this.stops.splice(iAfter, 0, planet);
		},

		removeStop : function (i) {
			this.stops.splice(i, 1);
		},

		/**
		 * Helper function that finds the euclidean distance between two planets
		 */
		findDistance : function (p1, p2) {
			return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
		},

		/**
		 * Find a route on the map.
		 *
		 * @options Object The route planning configuration object
		 */
		findRoute : function (options) {
			options = options || {};

			if(options.fromIdx === undefined || options.fromIdx === null || options.fromIdx < 0) {
				throw 'route planner options object does not contain a start planet';
			}
			if(options.toIdx === undefined || options.toIdx === null || options.toIdx < 0) {
				throw 'route planner options object does not contain a target planet';
			}
			if(options.excludeAffiliations === undefined) {
				options.excludeAffiliations = {};
			}
			if(options.excludeAffiliations.cc !== true) {
				options.excludeAffiliations.cc = false;
			}
			if(options.excludeAffiliations.dc !== true) {
				options.excludeAffiliations.dc = false;
			}
			if(options.excludeAffiliations.fs !== true) {
				options.excludeAffiliations.fs = false;
			}
			if(options.excludeAffiliations.fwl !== true) {
				options.excludeAffiliations.fwl = false;
			}
			if(options.excludeAffiliations.lc !== true) {
				options.excludeAffiliations.lc = false;
			}
			if(options.excludeAffiliations.p !== true) {
				options.excludeAffiliations.p = false;
			}
			if(options.excludeAffiliations.o !== true) {
				options.excludeAffiliations.o = false;
			}

			var targetPlanet = btplanets.planets[options.toIdx];

			// The open list is a key/value map containing all planets that can be reached from the
			// investigated planets, but that have not been investigated themselves.
			// The planet entries in the open list have two properties:
			// - jumps: The minimum number of jumps to reach the planet
			// - cameFrom: The planet previously visited in the route
			var openList = {};
			openList[options.fromIdx] = {
				jumps : 0,
				cameFrom : true
			};

			// The closed list is a key/value map containing all investigated planets
			// See openList for entry structure.
			var closedList = {};

			// The list of planet ids for the finished route
			var route = [];

			// Track the iterations made
			var iterations = 0;

			// Loop variables
			var curIdx, curPlanet;
			var curAff = '', affCat = '';
			var closestDist;
			var testDist, testPlanet;

			// Main search loop: check the open list for the planet that is closest to the target
			while(Object.keys(openList).length > 0) {
				iterations++;
				//  find planet that is closest to target
				curIdx = -1;
				curPlanet = null;
				closestDist = Infinity;
				for(var testKey in openList) {
					if(!openList.hasOwnProperty(testKey)) {
						continue;
					}
					testPlanet = btplanets.planets[testKey];
					curAff = testPlanet.affiliation.toLowerCase();
					switch(curAff) {
						case 'capellan confederation':
							affCat = 'cc';
							break;
						case 'draconis combine':
							affCat = 'dc';
							break;
						case 'federated suns':
							affCat = 'fs';
							break;
						case 'free worlds league':
							affCat = 'fwl';
							break;
						case 'lyran commonwealth':
							affCat = 'lc';
							break;
						case 'magistracy of canopus':
						case 'taurian concordat':
						case 'outworlds alliance':
						case 'marian hegemony':
						case 'illyrian palatinate':
						case 'circinus federation':
						case 'oberon confederation':
						case "morgraine's valkyrate":
							affCat = 'p';
							break;
						default:
							affCat = 'o';
							break;
					}
					if(!options.includeUninhabited && (curAff === '?' || curAff === 'no record')) {
						closedList[testKey] = openList[testKey];
						delete(openList[testKey]);
						continue;
					}
					if(options.excludeAffiliations[affCat] === true) {
						closedList[testKey] = openList[testKey];
						delete(openList[testKey]);
						continue;
					}
					testDist = this.findDistance(testPlanet, targetPlanet);
					if(testDist < closestDist) {
						curIdx = testKey;
						closestDist = testDist;
						curPlanet = testPlanet;
					}
				}
				if(!curPlanet) {
					throw 'Closest neighbor cannot be found ('+ iterations + ' systems searched)';
				}
				if(curPlanet === targetPlanet) {
					closedList[curIdx] = openList[curIdx];
					console.log(openList[curIdx]);
					delete openList[curIdx];
					break;
				}

				// closest planet found, add all of its neighbors to open list (unless they are in closedList already)
				for(var i = 0, len = curPlanet.neighbors.length; i < len; i++) {
					// ignore neighbors that are in closed list
					if(closedList.hasOwnProperty(curPlanet.neighbors[i])) {
						continue;
					}
					// set or update the openList entry, if the number of jumps from the current
					// closest planet is less than the existing path
					if(!openList.hasOwnProperty(curPlanet.neighbors[i])
						|| openList[curPlanet.neighbors[i]].jumps > openList[curIdx].jumps+1) {
						openList[curPlanet.neighbors[i]] = {
							cameFrom : curIdx,
							jumps : openList[curIdx].jumps+1
						};
					}
				}

				closedList[curIdx] = openList[curIdx];
				delete openList[curIdx];

				if(iterations > 4000) {
					throw 'more than 4000 iterations, breaking off path search';
				}
			}

			if(!closedList[options.toIdx]) {
				throw 'Target cannot be reached';
			}

			// Assemble final route: Go from the target planet backwards using the "cameFrom" property and
			// track the path, then reverse at the end.
			curIdx = options.toIdx;

			while(closedList[curIdx].jumps > 0) {
				route.push(Number(curIdx));
				curIdx = closedList[curIdx].cameFrom;
			}
			route.push(Number(options.fromIdx));
			return route.reverse();
		},

		/**
		 * Paint a route on the map.
		 *
		 * @options Object The route planning configuration object
		 */
		plotRoute : function (options) {
			var route = [];
			var curStretch;
			var routeComponents = [];
			var group = d3.select('svg').select('g.jump-routes');

			// remove the previous route from the dom
			group.selectAll('path.jump-path').remove();

			if(typeof route === 'string') {
				throw route;//console.log(route);
				return;
			}

			if(!this.stops || this.stops.length < 2) {
				return;
			}

			for(var i = 0, len = this.stops.length - 1; i < len; i++) {
				options.fromIdx = this.stops[i].index;
				options.toIdx = this.stops[i+1].index;
				curStretch = this.findRoute(options);
				if(route.length > 0 && curStretch.length > 0) {
					curStretch.shift();
				}
				route = route.concat(curStretch);
			}

			// assemble the different route components
			var planet, planet2;
			for(var i = 0, len = route.length; i < len; i++) {
				if(i >= len - 1) {
					continue;
				}
				planet = btplanets.planets[route[i]];
				planet2 = btplanets.planets[route[i+1]];
				routeComponents.push({
					x1 : planet.x,
					y1 : planet.y,
					x2 : planet2.x,
					y2 : planet2.y
				});
			}

			group.selectAll('path')
					.data(routeComponents)
				.enter()
					.append('path')
					.attr('class', 'jump-path')
					.attr('stroke', '#f00')
					.attr('d', this.transformers.jumpPath.bind(this));
		},

		/**
		 * Reposition the path elements. Should be called after a zoom.
		 */
		repaintRoute : function () {
			var svg = d3.select('svg');
			svg.selectAll('path.jump-path')
				.attr('d', this.transformers.jumpPath.bind(this));
		},


		transformers : {
			/**
			 * The transformer function for jump path elements.
			 */
			jumpPath : function (d, i) {
				var x = btplanets.xScale,
					y = btplanets.yScale;
				return 'M'+x(d.x1)+','+y(d.y1) + 'L'+x(d.x2)+','+y(d.y2)+'Z';
			}
		}
	};
});
