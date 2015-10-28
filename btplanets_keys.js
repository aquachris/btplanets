'use strict';

if(!window.BTPLANETS) {
	throw 'BTPLANETS is not defined';
}

BTPLANETS.handleKey = function () {
	var me = BTPLANETS;
	var key = d3.event.keyCode;
	var coords = me.getCurrentCenterCoordinates();
	//console.log(key);
	if(key === 32) { // SPACE
		me.centerOnTerra();
		d3.event.stopPropagation();
		d3.event.preventDefault();
	} else if(key === 107 || key ===187 || key === 69) { // +, Numpad+ or E
		// zoom in
		me.zoom.scale(Math.min(me.ZOOM_FACTOR_MAX, me.zoom.scale()*1.148698354997035));
		me.centerOnCoordinates(coords[0], coords[1]);
	} else if(key === 109 || key === 189 || key === 81) { // -, Numpad- or Q
		// zoom out
		me.zoom.scale(Math.max(me.ZOOM_FACTOR_MIN, me.zoom.scale()/1.148698354997035));
		me.centerOnCoordinates(coords[0], coords[1]);
	} else if(key === 37 || key === 65) { // left arrow or A
		me.centerOnCoordinates(coords[0] - 25/me.zoom.scale(), coords[1]);
	} else if(key === 38 || key === 87) { // up arrow or W
		me.centerOnCoordinates(coords[0], coords[1] + 25/me.zoom.scale());
	} else if(key === 39 || key === 68) { // right arrow or D
		me.centerOnCoordinates(coords[0] + 25/me.zoom.scale(), coords[1]);
	} else if(key === 40 || key === 83) { // down arrow or S
		me.centerOnCoordinates(coords[0], coords[1] - 25/me.zoom.scale());
	} else if(key === 84) { // T
		me.centerOnCoordinates(0, 0);
	} else if(key === 82) { // R
		me.resetView();
	}
};

BTPLANETS.initKeyListeners = function () {
	d3.select('body').on('keydown', BTPLANETS.handleKey);
};