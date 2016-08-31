window.BTPLANETS_VERSION = 201608312000;
require.config({
	urlArgs: "v=" + window.BTPLANETS_VERSION
});

require(['js/btplanets', 'js/btplanets_keys', 'js/btplanets_routes', 'js/btplanets_ui'], function (main, keys, routes, ui) {
	'use strict';

	var initialized = false;

	var init = function () {
		main.init();
		keys.init();
		routes.init();
		ui.init();
		initialized = true;
	};

	window.addEventListener('load', function () {
		!initialized &&	init();
	});

	init();
});
