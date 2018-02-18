var fs = require('fs');

var distance = function (o1, o2) {
    if(isNaN(o1.x) || isNaN(o1.y) || isNaN(o2.x) || isNaN(o2.y) ) {
        return Infinity;
    }
    return Math.sqrt(
        Math.pow(o1.x - o2.x, 2) + Math.pow(o1.y - o2.y, 2)
    );
};

var html = '';

// read and evaluate SUCS file
var rawFile = fs.readFileSync('./../data/Systems SUCS_bearbeitet.csv', {
    encoding: 'utf-8'
});

var SUCSRawArr = rawFile.split("\r\n");
SUCSRawArr.shift();

var SUCSArr = [];
var itemStr = '';
var itemArr;
var itemXStr, itemYStr;
for(var i = 0; i < SUCSRawArr.length; i++) {
    itemStr = SUCSRawArr[i].trim();
    itemArr = itemStr.split(';');
    if(itemArr.length < 4) {
        continue;
    }
    itemXStr = itemArr[1].replace('.', '');
    itemXStr = itemXStr.replace(',','.');
    itemYStr = itemArr[2].replace('.', '');
    itemYStr = itemYStr.replace(',','.');
    SUCSArr.push({
        name : itemArr[0],
        x : parseFloat(itemXStr),
        y : parseFloat(itemYStr),
        affiliation : itemArr[3]
    });
}
SUCSArr.sort(function (a, b) {
    if(a.name < b.name) {
        return -1;
    } else {
        return 1;
    }
});
//console.log(SUCSArr);

// read and evaluate map's data file
rawFile = fs.readFileSync('./../data/systems.json', {
    encoding : 'utf-8'
});

var mapDataArr = JSON.parse(rawFile);
//console.log(mapDataArr);

html += '<h2>Systems that are in the map\'s file, but not in the Unified Cartography Kit</h2>\n';
html += '<table>\n<tr>\n\t<th>System name</th>\n\t<th>Comment</th>\n</tr>\n';

var curObj, curOtherObj;
var matchFound;
for(var i = 0; i < mapDataArr.length; i++) {
    curObj = mapDataArr[i];
    matchFound = false;
    for(var j = 0; j < SUCSArr.length; j++) {
        curOtherObj = SUCSArr[j];
        if(curObj.name === curOtherObj.name) {
            matchFound = true;
            break;
        }
    }
    if(!matchFound) {
        html += '<tr>\n\t<td>'+curObj.name+'</td>\n\t<td></td>\n</tr>\n';
        console.log('No match found for map data file ' + curObj.name);
    }
}

html += '</table>\n\n';

// find all entries that are in the SUCS file, but not in the map data file
html += '<h2>Systems that are in the Unified Cartography Kit, but not in the map\'s file</h2>\n';
html += '<table>\n<tr>\n\t<th>System name</th>\n\t<th>Comment</th>\n</tr>\n';

for(var i = 0; i < SUCSArr.length; i++) {
    curObj = SUCSArr[i];
    matchFound = false;
    for(var j = 0; j < mapDataArr.length; j++) {
        curOtherObj = mapDataArr[j];
        if(curObj.name === curOtherObj.name) {
            matchFound = true;
            break;
        }
    }
    if(!matchFound) {
        html += '<tr>\n\t<td>' + curObj.name + '</td>\n\t<td></td>\n</tr>\n';
        console.log('No match found for SUCS ' + curObj.name);
    }
}
html += '</table>\n\n';

