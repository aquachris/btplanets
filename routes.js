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
	
	sourcePlanet.cameFrom = true;
	targetPlanet.cameFrom = null;
	openList[fromIdx] = true;
	var i = 0;
	while(Object.keys(openList).length > 0) {
		//  find planet that is closest to target
		closest = null;
		closestDist = Infinity;
		for(var key in openList) {
			if(!openList.hasOwnProperty(key)) {
				continue;
			}
			curPlanet = planets[key];
			if(curPlanet.affiliation === '?' || curPlanet.affiliation.toLowerCase() === 'no record') {
				continue;
			}
			curDist = findDistance(curPlanet, targetPlanet);
			if(curDist < closestDist) {
				curIdx = key;
				closest = curPlanet;
				closestDist = curDist;
			}
		}
		console.log(closestDist, closest);
		if(!closest) {
			throw 'Closest neighbor cannot be found for ' + Object.keys(openList).length;
		}
		if(closest === targetPlanet) {
			console.log('target found, breaking');
			break;
		}
		
		// closest planet found, add all of its neighbors to open list (unless they are in closedList)
		for(var i = 0, len = closest.neighbors.length; i < len; i++) {
			if(closedList.hasOwnProperty(closest.neighbors[i])) {
				continue;
			}
			openList[closest.neighbors[i]] = curIdx;
			planets[closest.neighbors[i]].cameFrom = Number(curIdx);
		}
		
		delete openList[curIdx];
		closedList[curIdx] = true;
		i++;
		if(i > 3000) {
			console.log('more than 3000 iterations, breaking');
			break;
		}
	}
	if(targetPlanet.cameFrom === null) {
		throw 'No route';
		return false;
	}
	
	// assemble final route
	curIdx = toIdx;
	curPlanet = planets[toIdx];
	
	do {
		route.push(curIdx);
		curIdx = curPlanet.cameFrom;
		curPlanet = planets[curIdx];
	} while(curPlanet.cameFrom !== true);
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
	
	for(var i = 0, len = route.length; i < len; i++) {
		if(i >= len - 1) { 
			continue;
		}
		planet = planets[route[i]];
		planet2 = planets[route[i+1]];
		routeComponents.push({d:'M'+x(planet.x)+','+y(planet.y) + 'L'+x(planet2.x)+','+y(planet2.y)+'Z'});
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