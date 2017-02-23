'use strict';

var GoogleSheetsAuth = require('./googleSheetsAuth.js');
var GoogleSheetsQuery = require('./googleSheetsQuery.js');


var sheetsAuth = new GoogleSheetsAuth('inner-sphere-map-sheet-reader',
    ['https://www.googleapis.com/auth/spreadsheets.readonly']);
var query = new GoogleSheetsQuery();

sheetsAuth.loadCredentialsAndAuthorize(query.readSystems, query);
