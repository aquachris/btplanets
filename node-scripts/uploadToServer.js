var fs = require('fs')
var JSFtp = require('jsftp');

var files = [
    'index.html', 'index.css',

    'data/borders.json', 'data/systems.json',
    'data/systems_log.html',

    'js/btplanets.js', 'js/btplanets_keys.js',
    'js/btplanets_routes.js', 'js/btplanets_ui.js',
    'js/btplanets_userdata.js', 'js/index.js'
];

var ftpConn;
var curIdx = 0;

var doUpload = function () {

    var credentials = JSON.parse(fs.readFileSync('./ftp_secret.json', {
        encoding: 'utf8'
    }));

    ftpConn = new JSFtp({
      host: credentials.server,
      port: 21,
      user: credentials.user,
      pass: credentials.password
    });


    uploadNextFile();
};

var uploadNextFile = function () {
    if(curIdx >= files.length) {
        logout();
        return;
    }
    ftpConn.put('../' + files[curIdx], 'innersphere/' + files[curIdx], function (hadError) {
        if(hadError) {
            console.error('could NOT upload ' + files[curIdx] + '. Quitting.');
            logout();
            return;
        } else {
            console.log('uploaded ' + files[curIdx] + ' successfully.');
            curIdx++;
            uploadNextFile();
        }
    })
};

var logout = function () {
    ftpConn.raw('quit', function (err, data) {
        if(err) {
            return console.error(err);
        }
        console.log('done!');
    });
};


doUpload();
