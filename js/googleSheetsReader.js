'use strict';

// Array of API discovery doc URLs for APIs used by the quickstart
var DISCOVERY_DOCS = ["https://sheets.googleapis.com/$discovery/rest?version=v4"];

// Authorization scopes required by the API; multiple scopes can be
// included, separated by spaces.
var SCOPES = "https://www.googleapis.com/auth/spreadsheets.readonly";

// The range within the spreadsheet that should be requested
var RANGE = 'planets_corrected!A2:E';

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

        if (range.values.length <= 0) {
            alert('no data found')
            return;
        }

        // process sheet data
        console.log(range.values.length + ' records');
          /*appendPre('Name, Coordinates');
          for (i = 0; i < range.values.length; i++) {
            var row = range.values[i];
            // Print columns A and E, which correspond to indices 0 and 4.
            appendPre(row[1] + ', ' + row[2]);
        }*/

    }, function (response) {
        alert('Error: ' + response.result.error.message);
    });
};

startup();
