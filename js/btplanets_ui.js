define(['js/lib/d3.min', 'js/btplanets', 'js/btplanets_routes'], function (d3, btplanets, routes) {
	'use strict';

	return {
		/**
		 * Initialize module
		 */
		init : function () {
			// register listeners
			d3.select('div.controls').on('keydown', function () {
				d3.event.stopPropagation();
			});
			d3.selectAll('div.controls-tab-title').on('click', this.onTabTitleClick);
			// settings panel listeners
			d3.select('div.controls').select('.settings').selectAll('input[type=checkbox]').on('click', this.onSettingOptionToggle);
			d3.select('div.controls').select('.settings').selectAll('input[type=radio]').on('click', this.onSettingOptionToggle);
			// find panel listeners
			d3.select('#find-system-field').on('keypress', this.onFindKeyPress.bind(this));
			d3.select('#find-system-btn').on('click', this.onFindSystemBtn.bind(this));
			// route panel listeners
			d3.select('div.controls').select('.route').select('button.submit').on('click', this.onRouteSubmit);
			//d3.select('div.controls').select('.route').selectAll('input[type=checkbox]').on('click', this.onRouteOptionToggle);

			btplanets.on('selectionchanged', this, this.onSelectionChanged);
			btplanets.on('selectionadded', this, this.onSelectionAdded);
		},

		/**
		 * React to tab title being clicked
		 */
		onTabTitleClick : function () {
			var tabTitle = d3.select(this);
			var tabs = d3.selectAll('div.controls-tab-title');
			var controlsBg = d3.select('div.controls-background');
			var controls = d3.select('div.controls');
			var type = '';

			// if active tab title is clicked, hide the whole thing
			if(tabTitle.classed('active')) {
				tabTitle.classed('active', false);
				tabs.classed('expanded', false);
				controlsBg.classed('expanded', false);
				controls.classed('expanded', false);
			} else {
				if(tabTitle.classed('settings')) {
					type = 'settings';
				} else if(tabTitle.classed('find')) {
					type = 'find';
				} else if(tabTitle.classed('selection')) {
					type = 'selection';
				} else if(tabTitle.classed('route')) {
					type = 'route';
				}
				controlsBg.classed('expanded', true);
				controls.selectAll('div').classed('active', false);
				if(type) {
					controls.select('div.'+type)
						.classed('active', true);
				}

				tabs.classed('active', false);
				tabs.classed('expanded', true);
				controls.classed('expanded', true);
				tabTitle.classed('active', true);
			}
		},

		onFindKeyPress : function () {
			var key = d3.event.keyCode;
			if(key === 10 || key === 13) {
				this.onFindSystemBtn();
			}
		},

		onFindSystemBtn : function () {
			var field = d3.select('#find-system-field');
			var name = field.property('value').trim();
			var i, planet, circle;
			var err = d3.select('div.controls div.selection p.error');
			if(name === '') {
				err.classed('visible', false);
				return;
			}
			try {
				i = btplanets.findPlanetId(name);
				planet = btplanets.planets[i];
				btplanets.centerOnCoordinates(planet.x, planet.y);
				circle = d3.select('circle[name="'+planet.name+'"]');
				if(!circle.classed('selected')) {
					btplanets.togglePlanetSelection(planet.name);
				}
				err.classed('visible', false);
			} catch(e) {
				i = -1;
				err.text(e)
					.classed('visible', true);
			}
		},

		/**
		 * @param selection {Array}
		 * @param autoClose {boolean}
		 */
		adjustToSelectionChange : function (selection, autoClose) {
			var tabs = d3.selectAll('div.controls-tab-title');
			var selTab = d3.select('div.controls-tab-title.selection');
			var controlsBg = d3.select('div.controls-background');
			var controls = d3.select('div.controls');

			if(!selection) {
				return;
			}
			if(selection.length === 0 && autoClose) {
				controlsBg.classed('expanded', false);
				controls.classed('expanded', false);
				tabs.classed('expanded', false);
				tabs.classed('active', false)
			} else if(selection.length > 0) {
				controlsBg.classed('expanded', true);
				controls.classed('expanded', true);
				controls.selectAll('div').classed('active', false);
				controls.select('div.selection').classed('active', true);
				tabs.classed('expanded', true);
				tabs.classed('active', false);
				selTab.classed('active', true);
			}
		},

		/**
		 *
		 */
		onSelectionAdded : function () {
			/*if(!d3.select('div.controls-expander').classed('expanded')) {
				this.onExpanderClick();
			}*/
		},

		/**
		 * React to the remove button for a selected system (in the selection panel)
		 * being clicked.
		 */
		onSelectionRemoveBtn : function () {
			var name = this.parentNode.firstChild.textContent;
			btplanets.togglePlanetSelection(name);
		},

		/**
		 * React to the center button for a selected system (in the selection panel)
		 * being clicked.
		 */
		onSelectionCenterBtn : function () {
			var coordinates = this.parentNode.firstChild.textContent;
			var coords = coordinates.substring(8).split(',');
			console.log(coords);
			btplanets.centerOnCoordinates(parseFloat(coords[0]), parseFloat(coords[1]));
		},

		/**
		 * React to a settings option being changed
		 */
		onSettingOptionToggle : function () {
			var curVisibility;
			var svg = d3.select('svg');
			switch(this.id) {
				case 'settings_borders':
					svg.classed('borders-lines', d3.select(this).property('checked'));
					break;
				case 'settings_borders_hatch':
					svg.classed('borders-hatch', true);
					svg.classed('borders-fill', false);
					break;
				case 'settings_borders_fill':
					svg.classed('borders-hatch', false);
					svg.classed('borders-fill', true);
					break;
				case 'settings_borders_nofill':
					svg.classed('borders-hatch', false);
					svg.classed('borders-fill', false);
					break;
				case 'settings_planets_none':
					svg.classed('planets-hidden', true);
					svg.classed('planets-capitals', false);
					svg.classed('planets-inhabited', false);
					svg.classed('planets-all', false);
					break;
				case 'settings_planets_capitals':
					svg.classed('planets-hidden', false);
					svg.classed('planets-capitals', true);
					svg.classed('planets-inhabited', false);
					svg.classed('planets-all', false);
					break;
				case 'settings_planets_inhabited':
					svg.classed('planets-hidden', false);
					svg.classed('planets-capitals', false);
					svg.classed('planets-inhabited', true);
					svg.classed('planets-all', false);
					break;
				case 'settings_planets_all':
					svg.classed('planets-hidden', false);
					svg.classed('planets-capitals', false);
					svg.classed('planets-inhabited', false);
					svg.classed('planets-all', true);
					break;
				case 'settings_clan_systems':
					svg.classed('planets-clans', d3.select(this).property('checked'));
					break;
			}
		},

		/**
		 * React to the selection changing by re-assembling the selection panel
		 */
		onSelectionChanged : function(selection) {
			var ct = d3.select('div.controls').select('#selection-ct').html('');

			ct.selectAll('div')
					.data(selection)
				.enter()
				.append('div')
				.html(function (d, idx) {
					var html = '';
					var affiliationClass = '';
					var neighborsHtml = '', neighbor, neighborCls, neighborTitle;
					for(var i = 0, len = d.neighbors.length; i < len; i++) {
						neighbor = btplanets.planets[d.neighbors[i]];
						neighborCls = 'neighbor';
						neighborTitle = '';
						if(neighbor.affiliation === '?' || neighbor.affiliation.toLowerCase() === 'no record') {
							neighborCls += ' uninhabited';
							neighborTitle = 'title="uninhabited"';
						}
						if(i > 0) {
							neighborsHtml += ', ';
						}
						neighborsHtml += '<span class="'+neighborCls+'" '+neighborTitle+'>'+neighbor.name+'</span>';
					}
					if(!neighborsHtml) {
						neighborsHtml = 'none';
					}
					switch(d.affiliation) {
						case 'Capellan Confederation':
							affiliationClass = 'liao';
							break;
						case 'Draconis Combine':
							affiliationClass = 'kurita';
							break;
						case 'Federated Suns':
							affiliationClass = 'davion';
							break;
						case 'Free Worlds League':
							affiliationClass = 'marik';
							break;
						case 'Lyran Commonwealth':
							affiliationClass = 'steiner';
							break;
						case 'ComStar':
							affiliationClass = 'comstar';
							break;
						default :
							affiliationClass = 'other';
					}
					if(idx > 0) {
						html += '<hr/>';
					}
					html += '<div class="planet-info '+affiliationClass+'">';
					html += '<h3>'+d.name+'</h3>';
					html += '<button class="remove"><span class="fa fa-remove"></span></button>';
					html += '<p><a href="'+d.link+'" target="_blank">BattleTechWiki page</a></p>';
					html += '<p><span>Coord.: '+d.x+', '+d.y+'</span>';
					html += '<button class="center" title="center map on these coordinates"><span class="fa fa-dot-circle-o"></span></button></p>';
					html += '<p>Political affiliation: '+d.affiliation+'</p>';
					html += '<p>Known systems within jump range:<br>' + neighborsHtml + '</p>';
					html += '</div>';
					return html;
				});

			if(ct.html() === '') {
				ct.html('<em>No planets selected</em>');
			}

			this.adjustToSelectionChange(selection);

			ct.selectAll('button.remove').on('click', this.onSelectionRemoveBtn);
			ct.selectAll('button.center').on('click', this.onSelectionCenterBtn);
		},

		/**
		 * React to the route submit button being pressed
		 */
		onRouteSubmit : function () {
			var from = d3.select('div.controls').select('.route')
					.select('input[name="fromSystem"]').property('value');
			var to = d3.select('div.controls').select('.route')
					.select('input[name="toSystem"]').property('value');
			var fromIdx, toIdx;
			var errP = d3.select('div.controls').select('div.route').select('p.error');
			var exAff = {};

			var routeSettings = d3.select('div.controls').select('div.route');
			exAff.cc = !routeSettings.select('#route_allow_cc').property('checked');
			exAff.dc = !routeSettings.select('#route_allow_dc').property('checked');
			exAff.fs = !routeSettings.select('#route_allow_fs').property('checked');
			exAff.fwl = !routeSettings.select('#route_allow_fwl').property('checked');
			exAff.lc = !routeSettings.select('#route_allow_lc').property('checked');
			exAff.p = !routeSettings.select('#route_allow_per').property('checked');
			exAff.o = !routeSettings.select('#route_allow_other').property('checked');

			try {
				if(!from.trim()) {
					throw 'No starting system specified';
				}
				if(!to.trim()) {
					throw 'No target system specified';
				}
				fromIdx = btplanets.findPlanetId(from);
				toIdx = btplanets.findPlanetId(to);
				errP.classed('visible', false);
				routes.plotRoute({
					fromIdx : fromIdx,
					toIdx : toIdx,
					excludeAffiliations : exAff
				});
			} catch(e) {
				console.log(e, d3.select('div.controls').select('div.route'));
				errP.classed('visible', true).html(e);
			}
		}
	};
});