// compare coordinates
html += '<h2>Coordinate differences between the two map sets\n';
html += '<br><em style="font-weight: normal;">Note: Differences < 0.1 LY are ignored</em></h2>\n';
html += '<table>\n<tr>\n\t';
html += '<th>System name</th>\n\t';
html += '<th>Coordinates (map data set)</th>\n\t';
html += '<th>Coordinates (UCK)</th>\n\t';
html += '<th>Distance moved</th>\n\t';
html += '<th>Comment</th>\n';
html += '</tr>\n';
var curDist;
var cls, clsDesc;
for(var i = 0; i < mapDataArr.length; i++) {
    curObj = mapDataArr[i];
    for(var j = 0; j < SUCSArr.length; j++) {
        curOtherObj = SUCSArr[j];
        if(curObj.name === curOtherObj.name) {
            if(!isNaN(curOtherObj.x)) {
                curOtherObj.x = Math.round(curOtherObj.x * 100) / 100;
            }
            if(!isNaN(curOtherObj.y)) {
                curOtherObj.y = Math.round(curOtherObj.y * 100) / 100;
            }
            curDist = distance(curObj, curOtherObj);
            if(curDist > 0.1) {
                curDist = Math.round(curDist * 100) / 100;
                cls = 'warning';
                clsDesc = 'double check coordinates';
                if(curDist < 1) {
                    cls = 'ok';
                    clsDesc = 'probably ok';
                } else if(curDist < 10) {
                    cls = 'attention';
                    clsDesc = 'might be ok';
                }
                html += '<tr>\n\t';;
                html += '<td>' + curObj.name + '</td>\n\t';
                html += '<td>[' + curObj.x + ', ' + curObj.y + ']</td>\n\t';
                html += '<td>[' + curOtherObj.x + ', ' + curOtherObj.y + ']</td>\n\t';
                html += '<td>'+curDist+' LY</td>\n\t';
                html += '<td class="'+cls+'">'+clsDesc+'</td>\n</tr>\n';
                console.log('Coordinates for ' + curObj.name + ' moved by ' + curDist + ' LY ['+curObj.x+','+curObj.y+'] vs. ['+curOtherObj.x+','+curOtherObj.y+']');
            }
            break;
        }
    }
}
html += '</table>\n\n';

// compare affiliations
html += '<h2>Affiliation differences between the two data sets<br>\n';
html += '<em style="font-weight: normal">Note: UCK affiliations derived</em></h2>\n';
html += '<table>\n<tr>\n\t';
html += '<th>System name</th>\n\t';
html += '<th>3025 Affiliation (map data set)</th>\n\t';
html += '<th>3025 Affiliation (UCK, derived)</th>\n\t';
html += '<th>Comment</th>\n';
html += '</tr>\n';
var curDist;
for(var i = 0; i < mapDataArr.length; i++) {
    curObj = mapDataArr[i];
    for(var j = 0; j < SUCSArr.length; j++) {
        curOtherObj = SUCSArr[j];
        if(curObj.name === curOtherObj.name) {
            if(curObj.affiliation !== curOtherObj.affiliation) {
                if(curObj.affiliation === 'Clan' && curOtherObj.affiliation.startsWith('Clan')) {
                    continue;
                }
                cls = 'warning';
                clsDesc = 'double check affiliation';
                if(curObj.affiliation === 'Aurigan Coalition') {
                    cls = 'ok';
                    clsDesc = 'ok';
                }
                html += '<tr>\n\t';;
                html += '<td>' + curObj.name + '</td>\n\t';
                html += '<td>' + curObj.affiliation + '</td>\n\t';
                html += '<td>' + curOtherObj.affiliation + '</td>\n\t';
                html += '<td class="'+cls+'">'+clsDesc+'</td>\n</tr>\n';
                console.log('Affiliation for ' + curObj.name + ' changed: ' + curObj.affiliation + ' -> '+ curOtherObj.affiliation);
            }
            break;
        }
    }
}
html += '</table>\n\n';

var tpl = fs.readFileSync('../data/log_simple.tpl.html', 'utf8');
html = tpl.replace('{LOG_CONTENT}', html);
fs.writeFile('../temp/UCKcomparisonOutput.html', html, function(err) {
    if(err) {
        return console.log(err);
    }
    console.log('output was saved');
});
