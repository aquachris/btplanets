require(['js/btplanets', 'js/btplanets_keys', 'js/btplanets_routes', 'js/btplanets_ui'], function (main, keys, routes, ui) {
	'use strict';

	window.addEventListener('load', function () {
		main.init();
		keys.init();
		routes.init();
		ui.init();
	});
});
