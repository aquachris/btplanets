'use strict';

if(!window.BTPLANETS) {
	throw 'BTPLANETS is not defined';
}

BTPLANETS.UI = {
	/**
	 * Initialize module
	 */
	init : function () {
		// register listeners
		d3.select('div.controls').on('keydown', function () { d3.event.stopPropagation(); });
		d3.selectAll('div.controls-tab-title').on('click', BTPLANETS.UI.onTabTitleClick);
		// settings panel listeners
		d3.select('div.controls').select('.settings').selectAll('input[type=checkbox]').on('click', this.onSettingOptionToggle);
		// route panel listeners
		d3.select('div.controls').select('.route').select('button.submit').on('click', this.onRouteSubmit);
		//d3.select('div.controls').select('.route').selectAll('input[type=checkbox]').on('click', this.onRouteOptionToggle);
		
		BTPLANETS.on('selectionchanged', this, this.onSelectionChanged);
		BTPLANETS.on('selectionadded', this, this.onSelectionAdded);
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
	
	onSelectionAdded : function () {
		/*if(!d3.select('div.controls-expander').classed('expanded')) {
			this.onExpanderClick();
		}*/
	},
	
	/** 
	 * React to a settings option being changed
	 */
	onSettingOptionToggle : function () {
		var curVisibility;
		switch(this.id) {
			case 'settings_clan_systems':
				curVisibility = d3.select('.planet.clan').classed('visible');
				d3.selectAll('.planet.clan').classed('visible', !curVisibility);
				d3.selectAll('.planet-name.clan').classed('visible', !curVisibility);
				break;
			case 'settings_uninhabited_systems':
				curVisibility = d3.select('.planet.uncharted').classed('visible');
				d3.selectAll('.planet.uncharted').classed('visible', !curVisibility);
				d3.selectAll('.planet-name.uncharted').classed('visible', !curVisibility);
				break;
		}
	},
	
	/** 
	 * React to the selection changing by re-assembling the selection panel
	 */
	onSelectionChanged : function(selection) {
		var panel = d3.select('div.controls').select('div.selection').html('');
		
		panel.selectAll('div')
				.data(selection)
			.enter()
			.append('div')
			.html(function (d, idx) {
				var html = '';
				var affiliationClass = '';
				var neighborsHtml = '', neighbor, neighborCls, neighborTitle;
				for(var i = 0, len = d.neighbors.length; i < len; i++) {
					neighbor = BTPLANETS.planets[d.neighbors[i]];
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
				html += '<p><a href="'+d.link+'" target="_blank">BattleTechWiki page</a></p>';
				html += '<p>Coord.: '+d.x+', '+d.y+'</p>';
				html += '<p>Political affiliation: '+d.affiliation+'</p>';
				html += '<p>Known systems within jump range:<br>' + neighborsHtml + '</p>';
				html += '<button><span class="fa fa-remove"></span></button>';
				html += '</div>';
				return html;
			});
			
		if(panel.html() === '') {
			panel.html('<h2>No planets selected</h2>');
		}
		
		panel.selectAll('button')
			.on('click', function () {
				console.log(this, arguments);
			});
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
			fromIdx = BTPLANETS.findPlanetId(from);
			toIdx = BTPLANETS.findPlanetId(to);
			errP.classed('visible', false);
			BTPLANETS.ROUTES.plotRoute({
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