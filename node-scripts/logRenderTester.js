var Logger = require('./Logger.js');
var LogRenderer = require('./LogRenderer.js');

var logger = new Logger(Logger.ERROR);
var logRenderer = new LogRenderer(logger, '../temp/logRenderTester.out.html', '../data/log.tpl.html');

var words = ['lorem','ipsum','dolor','sit','amet', 'foo', 'bar', 'test', 'ready', 'done'];
var rand1, rand2, numWords, logMessage;

// create a variety of logs
for(var i = 0; i < 100; i++) {
    rand1 = Math.random();
    numWords = Math.floor(Math.random() * 8 + 5);
    logMessage = '';
    for(var wIdx = 0; wIdx < numWords; wIdx++) {
        logMessage += words[Math.floor(Math.random() * words.length)] + ' ';
    }
    logMessage = logMessage.trim();

    if(rand1 < 0.6) { // chance for normal log is 60%
        logger.log(logMessage);
    } else if(rand1 < 0.8) { // chance for warning is 25%
        logger.warn(logMessage);
    } else { // chance for error is 15%
        logger.error(logMessage);
    }
}

// render the result after a short delay
setTimeout(logRenderer.render.bind(logRenderer), 500);
