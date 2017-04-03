var fs = require('fs');
var Logger = require('./Logger.js');
var LogRenderer = require('./LogRenderer.js');
var SheetsSystemsReader = require('./SheetsSystemsReader.js');

var now = new Date();
var timestamp = now.getUTCFullYear();
timestamp += now.getUTCMonth() < 9 ? '0' + (now.getUTCMonth() + 1) : (now.getUTCMonth() + 1);
timestamp += now.getUTCDate() < 10 ? '0' + now.getUTCDate() : now.getUTCDate();
timestamp += now.getUTCHours() < 10 ? '0' + now.getUTCHours() : now.getUTCHours();
timestamp += now.getUTCMinutes();

var logger = new Logger(Logger.ERROR);
var logRenderer = new LogRenderer(logger, '../temp/comparison_log.html', '../data/log.tpl.html');
var reader = new SheetsSystemsReader(logger);

logger.log('script started');

reader.on('systemsRead', function (reader, systems) {
    var sarnaTsv, sarnaArr, sarnaKeys, curSystemArr, coords;
    var sarnaMap = {};
    var googleSheetMap = {};
    var addedInGoogleSheet = [];
    var missingInGoogleSheet = [];
    var differentCoordinates = [];
    var differentAffiliations = [];
    var curSarnaObj, curGoogleSheetObj;
    var html = '';

    logger.log(systems.length + ' systems read from google sheet.');

    sarnaTsv = fs.readFileSync('../temp/planetData.tsv', {
        encoding: 'utf8'
    });
    sarnaArr = sarnaTsv.split('\n');
    sarnaArr.shift();
    for(var i = 0, len = sarnaArr.length; i < len; i++) {
        if(sarnaArr[i].trim().length === 0) {
            continue;
        }
        curSystemArr = sarnaArr[i].split('\t');
        //logger.log(curSystemArr);
        // map systems using their sarna path as key
        sarnaMap['http://www.sarna.net'+curSystemArr[0]] = {
            link : curSystemArr[0],
            name : curSystemArr[1],
            coordinates : curSystemArr[2],
            affiliation : curSystemArr[3]
        };
    }
    logger.log(Object.keys(sarnaMap).length + ' systems read from sarna.');

    // iterate over google sheet list to populate map, and to find entries that
    // do not exist in the sarna data array
    for(var i = 0, len = systems.length; i < len; i++) {
        curGoogleSheetObj = systems[i];
        googleSheetMap[systems[i].link] = curGoogleSheetObj;
        // check if this system exists in sarna data
        if(!sarnaMap.hasOwnProperty(curGoogleSheetObj.link)) {
            logger.warn(curGoogleSheetObj.name + ' does not exist in sarna data.');
            addedInGoogleSheet.push(curGoogleSheetObj.name);
        }
    }

    // iterate over sarna list to find entries that do not yet exist in the
    // google sheet, and to find entries that have different coordinates or
    // affiliations
    sarnaKeys = Object.keys(sarnaMap);
    for(var i = 0, len = sarnaKeys.length; i < len; i++) {
        curSarnaObj = sarnaMap[sarnaKeys[i]];
        curGoogleSheetObj = googleSheetMap[sarnaKeys[i]] || {};
        if(!googleSheetMap.hasOwnProperty(sarnaKeys[i])) {
            logger.warn(curSarnaObj.name + ' does not exist in google sheet.');
            missingInGoogleSheet.push(curSarnaObj.name);
            continue;
        }

        // compare coordinates
        coords = Number(curGoogleSheetObj.x).toFixed(2) + ':' + Number(curGoogleSheetObj.y).toFixed(2);
        if(coords !== curSarnaObj.coordinates) {
            logger.warn('different coordinates for ' + curSarnaObj.name + ': ' + curSarnaObj.coordinates  + ' (sarna) vs. ' + coords + ' (google sheet)');
            differentCoordinates.push([curSarnaObj.name, curSarnaObj.coordinates, coords]);
        }

        // compare affiliation
        if(curGoogleSheetObj.affiliation !== curSarnaObj.affiliation && curGoogleSheetObj.affiliation.indexOf('Clans') === -1) {
            logger.warn('different affiliations for ' + curSarnaObj.name + ': ' + curSarnaObj.affiliation + ' (sarna) vs. ' + curGoogleSheetObj.affiliation + ' (google sheet)');
            differentAffiliations.push([curSarnaObj.name, curSarnaObj.affiliation, curGoogleSheetObj.affiliation]);
        }
    }

    // assemble and render out html
    if(missingInGoogleSheet.length > 0) {
        html += '<h2>Systems that exist on Sarna, but are not in the google sheet:</h2>\n';
        html += '<table><tr><th>System name</th></tr>\n';
        for(var i = 0, len = missingInGoogleSheet.length; i < len; i++) {
            html += '<tr><td>' + missingInGoogleSheet[i] + '</td></tr>\n';
        }
        html += '</table>\n';
    }

    if(addedInGoogleSheet.length > 0) {
        html += '<h2>Systems that exist in the google sheet, but not on Sarna:</h2>\n';
        html += '<table><tr><th>System name</th></tr>\n';
        for(var i = 0, len = addedInGoogleSheet.length; i < len; i++) {
            html += '<tr><td>' + addedInGoogleSheet[i] + '</td></tr>\n';
        }
        html += '</table>\n';
    }

    if(differentCoordinates.length > 0) {
        html += '<h2>Systems whose coordinates on Sarna are different to those listed in the google sheet:</h2>\n';
        html += '<table><tr><th>System name</th><th>Sarna coordinates</th><th>Google sheet coordinates</th></tr>\n';
        for(var i = 0, len = differentCoordinates.length; i < len; i++) {
            html += '<tr><td>' + differentCoordinates[i][0] + '</td>\n';
            html += '<td class="centered">' + differentCoordinates[i][1] + '</td>\n';
            html += '<td class="centered">' + differentCoordinates[i][2] + '</td></tr>\n';
        }
        html += '</table>\n';
    }

    if(differentAffiliations.length > 0) {
        html += '<h2>Systems whose affiliation on Sarna is different to that listed in the google sheet:</h2>\n';
        html += '<table><tr><th>System name</th><th>Sarna affiliation</th><th>Google sheet affiliation</th></tr>\n';
        for(var i = 0, len = differentAffiliations.length; i < len; i++) {
            html += '<tr><td>' + differentAffiliations[i][0] + '</td>\n';
            html += '<td class="centered">' + differentAffiliations[i][1] + '</td>\n';
            html += '<td class="centered">' + differentAffiliations[i][2] + '</td></tr>\n';
        }
        html += '</table>\n';
    }

    var tpl = fs.readFileSync('../data/log_simple.tpl.html', 'utf8');
    html = tpl.replace('{LOG_CONTENT}', html);
    fs.writeFile('../temp/comparisonOutput.html', html, function(err) {
        if(err) {
            return console.log(err);
        }
        console.log('output was saved');
    });


    logRenderer.render();
});

reader.readSystems(true);
