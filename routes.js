var findDistance = function (p1, p2) {
	return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
};

var planRoute =  function (fromIdx, toIdx, includeUninhabited) {
	var route = [];
	var curIdx, curPlanet, curDist; 
	var closest, closestDist;
	var sourcePlanet = planets[fromIdx];
	var targetPlanet = planets[toIdx];
	var openList = {};
	var closedList = {};
	var route = [];
	var routeFound = false;
	
	openList[fromIdx] = {
		jumps : 0,
		cameFrom : true
	};
	var iterations = 0;
	while(Object.keys(openList).length > 0) {
		iterations++;
		//  find planet that is closest to target
		closest = null;
		closestDist = Infinity;
		for(var key in openList) {
			if(!openList.hasOwnProperty(key)) {
				continue;
			}
			curPlanet = planets[key];
			if(!includeUninhabited && (curPlanet.affiliation === '?' || curPlanet.affiliation.toLowerCase() === 'no record')) {
				closedList[key] = openList[key];
				delete(openList[key]);
				continue;
			}
			curDist = findDistance(curPlanet, targetPlanet);
			if(curDist < closestDist) {
				curIdx = key;
				closest = curPlanet;
				closestDist = curDist;
			}
		}
		if(!closest) {
			return 'Closest neighbor cannot be found ('+ iterations + ' systems searched)';
		}
		if(closest === targetPlanet) {
			console.log('target found, breaking');
			closedList[curIdx] = openList[curIdx];
			console.log(openList[curIdx]);
			delete openList[curIdx];
			break;
		}
		
		// closest planet found, add all of its neighbors to open list (unless they are in closedList)
		for(var i = 0, len = closest.neighbors.length; i < len; i++) {
			if(closedList.hasOwnProperty(closest.neighbors[i])) {
				continue;
			}
			if(!openList.hasOwnProperty(closest.neighbors[i])
				|| openList[closest.neighbors[i]].jumps > openList[curIdx].jumps+1) {
				openList[closest.neighbors[i]] = {
					cameFrom : curIdx,
					jumps : openList[curIdx].jumps+1
				};
			}
		}
		
		closedList[curIdx] = openList[curIdx];
		delete openList[curIdx];
		
		if(iterations > 4000) {
			return 'more than 4000 iterations, breaking off path search';
		}
	}
	if(closedList[toIdx].cameFrom === null) {
		return 'No route';
	}
	
	// assemble final route
	curIdx = toIdx;
	curPlanet = planets[toIdx];
	
	do {
		route.push(curIdx);
		curIdx = closedList[curIdx].cameFrom;
	} while(closedList[curIdx].jumps > 0);
	route.push(fromIdx);
	return route.reverse();
};

// TODO pass components as data into components
var plotRoute = function(fromIdx, toIdx)  {
	var route = planRoute(fromIdx, toIdx);
	var routePath = '';
	var routeComponents = [];
	var planet = null;
	var planet2 = null;
	var group = d3.select('g.jump-routes');
	
	if(typeof route === 'string') {
		console.log(route);
		return;
	}
	
	for(var i = 0, len = route.length; i < len; i++) {
		if(i >= len - 1) { 
			continue;
		}
		planet = planets[route[i]];
		planet2 = planets[route[i+1]];
		routeComponents.push({
			x1 : planet.x,
			y1 : planet.y,
			x2 : planet2.x,
			y2 : planet2.y
		});
		//{d:'M'+x(planet.x)+','+y(planet.y) + 'L'+x(planet2.x)+','+y(planet2.y)+'Z'});
	}
	group.selectAll('*').remove();
	group.selectAll('path')
			.data(routeComponents)
		.enter()
			.append('path')
			.classed('jump-route', true)
			.attr('stroke', '#f00')
			.attr('d', transformJumpRoute);
};