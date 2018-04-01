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

		clear : function () {
			this.stops = [];
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
			var route = [];

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

			var startPlanet = btplanets.planets[options.fromIdx];
			var targetPlanet = btplanets.planets[options.toIdx];

			// The open list is a key/value map containing all planets that can be reached from the
			// investigated planets, but that have not been investigated themselves.
			// The planet entries in the open list have three properties:
			// - jumps: The minimum number of jumps to reach the planet
			// - cameFrom: The planet previously visited in the route
			// - heuristicDistance: The distance travelled according to the heuristic function (30 * number of jumps)};
			//
			// There are two openList objects because we are employing a bidirectional search strategy.
			var openListStartTarget = {}; // The open list for the search direction (start -> target)
			var openListTargetStart = {}; // The open list for the reverse direction (target -> start)

			openListStartTarget[options.fromIdx] = {
				cameFrom : true,
				jumps : 0,
				heuristicDistance : 0
			};
			openListTargetStart[options.toIdx] = {
				cameFrom: true,
				jumps : 0,
				heuristicDistance : 0
			};

			// The closed list is a key/value map containing all investigated planets
			// See openList for entry structure.
			var closedListStartTarget = {};
			var closedListTargetStart = {};

			// The list of planet ids for the finished route
			var routeStartTarget = [];
			var routeTargetStart = [];

			// Track the iterations made
			var iterations = 0;
			var systemsSearched = 0;

			// Loop variables
			var curListObj, curIdx;
			var mergeIdxStartTarget = -1;
			var mergeIdxTargetStart = -1;
			var mergeIdx = -1;

			// Main search loop: check the open lists for the planets that are closest
			// to the target / start planet. Alternate between the two searches.
			while(Object.keys(openListStartTarget).length > 0 || Object.keys(openListTargetStart).length > 0) {
				iterations++;

				// START -> TARGET direction
				// find planet in open list that is closest to the target
				if(Object.keys(openListStartTarget).length > 0) {
					systemsSearched++;
					curListObj = this.processNextPlanet(
						openListStartTarget,
						closedListStartTarget,
						targetPlanet,
						options,
						systemsSearched
					);
					// check if termination condition is reached
					if(curListObj.planet === targetPlanet || closedListTargetStart.hasOwnProperty(curListObj.idx)) {
						mergeIdxStartTarget = curListObj.idx;
					}
				}

				// TARGET -> START direction
				// find planet in open list that is closest to the start
				if(Object.keys(openListTargetStart).length > 0) {
					systemsSearched++;
					curListObj = this.processNextPlanet(
						openListTargetStart,
						closedListTargetStart,
						startPlanet,
						options,
						systemsSearched
					);
					// check if termination condition is reached
					if(curListObj.planet === startPlanet || closedListStartTarget.hasOwnProperty(curListObj.idx)) {
						mergeIdxTargetStart = curListObj.idx;
					}
				}

				// pick the merge point
				if(mergeIdxStartTarget > 0 || mergeIdxTargetStart > 0) {
					// only the forward search has found a merge point
					// OR both searches have found the same merge point
					// OR the forward search has arrived at the target planet
					if(mergeIdxStartTarget === mergeIdxTargetStart ||
							mergeIdxTargetStart < 0 ||
							closedListStartTarget.hasOwnProperty(options.toIdx)) {
						mergeIdx = mergeIdxStartTarget;
					// there is only a merge point for the reverse search
					} else if(mergeIdxStartTarget < 0) {
						mergeIdx = mergeIdxTargetStart;
					// two different merge points have been found:
					// pick the alphabetically first planet from both options to remain consistent
					} else {
						if(btplanets.planets[mergeIdxStartTarget].name < btplanets.planets[mergeIdxTargetStart].name) {
							mergeIdx = mergeIdxStartTarget;
						} else {
							mergeIdx = mergeIdxTargetStart;
						}
					}
					break;
				}

				if(iterations > 4000) {
					throw 'more than 4000 iterations, breaking off path search';
				}
			}

			if(mergeIdx < 0) {
				closedListStartTarget[options.fromIdx] = {
					cameFrom : true,
					jumps : 0,
					heuristicDistance : 0
				};
				closedListStartTarget[options.toIdx] = {
					cameFrom: options.fromIdx,
					jumps : Infinity,
					heuristicDistance : this.findDistance(startPlanet, targetPlanet)
				};
				closedListTargetStart[options.fromIdx] = {
					cameFrom : options.toIdx,
					jumps : Infinity,
					heuristicDistance : this.findDistance(startPlanet, targetPlanet)
				};
				closedListTargetStart[options.toIdx] = {
					cameFrom: true,
					jumps : 0,
					heuristicDistance : 0
				};
				mergeIdx = options.toIdx;
				//throw 'Target cannot be reached';// ('+iterations*2+' systems searched)';

			}

			// Assemble final route for forward direction:
			// Go backward from the merge planet using the "cameFrom" property and
			// track the path, then reverse at the end.
			curIdx = mergeIdx;
			if(closedListStartTarget.hasOwnProperty(curIdx)) {
				while(closedListStartTarget[curIdx].jumps > 0) {
					route.push(Number(curIdx));
					curIdx = closedListStartTarget[curIdx].cameFrom;
				}
				route.push(Number(options.fromIdx));
				route.reverse();
			}

			// Assemble final route for reverse direction:
			// Go forward from the merge planet using the "cameFrom" property and
			// track the path. Merge with path from forward search.
			curIdx = mergeIdx;
			if(!closedListStartTarget.hasOwnProperty(options.toIdx)) {
				while(closedListTargetStart[curIdx].jumps > 0) {
					if(curIdx !== mergeIdx) {
						route.push(Number(curIdx));
					}
					curIdx = closedListTargetStart[curIdx].cameFrom;
				}
				route.push(Number(options.toIdx));
			}

			//console.log('search completed after ' + iterations + ' iterations.');
			return route;
		},

		/**
		 * Find and process the best candidate in a given open list and modify the given
		 * open and closed lists accordingly.
		 * @private
		 */
		processNextPlanet : function (openList, closedList, target, options, systemsSearched) {
			var testDist, testPlanet;
			var curAff, affCat;
			var retObj = {
				idx : -1,
				planet : null,
				closestDist : Infinity
			};
			for(var testKey in openList) {
				if(!openList.hasOwnProperty(testKey)) {
					continue;
				}
				testPlanet = btplanets.planets[testKey];
				// determine planet affiliation
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

				// test for exclusion filters:
				// exclusion of uninhabited planets
				if(!options.includeUninhabited && (curAff === '?' || curAff === 'no record')) {
					closedList[testKey] = openList[testKey];
					delete(openList[testKey]);
					continue;
				}
				// exclusion by planet affiliation
				if(options.excludeAffiliations[affCat] === true) {
					closedList[testKey] = openList[testKey];
					delete(openList[testKey]);
					continue;
				}

				// planet not excluded, check distance and compare to shortest distance
				testDist = this.findDistance(testPlanet, target) + openList[testKey].heuristicDistance;
				if(testDist < retObj.closestDist) {
					retObj.idx = testKey;
					retObj.closestDist = testDist;
					retObj.planet = testPlanet;
				}
			}
			// no more valid entries in openList
			if(!retObj.planet) {
				//console.warn('No more valid neighbor systems found (' + systemsSearched + ' systems searched)');
				return retObj;
			}
			// planet is target planet
			if(retObj.planet === target) {
				closedList[retObj.idx] = openList[retObj.idx];
				delete openList[retObj.idx];
				return retObj;
			}

			// closest planet found, add all of its neighbors to open list (unless they are in closedList already)
			for(var i = 0, len = retObj.planet.neighbors.length; i < len; i++) {
				// ignore neighbors that are in closed list
				if(closedList.hasOwnProperty(retObj.planet.neighbors[i])) {
					continue;
				}
				// set or update the openList entry, if the number of jumps from the current
				// closest planet is less than the existing path
				if(!openList.hasOwnProperty(retObj.planet.neighbors[i]) ||
						openList[retObj.planet.neighbors[i]].jumps > openList[retObj.idx].jumps+1) {
					openList[retObj.planet.neighbors[i]] = {
						cameFrom : retObj.idx,
						jumps : openList[retObj.idx].jumps+1,
						heuristicDistance : (openList[retObj.idx].jumps+1) * 30
					};
				}
			}

			// add current system to closed list
			closedList[retObj.idx] = openList[retObj.idx];
			delete openList[retObj.idx];

			return retObj;
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
			var planet1, planet2;
			var stopNameMap = {};
			var group = d3.select('svg').select('g.jump-routes');

			// remove the previous route from the dom
			group.selectAll('path.jump-path').remove();
			d3.selectAll('circle.route')
				.classed('route', false)
				.classed('route-start', false)
				.classed('route-end', false)
				.classed('route-stop', false);
			d3.selectAll('text.planet-name')
				.classed('route', false)
				.classed('route-start', false)
				.classed('route-end', false)
				.classed('route-stop', false);

			if(typeof route === 'string') {
				throw route;//console.log(route);
			}

			if(!this.stops || this.stops.length < 2) {
				return;
			}

			// reset stops info
			this.stops[0].numJumps = 0;
			for(var i = 1, len = this.stops.length; i < len; i++) {
				this.stops[i].numJumps = '\u221e';
			}

			for(var i = 0, len = this.stops.length - 1; i < len; i++) {
				options.fromIdx = this.stops[i].index;
				options.toIdx = this.stops[i+1].index;
				stopNameMap[this.stops[i].name] = true;
				stopNameMap[this.stops[i+1].name] = true;
				curStretch = this.findRoute(options);
				this.stops[i+1].distance = this.findDistance(this.stops[i], this.stops[i+1]);
				if(curStretch.length === 2 && this.stops[i+1].distance > 30) {
					this.stops[i+1].numJumps = Infinity;
				} else {
					this.stops[i+1].numJumps = curStretch.length - 1;
				}
				if(route.length > 0 && curStretch.length > 0) {
					curStretch.shift();
				}
				route = route.concat(curStretch);
			}

			// assemble the different route components
			// and set circle and text classes in map
			for(var i = 0, len = route.length; i < len; i++) {
				if(i >= len - 1) {
					continue;
				}
				planet1 = btplanets.planets[route[i]];
				planet2 = btplanets.planets[route[i+1]];
				routeComponents.push({
					x1 : planet1.x,
					y1 : planet1.y,
					x2 : planet2.x,
					y2 : planet2.y,
					distance : this.findDistance(planet1, planet2)
				});
				d3.selectAll('circle[name="'+planet1.name+'"], text.planet-name[name="'+planet1.name+'"]')
					.classed('route', true)
					.classed('route-stop', stopNameMap.hasOwnProperty(planet1.name))
					.classed('route-start', i === 0);
				if(i === len - 2) {
					d3.selectAll('circle[name="'+planet2.name+'"], text.planet-name[name="'+planet2.name+'"]')
						.classed('route', true)
						.classed('route-stop', true)
						.classed('route-end', true);
				}
			}

			group.selectAll('path')
					.data(routeComponents)
				.enter()
					.append('path')
					.attr('class', this.transformers.jumpPathClass.bind(this))
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
			},

			/**
			 * The transformer for jump path element classes.
			 */
			jumpPathClass : function (d, i) {
				if(d.distance > 30) {
					return 'jump-path unknown';
				} else {
					return 'jump-path';
				}
			}
		}
	};
});
