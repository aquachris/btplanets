'use strict';

var PLANET_RADIUS = 4;
var ZOOM_FACTOR_MIN = 0.5;
var ZOOM_FACTOR_MAX = 40;
var svg = null;
var x = null;
var y = null;
var legendScale = null;
var zoom = null;
var planets = null;
var legendGroup = null;
var legendAxis = null;
var legendAxisGroup = null;
var legendUnitText = null;
var legendBackground = null;
var curBox = null;
var pxPerLy = 1;
var repaintTimeout = null;

var borders = [{
	name : 'FedSuns',
	d : [[2.095,-2.221],[13.80807,-12.36045],[6.45861,5.90183],[12.58316,-7.34945],[18.26229,6.34726],[3.56337,-6.23591],[20.04393,3.34067],[55.6777,-20.4894],[5.5678,6.68133],[5.3451,-3.56338],[-0.4455,-16.70331],[-19.1531,0],[-1.0022,-7.12674],[25.055,-10.46741],[7.1267,9.68792],[21.2689,-6.2359],[5.2337,5.2337],[8.3517,-2.33846],[3.5633,7.2381],[52.5598,-27.17072],[7.7949,2.44982],[2.1157,-8.35165],[17.2601,-8.01759],[28.7297,28.06156],[16.1465,-3.11795],[20.2667,11.02418],[58.907,-2.89524],[23.1619,14.81027],[8.5744,46.10113],[-1.4476,15.14434],[-14.2535,13.36265],[0.8908,15.70111],[-26.6139,24.05276],[-5.1223,28.95241],[-11.0242,21.82565],[-13.8081,35.63373],[-34.5202,41.53557],[-42.4264,12.69451],[-23.7187,8.79708],[-7.1267,7.2381],[-27.1707,-1.22491],[-48.4396,18.81906],[-20.044,-3.67473],[-17.5942,4.12015],[-31.4022,13.36265],[-14.2535,-28.06156],[-12.6945,-3.67473],[1.3363,-13.91942],[10.1333,1.55897],[-0.1113,-5.01099],[-14.5876,-0.22271],[-26.83665,-7.79488],[-9.46521,-18.48499],[3.56337,-11.58097],[12.02638,5.12235],[14.36485,5.56777],[1.67033,7.34946],[13.80803,-2.67253],[1.6704,-17.59415],[-30.17734,-13.13994],[-8.90843,-3.67473],[4.89963,-10.02199],[24.72094,5.45642],[-0.2227,-17.59415],[-8.01764,-13.02859],[-0.66813,-31.62493],[11.69227,-17.4828],[17.8169,-2.44981],[-1.7817,-8.46302],[-23.71867,5.23371],[-3.56338,-6.2359],[-26.50258,6.01319],[-1.89304,-4.78828],[3.78608,-7.90624],[-26.39123,-0.33406],[1.44762,-9.79928],[12.91723,7.12675],[23.38463,2.00439],[7.46081,-15.70111],[12.13773,-4.67692],[-4.78827,-7.12675],[-12.91723,6.79268],[-4.2315,-2.89524],[4.56557,-6.01319],[11.58096,-16.03518],[-3.0066,-7.90623],[-6.34725,2.22711],[-6.56997,15.4784],[-6.34726,2.44981],[-1.11355,7.68353],[-12.36045,2.67253],[-3.11795,-6.79268],[2.89524,-4.0088],[4.45421,-6.45861],[1.33627,-8.57437],[-8.68572,0.22271],[-8.2403,6.0132],[-18.485,-4.45422]]
}];

var setScales = function () {
	var bbox = svg.node().getBoundingClientRect();
	var diff = bbox.width - bbox.height;
	var zoomTranslate = null;
	var zoomScale = null;
	var centerCoords = null;
	
	if(zoom) {
		zoomTranslate = zoom.translate();
		zoomScale = zoom.scale();
		centerCoords = getCurrentCenterCoordinates();
	}
	
	x = d3.scale.linear()
		.domain([-600, 600])
		.range([diff /2, bbox.width - diff/2]);
	y = d3.scale.linear()
		.domain([-600, 600])
		.range([bbox.height, 0]);

	if(zoom) {
		zoom.x(x).y(y).scale(zoomScale);
	}
	pxPerLy = bbox.height / 1200;
	
	if(centerCoords) {
		centerOnCoordinates(centerCoords[0], centerCoords[1]);
	}
	
	curBox = bbox;
	//repaintLegend();
};

var repaintLegend = function () {
	var bbox = svg.node().getBoundingClientRect();
	var diff = bbox.width - bbox.height;
	legendScale
		.domain([0, (300 / pxPerLy) / zoom.scale()])
		.range([0, 300]);

	if(legendBackground) {
		legendGroup
			.attr('transform', 'translate(10,'+(bbox.height-54)+')');
		legendBackground
			.attr('height', 32)
			.attr('width', 390);
		legendUnitText
			.attr('x', 326)
			.attr('y', 20);
			//.attr('y', bbox.height-36);
	}
	if(legendAxisGroup) {
		legendAxis.scale(legendScale);
		legendAxisGroup
			.attr('transform', 'translate(10,24)')
			.call(legendAxis);
	}
};

