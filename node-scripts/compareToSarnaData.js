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
    var sarnaTsv, sarnaArr, sarnaKeys, curSystemArr;
    var coordArr, coordStr, coordStr2, coordDiff;
    var recomCls, recomMsg;
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
        coordArr = (curSystemArr[2] + '').split(':');
        if(coordArr.length < 2) {
            coordArr = [NaN, NaN];
        } else {
            coordArr[0] = Number.parseFloat(coordArr[0]);
            coordArr[1] = Number.parseFloat(coordArr[1]);
        }
        sarnaMap['http://www.sarna.net'+curSystemArr[0]] = {
            link : curSystemArr[0],
            name : curSystemArr[1],
            x : coordArr[0],
            y : coordArr[1],
            affiliation : (curSystemArr[3] + '').trim()
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
            addedInGoogleSheet.push(curGoogleSheetObj);
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
            missingInGoogleSheet.push(curSarnaObj);
            continue;
        }

        // compare coordinates
        if(curGoogleSheetObj.x !== curSarnaObj.x || curGoogleSheetObj.y !== curSarnaObj.y) {
            logger.warn('different coordinates for ' + curSarnaObj.name + ': '
                            + curSarnaObj.x + ':' + curSarnaObj.y + ' (sarna) vs. '
                            + curGoogleSheetObj.x + ':' + curGoogleSheetObj.y + ' (google sheet)');
            differentCoordinates.push([curSarnaObj.name, [curSarnaObj.x, curSarnaObj.y], [curGoogleSheetObj.x, curGoogleSheetObj.y]]);
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
        html += '<table><tr><th>System name</th><th>Coordinates parsed from Sarna</th><th>Affiliation parsed from Sarna</th><th>Script\'s recommendation</th></tr>\n';
        for(var i = 0, len = missingInGoogleSheet.length; i < len; i++) {
            if(isNaN(missingInGoogleSheet[i].x) || isNaN(missingInGoogleSheet[i].y)) {
                coordStr = 'No record';
            } else {
                coordStr = missingInGoogleSheet[i].x + ':' + missingInGoogleSheet[i].y;
            }
            if(coordStr !== 'No record' || missingInGoogleSheet[i].affiliation !== 'No record') {
                recomCls = 'warning';
                recomMsg = 'investigate';
            } else {
                recomCls = 'ok';
                recomMsg = 'leave this system out';
            }

            html += '<tr>\n';
            html += '<td>' + missingInGoogleSheet[i].name + '</td>\n';
            html += '<td>' + coordStr + '</td>\n';
            html += '<td>' + missingInGoogleSheet[i].affiliation + '</td>\n';
            html += '<td class="'+recomCls+'">' + recomMsg + '</td>';
            html += '</tr>\n';
        }
        html += '</table>\n';
    }

    if(addedInGoogleSheet.length > 0) {
        html += '<h2>Systems that exist in the google sheet, but not on Sarna:</h2>\n';
        html += '<table><tr><th>System name</th><th>Google Sheet Coordinates</th><th>Google Sheet Affiliation</th><th>Script\'s recommendation</th></tr>\n';
        for(var i = 0, len = addedInGoogleSheet.length; i < len; i++) {
            html += '<tr>\n';
            html += '<td>' + addedInGoogleSheet[i].name + '</td>\n';
            html += '<td>' + addedInGoogleSheet[i].x + ':' + addedInGoogleSheet[i].y + '</td>\n';
            html += '<td>' + addedInGoogleSheet[i].affiliation + '</td>\n';
            html += '<td class="warning">investigate</td>\n';
            html += '</tr>\n';
        }
        html += '</table>\n';
    }

    if(differentCoordinates.length > 0) {
        html += '<h2>Systems whose coordinates on Sarna are different to those listed in the google sheet:</h2>\n';
        html += '<table><tr><th>System name</th><th>Sarna coordinates</th><th>Google sheet coordinates</th><th>Distance between coordinates</th><th>Script\'s recommendation</th></tr>\n';

        for(var i = 0, len = differentCoordinates.length; i < len; i++) {
            if(isNaN(differentCoordinates[i][1][0]) || isNaN(differentCoordinates[i][1][1])) {
                coordStr = 'No record';
            } else {
                coordStr = differentCoordinates[i][1][0] + ':' + differentCoordinates[i][1][1];
            }
            if(isNaN(differentCoordinates[i][2][0]) || isNaN(differentCoordinates[i][2][1])) {
                coordStr2 = 'No record';
            } else {
                coordStr2 = differentCoordinates[i][2][0] + ':' + differentCoordinates[i][2][1];
            }
            if(coordStr === 'No record' || coordStr2 === 'No record') {
                diff = Infinity;
            } else {
                diff = Math.sqrt(Math.pow(differentCoordinates[i][1][0] - differentCoordinates[i][2][0], 2) + Math.pow(differentCoordinates[i][1][1] - differentCoordinates[i][2][1], 2));
            }
            if(diff <= 5) {
                recomCls = 'attention';
                recomMsg = 'update google sheet coordinates';
            //} else if(diff <= 10) {
            //    recomCls = 'attention';
            //    recomMsg = 'investigate, then update google sheet coordinates';
            } else {
                recomCls = 'warning';
                recomMsg = 'investigate';
            }

            html += '<tr><td>' + differentCoordinates[i][0] + '</td>\n';
            html += '<td class="centered">' + coordStr + '</td>\n';
            html += '<td class="centered">' + coordStr2 + '</td>\n';
            html += '<td>' + diff.toFixed(2);
            if(diff !== Infinity) {
                html += ' LY';
            }
            html += '</td>\n';
            html += '<td class="'+recomCls+'">'+recomMsg+'</td>\n';
            html += '</tr>\n';
        }
        html += '</table>\n';
    }

    if(differentAffiliations.length > 0) {
        html += '<h2>Systems whose affiliation on Sarna is different to that listed in the google sheet:</h2>\n';
        html += '<table><tr><th>System name</th><th>Sarna affiliation</th><th>Google sheet affiliation</th><th>Script\'s recommendation</th></tr>\n';
        for(var i = 0, len = differentAffiliations.length; i < len; i++) {
            if(differentAffiliations[i][1] === 'No record' || differentAffiliations[i][2] === 'Disputed World') {
                recomCls = 'ok';
                recomMsg = 'leave as it is';
            } else if(differentAffiliations[i][2] === 'No record') {
                recomCls = 'attention';
                recomMsg = 'update google sheet affiliation';
            } else {
                recomCls = 'warning';
                recomMsg = 'investigate';
            }
            html += '<tr><td>' + differentAffiliations[i][0] + '</td>\n';
            html += '<td>' + differentAffiliations[i][1] + '</td>\n';
            html += '<td>' + differentAffiliations[i][2] + '</td>\n';
            html += '<td class="'+recomCls+'">' + recomMsg + '</td>\n';
            html += '</tr>\n';
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
