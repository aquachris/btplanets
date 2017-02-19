'use strict';

// Array of API discovery doc URLs for APIs used by the quickstart
var DISCOVERY_DOCS = ["https://sheets.googleapis.com/$discovery/rest?version=v4"];

// Authorization scopes required by the API; multiple scopes can be
// included, separated by spaces.
var SCOPES = "https://www.googleapis.com/auth/spreadsheets.readonly";

// The range within the spreadsheet that should be requested
var RANGE = 'planets_corrected!A2:E';

// The planetary systems array to be filled
var systems = [];

/**
 * Loads up the google API client library
 */
var startup = function () {
    gapi.load('client:auth2', initClient);
};

/**
 *  Initializes the API client library and sets up sign-in state
 *  listeners.
 */
var initClient = function () {
    gapi.client.init({
        discoveryDocs: DISCOVERY_DOCS,
        clientId: CLIENT_ID,
        scope: SCOPES
    }).then(startRequest);
};

var startRequest = function (){
    gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: RANGE
    }).then(function(response) {
        var range = response.result;
        var row;
        var coords;
        var xCoord, yCoord;

        if (range.values.length <= 0) {
            alert('no data found')
            return;
        }

        // process sheet data
        console.log(range.values.length + ' records');

        for(var i = 0, len = range.values.length; i < len; i++) {
            row = range.values[i];
            coords = row[2].trim().split(':');

            xCoord = Number(coords[0]);
            yCoord = Number(coords[1]);

            systems.push({
                link : 'http://www.sarna.net' + row[0],
                name : row[1],
                x : xCoord,
                y : yCoord,
                affiliation : row[3]
            });
        }

        for(var i = 0, len = systems.length; i < len; i++) {
            findNeighbors(i);
        }

        var res = JSON.stringify(systems);
        document.getElementById('json_content').innerHTML = res;
    }, function (response) {
        alert('Error: ' + response.result.error.message);
    });
};

/**
 * Calculate the distance between two planetary systems (euclidean distance in LY)
 */
var calcDistance = function(p1, p2) {
	return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
};

/**
 * Find a planetary system's neighbor systems.
 */
var findNeighbors = function (idx) {
	var p = systems[idx];
	var neighbors = [];

	console.log('calculating neighbors for ' + p.name);
	for(var i = 0, len = systems.length; i< len; i++) {
		if(i === idx) {
			continue;
		}
		if(calcDistance(p, systems[i]) <= 30) {
			neighbors.push(i);
		}
	}
	p.neighbors = neighbors;
};

/**
 * Save as json text file.
 * Taken from
 * http://stackoverflow.com/questions/3665115/create-a-file-in-memory-for-user-to-download-not-through-server
 */
save: function(filename, data) {
    var blob = new Blob([data], {type: 'text/csv'});
    if(window.navigator.msSaveOrOpenBlob) {
        window.navigator.msSaveBlob(blob, filename);
    }
    else{
        var elem = window.document.createElement('a');
        elem.href = window.URL.createObjectURL(blob);
        elem.download = filename;
        document.body.appendChild(elem);
        elem.click();
        document.body.removeChild(elem);
    }
}

startup();
