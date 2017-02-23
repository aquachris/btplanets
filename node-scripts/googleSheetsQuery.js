module.exports = (function () {
    'use strict';

    var google = require('googleapis');

    var GoogleSheetsQuery = function () {
        this.systems = [];
    };

    /**
     * Calculate the distance between two planetary systems (euclidean distance in LY)
     */
    GoogleSheetsQuery.prototype.calcDistance = function(p1, p2) {
    	return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    };

    /**
     * Find all planetary systems' neighbor systems.
     */
    GoogleSheetsQuery.prototype.findNeighbors = function () {
        var p;
    	var neighbors;

        for(var idx = 0, len = this.systems.length; idx < len; idx++) {
            p = this.systems[idx];
            neighbors = [];
        	for(var nIdx = 0, nLen = this.systems.length; nIdx < nLen; nIdx++) {
        		if(nIdx === idx) {
        			continue;
        		}
        		if(this.calcDistance(p, this.systems[nIdx]) <= 30) {
        			neighbors.push(nIdx);
        		}
        	}
            p.neighbors = neighbors;
            //console.log(p.name + ' has ' + neighbors.length + ' neighbors');
        }
    };

    GoogleSheetsQuery.prototype.readSystems = function (auth) {
        var sheets = google.sheets('v4');
        sheets.spreadsheets.values.get({
            auth: auth,
            spreadsheetId: '1XuAjWs9jUKuieb8qNyQLTu4Y6bZBLoxaAy-yWpohLuQ',
            range: 'planets_corrected!A2:E'
        }, function (err, range) {
            var row;
            var coords;
            var xCoord, yCoord;

            if(err) {
                console.log('The API returned an error: ' + err);
                return;
            }
            if (range.values.length <= 0) {
                alert('no data found')
                return;
            }

            // process sheet data
            for(var i = 0, len = range.values.length; i < len; i++) {
                row = range.values[i];
                coords = row[2].trim().split(':');

                xCoord = Number(coords[0]);
                yCoord = Number(coords[1]);
                if(isNaN(xCoord) || isNaN(yCoord)) {
                    console.warn(row[1] + ' has corrupt coordinates: ' + xCoord + ', ' + yCoord);
                }

                this.systems.push({
                    link : 'http://www.sarna.net' + row[0],
                    name : row[1],
                    x : xCoord,
                    y : yCoord,
                    affiliation : row[3]
                });
            }

            this.findNeighbors();

            var res = JSON.stringify(this.systems);
            console.log(this.systems.length);
        }.bind(this));
    };

    return GoogleSheetsQuery;
})();