var transformBorder = function (d, i) {
	var data = d.d, lastX = 0, lastY = 0,
		str = 'M ';
	for(var j = 0, len = data.length; j < len; j++) {
		str += x(data[j][0] + lastX) + ',' +  y(data[j][1] + lastY) + ' ';
		lastX = lastX + data[j][0];
		lastY = lastY + data[j][1];
	}
	return str + 'Z';
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

var scheduleRepaint = function () {
	clearTimeout(repaintTimeout);
	repaintTimeout = setTimeout(setViewport, 50);
};

/**
 * Repaint
 */
var setViewport = function () {
	console.log(y(0) - y(1), pxPerLy);
	svg.selectAll('path.border')
		.attr('d', transformBorder);
	svg.selectAll('circle.planet')
		.attr('transform', transform);
	svg.selectAll('text.planet-name')
		.attr('transform', transformText);
	svg.classed('zoomed-in', zoom.scale() > getDetailThreshold());
	
	repaintLegend();
};

var getDetailThreshold = function () {
	return 3 / pxPerLy;
};

var createVisualization = function () {
	zoom.x(x)
		.y(y)
		.scaleExtent([ZOOM_FACTOR_MIN, ZOOM_FACTOR_MAX])
		.on('zoom', setViewport)
		.on('zoomstart', function () {
			svg.classed('dragging', true);
		})
		.on('zoomend', function () {
			svg.classed('dragging', false);
		});
	svg.call(zoom);
		
	//borders = [{
	//	name : 'FedSuns',
	//	d : [[2.095,-2.221],[13.80807,-12.36045],[6.45861,5.90183],[12.58316,-7.34945],[18.26229,6.34726],[3.56337,-6.23591],[20.04393,3.34067],[55.6777,-20.4894],[5.5678,6.68133],[5.3451,-3.56338],[-0.4455,-16.70331],[-19.1531,0],[-1.0022,-7.12674],[25.055,-10.46741],[7.1267,9.68792],[21.2689,-6.2359],[5.2337,5.2337],[8.3517,-2.33846],[3.5633,7.2381],[52.5598,-27.17072],[7.7949,2.44982],[2.1157,-8.35165],[17.2601,-8.01759],[28.7297,28.06156],[16.1465,-3.11795],[20.2667,11.02418],[58.907,-2.89524],[23.1619,14.81027],[8.5744,46.10113],[-1.4476,15.14434],[-14.2535,13.36265],[0.8908,15.70111],[-26.6139,24.05276],[-5.1223,28.95241],[-11.0242,21.82565],[-13.8081,35.63373],[-34.5202,41.53557],[-42.4264,12.69451],[-23.7187,8.79708],[-7.1267,7.2381],[-27.1707,-1.22491],[-48.4396,18.81906],[-20.044,-3.67473],[-17.5942,4.12015],[-31.4022,13.36265],[-14.2535,-28.06156],[-12.6945,-3.67473],[1.3363,-13.91942],[10.1333,1.55897],[-0.1113,-5.01099],[-14.5876,-0.22271],[-26.83665,-7.79488],[-9.46521,-18.48499],[3.56337,-11.58097],[12.02638,5.12235],[14.36485,5.56777],[1.67033,7.34946],[13.80803,-2.67253],[1.6704,-17.59415],[-30.17734,-13.13994],[-8.90843,-3.67473],[4.89963,-10.02199],[24.72094,5.45642],[-0.2227,-17.59415],[-8.01764,-13.02859],[-0.66813,-31.62493],[11.69227,-17.4828],[17.8169,-2.44981],[-1.7817,-8.46302],[-23.71867,5.23371],[-3.56338,-6.2359],[-26.50258,6.01319],[-1.89304,-4.78828],[3.78608,-7.90624],[-26.39123,-0.33406],[1.44762,-9.79928],[12.91723,7.12675],[23.38463,2.00439],[7.46081,-15.70111],[12.13773,-4.67692],[-4.78827,-7.12675],[-12.91723,6.79268],[-4.2315,-2.89524],[4.56557,-6.01319],[11.58096,-16.03518],[-3.0066,-7.90623],[-6.34725,2.22711],[-6.56997,15.4784],[-6.34726,2.44981],[-1.11355,7.68353],[-12.36045,2.67253],[-3.11795,-6.79268],[2.89524,-4.0088],[4.45421,-6.45861],[1.33627,-8.57437],[-8.68572,0.22271],[-8.2403,6.0132],[-18.485,-4.45422]]
	//}];
	//console.log(planets, borders);
	//var borderGroup = svg.select('g.borders');
	//var borders = borderGroup.selectAll('path')
	//		.data(borders)
	//	.enter().append('path')
	//		.classed('border', true)
	//		.attr('d', transformBorder);
	//	attr('transform', 'translate'
		
	
	var circleGroup = svg.select('g.planet-circles');
	var circles = circleGroup.selectAll('circle')
			.data(planets)
		.enter().append('circle')
			.attr('r', PLANET_RADIUS)
			.attr('cx', -PLANET_RADIUS*0.5)
			.attr('cy', -PLANET_RADIUS*0.5)
			//.attr('fill', faction)
			.attr('class', function (d) {
				if(d.affiliation === '?' || d.affiliation.toLowerCase() === 'no record') {
					return 'uncharted';
				}
				return d.affiliation.toLowerCase().replace(/[\'\/]+/g, '').replace(/\s+/g, '-');
			})
			.classed('planet', true)
			//.classed('hidden', function (d) {
			//	if(d.affiliation === '?' || d.affiliation === 'No Record') {
				//	return true;
//				}
	//			return false;
		//	})
			.attr('transform', transform);
	
	var namesGroup = svg.select('g.planet-names');
	var names = namesGroup.selectAll('text')
			.data(planets)
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
			.attr('transform', transformText);
	
	legendGroup = svg.select('g.legend');
	legendBackground = legendGroup.append('rect')
		.classed('scale-axis-background', true);
		
	legendUnitText = legendGroup.append('text')
		.text('Light years');
		
	legendAxis = d3.svg.axis()
		.scale(legendScale)
		.orient('top');
		
	legendAxisGroup = legendGroup.append('g')
		.classed('scale-axis', true)
		.call(legendScale);
		
	repaintLegend();
};

var resetView = function () {
	zoom && zoom.scale(1).translate([0,0]);
	setViewport();
};

/**
 * Get the currently centered map-space coordinates
 */
var getCurrentCenterCoordinates = function () {
	var bbox = curBox || svg.node().getBoundingClientRect();
	var cx = 0, cy = 0;
	var translation = zoom.translate();
	var scale = zoom.scale();
	var halfWidth = bbox.width * 0.5;
	var halfHeight = bbox.height * 0.5;
	cx = ((-translation[0] + halfWidth) / scale - halfWidth) / pxPerLy;
	cy = -((((translation[1] / -1)  + halfHeight) / scale - halfHeight) / pxPerLy)
	return [cx, cy];
};

/**
 * Center the map on any set of universe coordinates
 */
var centerOnCoordinates = function (cx, cy) {
	var bbox = svg.node().getBoundingClientRect();
	var scale = zoom.scale();
	var xTranslate = -((bbox.width * 0.5 + cx * pxPerLy) * scale - bbox.width * 0.5);
	var yTranslate = -((bbox.height * 0.5 - cy * pxPerLy) * scale - bbox.height * 0.5);
	zoom && zoom.translate([xTranslate, yTranslate]);
	setViewport();//scheduleRepaint();
};

var centerOnTerra = function () {
	centerOnCoordinates(0, 0);
	//centerOnCoordinates(266.49, -110.83); // New Avalon
};

var handleKeys = function () {
	var key = d3.event.keyCode;
	var coords = getCurrentCenterCoordinates();
	//console.log(key);
	if(key === 32) { // SPACE
		centerOnTerra();
		d3.event.stopPropagation();
		d3.event.preventDefault();
	} else if(key === 107 || key ===187 || key === 69) { // +, Numpad+ or E
		// zoom in
		zoom.scale(Math.min(ZOOM_FACTOR_MAX, zoom.scale()*1.148698354997035));
		centerOnCoordinates(coords[0], coords[1]);
	} else if(key === 109 || key === 189 || key === 81) { // -, Numpad- or Q
		// zoom out
		zoom.scale(Math.max(ZOOM_FACTOR_MIN, zoom.scale()/1.148698354997035));
		centerOnCoordinates(coords[0], coords[1]);
	} else if(key === 37 || key === 65) { // left arrow or A
		centerOnCoordinates(coords[0] - 25/zoom.scale(), coords[1]);
	} else if(key === 38 || key === 87) { // up arrow or W
		centerOnCoordinates(coords[0], coords[1] + 25/zoom.scale());
	} else if(key === 39 || key === 68) { // right arrow or D
		centerOnCoordinates(coords[0] + 25/zoom.scale(), coords[1]);
	} else if(key === 40 || key === 83) { // down arrow or S
		centerOnCoordinates(coords[0], coords[1] - 25/zoom.scale());
	} else if(key === 84) { // T
		centerOnCoordinates(0, 0);
	} else if(key === 82) { // R
		resetView();
	}
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
			.on('keydown', handleKeys);
	});
};

main();
