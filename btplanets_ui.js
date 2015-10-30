'use strict';

if(!window.BTPLANETS) {
	throw 'BTPLANETS is not defined';
}

BTPLANETS.UI = {
	/**
	 * Initialize module
	 */
	init : function () {
		d3.selectAll('div.controls-tab-title').on('click', BTPLANETS.UI.onTabTitleClick);
		
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
				html += '<p>Known systems within jump range:<br>' + neighborsHtml + '</p>';
				html += '<button><span class="fa fa-remove"></span></button>';
				html += '</div>';
				return html;
			});
			
		if(panel.html() === '') {
			panel.html('<p>no planets selected</p>');
		}
		
		panel.selectAll('button')
			.on('click', function () {
				console.log(this, arguments);
			});
	}
};