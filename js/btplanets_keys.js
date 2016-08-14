define(['js/lib/d3.min', 'js/btplanets'], function (d3, btplanets) {
	'use strict';

	return {
		/**
		 * Initialize module
		 */
		init : function () {
			d3.select('body').on('keydown', this.handleKey.bind(this));
		},

		/**
		 * Key handler
		 */
		handleKey : function () {
			var key = d3.event.keyCode;
			var coords = btplanets.getCurrentCenterCoordinates();
			var zoom = btplanets.zoom;
			//console.log(key);
			if(key === 107 || key ===187 || key === 69) { // +, Numpad+ or E
				// zoom in
				zoom.scale(Math.min(btplanets.ZOOM_FACTOR_MAX, zoom.scale()*1.148698354997035));
				btplanets.centerOnCoordinates(coords[0], coords[1]);
			} else if(key === 109 || key === 189 || key === 81) { // -, Numpad- or Q
				// zoom out
				zoom.scale(Math.max(btplanets.ZOOM_FACTOR_MIN, zoom.scale()/1.148698354997035));
				btplanets.centerOnCoordinates(coords[0], coords[1]);
			} else if(key === 37 || key === 65) { // left arrow or A
				btplanets.centerOnCoordinates(coords[0] - 25/zoom.scale(), coords[1]);
			} else if(key === 38 || key === 87) { // up arrow or W
				btplanets.centerOnCoordinates(coords[0], coords[1] + 25/zoom.scale());
			} else if(key === 39 || key === 68) { // right arrow or D
				btplanets.centerOnCoordinates(coords[0] + 25/zoom.scale(), coords[1]);
			} else if(key === 40 || key === 83) { // down arrow or S
				btplanets.centerOnCoordinates(coords[0], coords[1] - 25/zoom.scale());
			} else if(key === 32 || key === 84) { // SPACE or T
				btplanets.centerOnCoordinates(0, 0);
				d3.event.stopPropagation();
				d3.event.preventDefault();
			} else if(key === 82) { // R
				btplanets.resetView();
			}
		}
	};
});
