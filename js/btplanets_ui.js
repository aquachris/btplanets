define(['js/lib/d3.min', 'js/lib/tinymce/tinymce.min.js', 'js/btplanets', 'js/btplanets_routes', 'js/btplanets_userdata'], function (d3, tm, btplanets, routes, userdata) {
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
			d3.select('#route-system').on('keypress', this.onRouteFindKeyPress.bind(this));
			d3.select('#route-system-btn').on('click', this.onRouteFindBtn.bind(this));
			// user data panel listeners
			d3.select('#userdata-drop-zone')
				.on('drag', this.swallowEvent)
				.on('dragstart', this.swallowEvent)
				.on('dragover', this.onUserdataDragEnter.bind(this))
				.on('dragenter', this.onUserdataDragEnter.bind(this))
				.on('dragleave', this.onUserdataDragLeave.bind(this))
				.on('dragend', this.onUserdataDragLeave.bind(this))
				.on('drop', this.onUserdataDrop.bind(this));
			d3.select('#userdata-import-file').on('change', this.onUserdataDrop.bind(this));
			// d3.select('#userdata-import-file').on('change', function () {
			// 	console.log('file changed', d3.event.target.files);
			// });

			d3.select('#userdata-save').on('click', this.onUserDataSave.bind(this));
			//d3.select('div.controls').select('.route').select('button.submit').on('click', this.onRouteSubmit);
			d3.select('div.controls').select('.route').selectAll('input[type=checkbox]').on('click', this.onRouteOptionToggle.bind(this));

			btplanets.on('selectionchanged', this, this.onSelectionChanged);
			btplanets.on('selectionadded', this, this.onSelectionAdded);
		},

		swallowEvent : function () {
			d3.event.stopPropagation();
			d3.event.preventDefault();
		},

		onUserdataDragEnter : function () {
			var e = d3.event;
			var target = e.currentTarget;
			e.stopPropagation();
			e.preventDefault();
			target.classList.add('dragover');
		},

		onUserdataDragLeave : function () {
			var e = d3.event;
			var target = e.currentTarget;
			e.stopPropagation();
			e.preventDefault();
			target.classList.remove('dragover');
		},

		onUserdataDrop : function () {
			var e = d3.event;
			var target = e.currentTarget.classList.remove('dragover');
			var files, file;

			if(e.dataTransfer && e.dataTransfer.files) {
				e.stopPropagation();
				e.preventDefault();

				files = e.dataTransfer.files;
			} else if(e.target.files) {
				files = e.target.files;
			} else {
				console.error('no files array found');
			}

			if(files.length < 1) {
				console.error('no files selected');
				return;
			}
			file = files[0];

			this.showUserdataLoadingPane();

			// read the file as text
			var reader = new FileReader();
            reader.onload = function(e2) {
				var jsonText = e2.target.result;
				var parsedObj;
				try {
					parsedObj = JSON.parse(jsonText);
					//console.log(parsedObj);
					this.hideUserdataLoadingPane();
					this.showUserdataMsgPane('parsedObj');
				} catch (e) {
					this.hideUserdataLoadingPane();
					this.showUserdataMsgPane('The uploaded file doesn\'t seem to be in the correct format.', 'error');
				}
            }.bind(this);

            reader.readAsText(file);
		},

		showUserdataLoadingPane() {
			var dropZone = d3.select('#userdata-drop-zone');
			dropZone.append('div')
				.attr('id', 'userdata-drop-zone-loading')
				.classed('userdata-loading', true);
		},

		hideUserdataLoadingPane() {
			d3.select('#userdata-drop-zone-loading').remove();
		},

		showUserdataMsgPane(msg, severity) {
			severity = severity || 'ok';
			console.log(msg);
		},

		hideUserdataMsgPane() {

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
				} else if(tabTitle.classed('userdata')) {
					type = 'userdata';
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

		onRouteFindKeyPress : function () {
				var key = d3.event.keyCode;
				if(key === 10 || key === 13) {
					this.onRouteFindBtn();
				}
		},

		onRouteFindBtn : function () {
			var field = d3.select('#route-system');
			var name = field.property('value').trim();
			var i, planet, circle;
			var err = d3.select('div.controls div.route p.error');
			if(name === '') {
				err.classed('visible', false);
				return;
			}
			try {
				i = btplanets.findPlanetId(name);
				planet = btplanets.planets[i];
				err.classed('visible', false);
				if(routes.stops.length > 0 && routes.stops[routes.stops.length - 1].name === planet.name) {
					return;
				}
				routes.addStop(planet);
				this.updateRoute();
			} catch(e) {
				i = -1;
				err.text(e)
					.classed('visible', true);
			}
			this.updateRouteUi();
			field.node().select();
		},

		updateRouteUi : function () {
			var ct = d3.select('#stops-ct');
			if(ct.classed('empty')) {
				ct.html('');
				ct.classed('empty', false);
			}
			var stopCts = ct.selectAll('div.stop-info')
				.data(routes.stops);
			stopCts.exit().remove();
			stopCts.enter().append('div');
			stopCts.attr('class', function (d) {
						return 'stop-info ' + d.affiliation.toLowerCase().replace(/\s/g, '-');
					})
					.attr('data-stop-idx', function(d, i) {
						var stopCt = d3.select(this);
						stopCt.selectAll('*').remove();
						stopCt.append('h3')
							.text(d.name)
							.attr('data-system-idx', d.index);
						stopCt.append('button')
							.classed('up', true)
							.attr('title', 'move this stop up')
							.html('<span class="fa fa-caret-up"></span>');
						stopCt.append('button')
							.classed('down', true)
							.attr('title', 'move this stop down')
							.html('<span class="fa fa-caret-down"></span>');
						stopCt.append('button')
							.classed('remove', true)
							.attr('title', 'remove this system from the route')
							.html('<span class="fa fa-remove"></span>');
						stopCt.append('span')
							.classed('coordinates', true)
							.html('Coord.: ' + d.x + ',' + d.y);
						stopCt.append('button')
							.classed('center', true)
							.attr('title', 'center map on this system')
							.html('<span class="fa fa-dot-circle-o"></span>');
						if(i > 0) {
							stopCt.append('span')
								.classed('route-stop-info', true)
								.text(d.numJumps + ' jumps');
						}
						/*stopCt.append('p')
							.classed('affilitation', true)
							.text('Political affiliation: ' + d.affiliation);*/
						return i;
					});
			if(routes.stops.length === 0) {
				ct.classed('empty', true)
					.append('em')
					.text('No stops entered');
			}
			ct.selectAll('button.center').on('click', this.onRouteSystemCenterBtn);
			ct.selectAll('button.remove').on('click', this.onRouteRemoveBtn.bind(this));
			ct.selectAll('button.up').on('click', this.onRouteUpBtn.bind(this));
			ct.selectAll('button.down').on('click', this.onRouteDownBtn.bind(this));
		},

		updateRoute : function () {
			var err = d3.select('div.controls div.route p.error');
			try {
				routes.plotRoute({
					excludeAffiliations: {
						cc: !d3.select('#route-allow-cc').property('checked'),
						dc: !d3.select('#route-allow-dc').property('checked'),
						fs: !d3.select('#route-allow-fs').property('checked'),
						fwl: !d3.select('#route-allow-fwl').property('checked'),
						lc: !d3.select('#route-allow-lc').property('checked'),
						p: !d3.select('#route-allow-per').property('checked'),
						o: !d3.select('#route-allow-other').property('checked')
					},
					includeUninhabited: d3.select('#route-allow-uninhabited').property('checked')
				});
			} catch(e) {
				err.text(e).classed('visible', true);
			}
		},

		onRouteSystemCenterBtn : function () {
			var coordinates = this.previousSibling.textContent;
			var coords = coordinates.substring(8).split(',');
			btplanets.centerOnCoordinates(parseFloat(coords[0]), parseFloat(coords[1]));
		},

		onRouteRemoveBtn : function () {
			var target = d3.event.target;
			while(target.tagName.toLowerCase() !== 'div') {
				target = target.parentNode;
			}
			var index = parseInt(target.getAttribute('data-stop-idx'), 10);
			routes.removeStop(index);
			this.updateRoute();
			this.updateRouteUi();
		},

		onRouteUpBtn : function () {
			var target = d3.event.target;
			while(target.tagName.toLowerCase() !== 'div') {
				target = target.parentNode;
			}
			var index = parseInt(target.getAttribute('data-stop-idx'), 10);
			try {
				routes.moveStop(index, index - 1);
			} catch(e) {
				//console.warn(e);
			}
			this.updateRoute();
			this.updateRouteUi();
		},

		onRouteDownBtn : function () {
			var target = d3.event.target;
			while(target.tagName.toLowerCase() !== 'div') {
				target = target.parentNode;
			}
			var index = parseInt(target.getAttribute('data-stop-idx'), 10);
			try {
				routes.moveStop(index, index + 1);
			} catch(e) {
				console.warn(e);
			}
			this.updateRoute();
			this.updateRouteUi();
		},

		onRouteOptionToggle : function () {
			var target = d3.event.target;
			if(target.id === 'route-display') {
				var checked = d3.select(target).property('checked');
				d3.select('svg.map')
					.classed('route-hidden', !checked)
					.classed('route-visible', checked);
				return;
			}
			this.updateRoute();
			this.updateRouteUi();
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
				tabs.classed('active', false);
			} else if(selection.length > 0) {// && !controls.classed('expanded')) {
				controlsBg.classed('expanded', true);
				controls.classed('expanded', true);
				controls.selectAll('div').classed('active', false);
				controls.select('div.selection').classed('active', true);
				tabs.classed('expanded', true);
				tabs.classed('active', false);
				selTab.classed('active', true);

				this.initUserDataRTEs();
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
			var coordinateCt, coords;
			var ps = this.parentNode.getElementsByTagName('p');
			for(var i = 0, len = ps.length; i < len; i++) {
				// if(ps[i].classList.contains('coordinates') {
				if(ps[i].getAttribute('class') === 'coordinates') {
					coordinateCt = ps[i];
					break;
				}
			}
			coords = coordinateCt.textContent.substring(8).split(',');
			btplanets.centerOnCoordinates(parseFloat(coords[0]), parseFloat(coords[1]));
		},

		/**
		 * React to the "start new route from this system" button being clicked.
		 */
		onSelectionNewRouteBtn : function () {
			routes.clear();
			this.onSelectionAppendToRouteBtn();
		},

 		/**
		 * React to the "append this system to the current route" button being clicked.
		 */
		onSelectionAppendToRouteBtn : function () {
			var name, i, planet, err;
			var el = d3.event.target.parentNode;
			while(el.tagName.toLowerCase() !== 'div') {
				el = el.parentNode;
			}
			el = el.firstChild;
			name = el.textContent;
			err = d3.select('div.controls div.route p.error');
			if(name === '') {
				err.classed('visible', false);
				return;
			}
			try {
				i = btplanets.findPlanetId(name);
				planet = btplanets.planets[i];
				err.classed('visible', false);
				if(routes.stops.length > 0 && routes.stops[routes.stops.length - 1].name === planet.name) {
					return;
				}
				routes.addStop(planet);
				this.updateRoute();
			} catch(e) {
				i = -1;
				err.text(e).classed('visible', true);
			}
			this.updateRouteUi();
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
				case 'settings_periphery_states':
					svg.classed('periphery-states', d3.select(this).property('checked'));
					break;
				case 'settings_borders_hatch':
					svg.classed('borders-hatch', true);
					svg.classed('borders-sigils', false);
					svg.classed('borders-fill', false);
					break;
				case 'settings_borders_sigils':
					svg.classed('borders-hatch', false);
					svg.classed('borders-sigils', true);
					svg.classed('borders-fill', false);
					break;
				case 'settings_borders_fill':
					svg.classed('borders-hatch', false);
					svg.classed('borders-sigils', false);
					svg.classed('borders-fill', true);
					break;
				case 'settings_borders_nofill':
					svg.classed('borders-hatch', false);
					svg.classed('borders-sigils', false);
					svg.classed('borders-fill', false);
					break;
				case 'settings_state_labels_all':
					svg.classed('labels-successor-states', false);
					svg.classed('labels-major-powers', false);
					svg.classed('labels-all', true);
					break;
				case 'settings_state_labels_maj':
					svg.classed('labels-successor-states', false);
					svg.classed('labels-major-powers', true);
					svg.classed('labels-all', false);
					break;
				case 'settings_state_labels_succ':
					svg.classed('labels-successor-states', true);
					svg.classed('labels-major-powers', false);
					svg.classed('labels-all', false);
					break;
				case 'settings_state_labels_none':
					svg.classed('labels-successor-states', false);
					svg.classed('labels-major-powers', false);
					svg.classed('labels-all', false);
					break;
				case 'settings_planets_none':
					svg.classed('planets-hidden', true);
					svg.classed('planets-capitals', false);
					svg.classed('planets-inhabited', false);
					svg.classed('planets-all', false);
					svg.classed('planets-all-hidden', false);
					break;
				case 'settings_planets_capitals':
					svg.classed('planets-hidden', false);
					svg.classed('planets-capitals', true);
					svg.classed('planets-inhabited', false);
					svg.classed('planets-all', false);
					svg.classed('planets-all-hidden', false);
					break;
				case 'settings_planets_inhabited':
					svg.classed('planets-hidden', false);
					svg.classed('planets-capitals', false);
					svg.classed('planets-inhabited', true);
					svg.classed('planets-all', false);
					svg.classed('planets-all-hidden', false);
					break;
				case 'settings_planets_all':
					svg.classed('planets-hidden', false);
					svg.classed('planets-capitals', false);
					svg.classed('planets-inhabited', false);
					svg.classed('planets-all', true);
					svg.classed('planets-all-hidden', false);
					break;
				case 'settings_planets_all_hidden':
					svg.classed('planets-hidden', false);
					svg.classed('planets-capitals', false);
					svg.classed('planets-inhabited', false);
					svg.classed('planets-all', false);
					svg.classed('planets-all-hidden', true);
					break;
				case 'settings_clan_systems':
					svg.classed('planets-clans', d3.select(this).property('checked'));
					break;
				case 'settings_userdata_show':
					svg.classed('planets-userdata-visible', true);
					svg.classed('planets-userdata-highlight', false);
					svg.classed('planets-userdata-hidden', false);
					break;
				case 'settings_userdata_highlight':
					svg.classed('planets-userdata-visible', false);
					svg.classed('planets-userdata-highlight', true);
					svg.classed('planets-userdata-hidden', false);
					break;
				case 'settings_userdata_hidden':
					svg.classed('planets-userdata-visible', false);
					svg.classed('planets-userdata-highlight', false);
					svg.classed('planets-userdata-hidden', true);
					break;
			}
		},

		onUserDataSave : function () {
			userdata.exportToTextFile();
		},

		initUserDataRTEs : function () {
			var self = this;
			this.removeUserDataRTEs();

			// register listeners on userdata divs
			var divs = d3.selectAll('div.userdata-rte');

			divs.on('click', function () {
				var e = d3.event;
				var target = e.currentTarget;
				var id = target.getAttribute('id');

				if(target.classList.contains('mce-content-body')) {
					return;
				}

				// destroy all existing tinymce instances
				tinymce.remove();

				tinymce.init({
				 	selector: '#' + id,
				 	inline: true,
				 	//insert_toolbar: 'quicktable',
				 	plugins : [
				 		'advlist autolink lists link image charmap anchor',
				 		'searchreplace fullscreen table textpattern',
				 		'insertdatetime media contextmenu paste'
				 	],
				 	menubar: false,
				 	toolbar: 'bold italic | bullist numlist | quicklink blockquote',
				 	init_instance_callback: function (editor) {
						tinymce.get(id).focus();
						editor.on('blur', function (e) {
							self.onUserDataRTEChange();
							tinymce.remove();
						});
						editor.on('change', self.onUserDataRTEChange.bind(self));
						editor.on('paste', self.onUserDataRTEChange.bind(self));
						editor.on('keyup', self.onUserDataRTEChange.bind(self));
				 	}
				});
			});
		},

		removeUserDataRTEs : function () {
			tinymce.remove();
		},

		onUserDataRTEChange : function () {
			var editor = tinymce.activeEditor;
			var i, planet, name, circle;

			i = editor.targetElm.getAttribute('data-system-idx');
			planet = btplanets.planets[i];
			if(editor.targetElm.innerText.trim().length > 0) {
				planet.userData = tinymce.activeEditor.getContent();
				btplanets.updateUserDataHighlight(i, planet);
			} else {
				planet.userData = '';
				btplanets.updateUserDataHighlight(i, planet);
			}
			userdata.scheduleUserDataSave(planet);
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
					var userdata = '';
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
					switch(d.affiliation.toLowerCase()) {
						case 'capellan confederation':
							affiliationClass = 'liao';
							break;
						case 'draconis combine':
							affiliationClass = 'kurita';
							break;
						case 'federated suns':
							affiliationClass = 'davion';
							break;
						case 'free worlds league':
							affiliationClass = 'marik';
							break;
						case 'lyran commonwealth':
							affiliationClass = 'steiner';
							break;
						case 'comstar':
							affiliationClass = 'comstar';
							break;
						case 'taurian concordat':
							affiliationClass = 'taurian-concordat';
							break;
						case 'magistracy of canopus':
							affiliationClass = 'magistracy-of-canopus';
							break;
						case 'marian hegemony':
							affiliationClass = 'marian-hegemony';
							break;
						case 'oberon confederation':
							affiliationClass = 'oberon-confederation';
							break;
						case 'outworlds alliance':
							affiliationClass = 'outworlds-alliance';
							break;
						default :
							affiliationClass = 'other';
					}
					userdata = d.userData || '<p><br data-placeholder="1"></p>';
					if(idx > 0) {
						html += '<hr/>';
					}
					html += '<div class="planet-info '+affiliationClass+'">';
					html += '<h3>'+d.name+'</h3>';
					html += '<button class="remove" title="remove from selection"><span class="fa fa-remove"></span></button>';
					html += '<button class="center" title="center map on this system"><span class="fa fa-dot-circle-o"></span></button>';
					html += '<button class="start-route" title="start a new route from this system"><span class="fa fa-level-down fa-rotate-270"></span></button>';
					html += '<button class="append-route" title="add this system to the current route"><span class="fa fa-plus"></span></button>';
					html += '<p class="wiki-link"><a href="'+d.link+'" target="_blank">BattleTechWiki page</a></p>';
					html += '<p class="coordinates"><span>Coord.: '+d.x+', '+d.y+'</span></p>';
					html += '<p>Political affiliation: '+d.affiliation+'</p>';
					html += '<p>Known systems within jump range:<br>' + neighborsHtml + '</p>';
					html += '<p>User defined system info (click to edit):</p>';
					html += '<div class="userdata-rte" id="rte-'+d.index+'" data-system-idx="'+d.index+'" data-system-name="'+d.name+'">'+userdata+'</div>';
					html += '</div>';
					return html;
				});

			if(ct.html() === '') {
				ct.html('<em>No planets selected</em>');
			}

			this.adjustToSelectionChange(selection);

			ct.selectAll('button.remove').on('click', this.onSelectionRemoveBtn);
			ct.selectAll('button.center').on('click', this.onSelectionCenterBtn);
			ct.selectAll('button.start-route').on('click', this.onSelectionNewRouteBtn.bind(this));
			ct.selectAll('button.append-route').on('click', this.onSelectionAppendToRouteBtn.bind(this));
		}
	};
});
