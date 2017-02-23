module.exports = (function () {

    var fs = require('fs');

    var LogRenderer = function (logger, fileName) {
        this.logger = logger;
        this.fileName = fileName;
    };

    LogRenderer.prototype.render = function () {
        var logs = this.logger.logs;
        var html = '<h1>Script log</h1>\n';
        html += '<p>Time of execution: ' + new Date() + '</p>\n';

        html += '<h2>' + logs.error.length + ' ';
        html += logs.error.length === 1 ? 'error' : 'errors';
        html += '</h2>\n';
        html += '<div class="msg">\n';
        for(var i = 0, len = logs.error.length; i < len; i++) {
            html += '<p>';
            html += logs.error[i].join(' ');
            html += '</p>\n';
        }
        html += '</div>\n';

        html += '<h2>' + logs.warning.length + ' ';
        html += logs.warning.length === 1 ? 'warning' : 'warnings';
        html += '</h2>\n';
        html += '<div class="warnings">\n';
        for(var i = 0, len = logs.warning.length; i < len; i++) {
            html += '<p>';
            html += logs.warning[i].join(' ');
            html += '</p>\n';
        }
        html += '</div>\n';

        html += '<h2>' + logs.msg.length + ' ';
        html += logs.msg.length === 1 ? 'message' : 'messages';
        html += '</h2>\n';
        html += '<div class="messages">\n';
        for(var i = 0, len = logs.msg.length; i < len; i++) {
            html += '<p>';
            html += logs.msg[i].join(' ');
            html += '</p>\n';
        }
        html += '</div>\n';

        fs.writeFile(this.fileName, html, function(err) {
            if(err) {
                return console.log(err);
            }
            console.log('log file "'+this.fileName+'" was saved');
        }.bind(this));
        this.logger.flush();
    };

    return LogRenderer;
})();
