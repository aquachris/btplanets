'use strict';

var Logger = require('./Logger.js');
var LogRenderer = require('./LogRenderer.js');
var SheetsSystemsReader = require('./SheetsSystemsReader.js');

var logger = new Logger();
var logRenderer = new LogRenderer(logger, 'scriptLog.html');
var reader = new SheetsSystemsReader(logger);

logger.log('script started');

reader.on('systemsRead', function (reader, systems) {
    console.log(systems.length + ' systems read');
    logRenderer.render();
});

reader.readSystems();
