var fs = require('fs');
var Logger = require('./Logger.js');
var LogRenderer = require('./LogRenderer.js');
var SheetsSystemsReader = require('./SheetsSystemsReader.js');

var now = new Date();
var timestamp = now.getUTCFullYear();
timestamp += now.getUTCMonth() < 9 ? '0' + (now.getUTCMonth() + 1) : (now.getUTCMonth() + 1);
timestamp += now.getUTCDate() < 10 ? '0' + now.getUTCDate() : now.getUTCDate();
timestamp += now.getUTCHours() < 10 ? '0' + now.getUTCHours() : now.getUTCHours();
timestamp += now.getUTCMinutes() < 10 ? '0' + now.getUTCMinutes() : now.getUTCMinutes();

var TSV_PATH = '../data/systems_' + timestamp + '.tsv';
var JSON_PATH = '../data/systems_' + timestamp + '.json';
var LIVE_JSON_PATH = '../data/systems.json';
var INDEX_HTML_PATH = '../index.html';
var UPDATE_VERSION_STRING = true;

var logger = new Logger();
var logRenderer = new LogRenderer(logger, '../data/systems_log.html', '../data/log.tpl.html');
var reader = new SheetsSystemsReader(logger);

logger.log('script started');

reader.on('systemsRead', function (reader, systems) {
    var curSys;
    var path;
    logger.log(systems.length + ' systems read');

    var tsv = 'SARNA.NET PATH\tSYSTEM NAME\tCOORDINATES\t3025 AFFILIATION\tALIASES\tOBJECTS\n';
    for(var i = 0, len = systems.length; i < len; i++) {
        curSys = systems[i];
        path = curSys.link.replace('http://www.sarna.net', '');
        tsv += path + '\t';
        tsv += curSys.name + '\t';
        tsv += curSys.x + ':' + curSys.y + '\t';
        tsv += curSys.affiliation + '\t';
        for(var j = 0, jlen = curSys.aliases.length; j < jlen; j++) {
            tsv += curSys.aliases[j];
            if(j < jlen - 1) {
                tsv += ',';
            }
        }
        for(var j = 0, jlen = curSys.objects.length; j < jlen; j++) {
            tsv += curSys.objects[j];
            if(j < jlen - 1) {
                tsv += ',';
            }
        }
        tsv += '\n';
    }

    // write tsv file
    fs.writeFileSync(TSV_PATH, tsv);
    logger.log('tsv file "'+TSV_PATH+'" was saved');

    // generate json system description
    var systemsString = JSON.stringify(systems);

    // write json file
    fs.writeFileSync(JSON_PATH, systemsString);
    logger.log('json file "'+JSON_PATH+'" was saved');

    // overwrite "live" json file
    fs.writeFileSync(LIVE_JSON_PATH, systemsString);
    logger.log('json file "'+LIVE_JSON_PATH+'" was overwritten');

    // read index.html and replace the version string so that
    // the users get the new data without clearing their cache
    if(UPDATE_VERSION_STRING) {
        var indexHtml = fs.readFileSync(INDEX_HTML_PATH, {
            encoding: 'utf8'
        });
        indexHtml = indexHtml.replace(/\.css\?version=\d+/,
            '.css?version=' + timestamp);
        indexHtml = indexHtml.replace(/window\.BTPLANETS_VERSION(\s*)\=(\s*)(\d+)\;/gi,
            'window.BTPLANETS_VERSION = ' + timestamp + ';');
        fs.writeFileSync(INDEX_HTML_PATH, indexHtml);
        logger.log('version string in index.html updated');
    }

    logRenderer.render();
});

reader.readSystems();
