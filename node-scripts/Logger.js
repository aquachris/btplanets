module.exports = (function () {
    'use strict';

    var Logger = function (consoleVerbosity) {
        this.logs = {
            msg : [],
            warning : [],
            error : []
        };
        this.consoleVerbosity = consoleVerbosity || 0;
    };

    Logger.ALL = 0;
    Logger.MESSAGE = 1;
    Logger.WARNING = 2;
    Logger.ERROR = 3;
    Logger.SILENT = 4;


    Logger.prototype.log = function () {
        this.logs.msg.push(Array.prototype.slice.call(arguments));
        if(this.consoleVerbosity <= Logger.MESSAGE) {
            for(var i = 0; i < arguments.length; i++) {
                console.log(arguments[i]);
            }
        }
    };

    Logger.prototype.warn = function () {
        this.logs.warning.push(Array.prototype.slice.call(arguments));
        if(this.consoleVerbosity <= Logger.WARNING) {
            for(var i = 0; i < arguments.length; i++) {
                console.warn(arguments[i]);
            }
        }
    };

    Logger.prototype.error = function () {
        this.logs.error.push(Array.prototype.slice.call(arguments));
        if(this.consoleVerbosity <= Logger.ERROR) {
            for(var i = 0; i < arguments.length; i++) {
                console.error(arguments[i]);
            }
        }
    };

    Logger.prototype.flush = function () {
        this.logs = {
            msg : [],
            warning : [],
            error : []
        };
    };

    return Logger;
})();
