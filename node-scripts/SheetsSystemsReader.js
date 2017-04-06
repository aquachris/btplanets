module.exports = (function () {
    'use strict';

    var google = require('googleapis');
    var SheetsAuthInstance = require('./SheetsAuthInstance.js');
    var Observable = require('./Observable.js');

    /**
     * An instance of this class reads the planetary systems list from the google sheet
     * and creates an array of system objects.
     *
     * @fires systemsRead When the systems list has been read
     */
    var SheetsSystemsReader = function (logger) {
        this.parent.call(this);
        this.logger = logger || console;
        this.skipNeighborSearch = false;
        this.includeEmptySystems = false;
        this.systems = [];
        this.sheetsAuth = new SheetsAuthInstance('inner-sphere-map-sheet-reader',
            ['https://www.googleapis.com/auth/spreadsheets.readonly']);

        this.addEventTopics('systemsRead');

        this.sheetsAuth.on('authObjectReady', this.onAuthReady, this);
    };

    SheetsSystemsReader.prototype = Object.create(Observable.prototype);
    SheetsSystemsReader.prototype.constructor = SheetsSystemsReader;
    SheetsSystemsReader.prototype.parent = Observable;

    /**
     * Initiates the data loading
     */
    SheetsSystemsReader.prototype.readSystems = function (skipNeighborSearch, includeEmptySystems) {
        this.skipNeighborSearch = !!skipNeighborSearch;
        this.includeEmptySystems = !!includeEmptySystems;
        this.sheetsAuth.loadCredentialsAndAuthorize();
    };

    /**
     * @private
     */
    SheetsSystemsReader.prototype.onAuthReady = function (sheetsAuth, oAuth2Client) {
        var sheets = google.sheets('v4');

        sheets.spreadsheets.values.get({
            auth: oAuth2Client,
            spreadsheetId: '1XuAjWs9jUKuieb8qNyQLTu4Y6bZBLoxaAy-yWpohLuQ',
            range: 'planets_corrected!A2:E'
        }, function (err, range) {
            var sarnaLink;
            var row;
            var coords;
            var aliases;
            var xCoord, yCoord;

            if(err) {
                this.logger.error('The API returned an error: ' + err);
                return;
            }
            if (range.values.length <= 0) {
                this.logger.warn('no data found');
                return;
            }

            // process sheet data
            for(var i = 0, len = range.values.length; i < len; i++) {
                row = range.values[i];
                coords = row[2].trim().split(':');
                aliases = (row[4] || '').split(',');

                if(row[0].trim().length === 0) {
                    console.warn(row[1] + ' does not list a sarna page');
                    sarnaLink = '';
                } else {
                    sarnaLink = 'http://www.sarna.net' + row[0];
                }

                if(coords.length < 2) {
                    xCoord = NaN;
                    yCoord = NaN;
                } else {
                    xCoord = Number(coords[0]);
                    yCoord = Number(coords[1]);
                }
                if( (isNaN(xCoord) || isNaN(yCoord)) && !this.includeEmptySystems ) {
                    this.logger.error(row[1] + ' has corrupt coordinates: ' + xCoord + ', ' + yCoord + '. System will be ignored.');
                    continue;
                }

                for(var j = 0, jlen = aliases.length; j < jlen; j++) {
                    aliases[j] = aliases[j].trim();
                }
                if(aliases.length === 1 && aliases[0] === '') {
                    aliases = [];
                }

                this.systems.push({
                    link : sarnaLink,
                    name : row[1],
                    x : xCoord,
                    y : yCoord,
                    affiliation : row[3],
                    aliases : aliases
                });
            }

            if(!this.skipNeighborSearch) {
                this.findNeighbors();
            }

            //var res = JSON.stringify(this.systems);
            this.fireEvent('systemsRead', [this, this.systems]);
        }.bind(this));
    };

    /**
     * Calculate the distance between two planetary systems (euclidean distance in LY)
     * @private
     */
    SheetsSystemsReader.prototype.calcDistance = function(p1, p2) {
    	return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    };

    /**
     * Find all planetary systems' neighbor systems.
     * @private
     */
    SheetsSystemsReader.prototype.findNeighbors = function () {
        var p;
    	var neighbors;
        var dist;

        for(var idx = 0, len = this.systems.length; idx < len; idx++) {
            p = this.systems[idx];
            neighbors = [];
        	for(var nIdx = 0, nLen = this.systems.length; nIdx < nLen; nIdx++) {
        		if(nIdx === idx) {
        			continue;
        		}
                dist = this.calcDistance(p, this.systems[nIdx]);
                if(dist === 0 && p.name < this.systems[nIdx].name) {
                    this.logger.warn('Identical coordinates for '+p.name+' and '+this.systems[nIdx].name+'.');
                } else if(dist <= 1 && p.name < this.systems[nIdx].name) {
                    this.logger.warn('Very similar coordinates for ' + p.name + ' and ' + this.systems[nIdx].name + ': Distance is ' + dist +' LY.');
                }
        		if(dist <= 30) {
        			neighbors.push(nIdx);
        		}
        	}
            p.neighbors = neighbors;
            //this.logger.log(p.name + ' has ' + neighbors.length + ' neighbors');
        }
    };

    return SheetsSystemsReader;
})();
