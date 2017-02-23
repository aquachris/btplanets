module.exports = (function () {
    'use strict';

    var fs = require('fs');
    var readline = require('readline');
    var google = require('googleapis');
    var googleAuth = require('google-auth-library');

    /**
     * An instance of this class takes care of authenticating against the google api
     * for a given application.
     *
     * Note that modifications might require you to delete your previously saved
     * credentials at ~/.credentials/[appKey].json
     */
    var GoogleSheetsAuth = function (appKey, scopes) {
        this.appKey = appKey;
        this.scopes = scopes;
        this.tokenDir = (process.env.USERPROFILE || process.env.HOME || process.env.HOMEPATH) + '/.credentials/';
        this.tokenPath = this.tokenDir + this.appKey + '.json';
    };

    /**
     * Loads the credentials file and trigger authorization.
     *
     * @param {Function} callbackFn The function to execute when authorization is successful
     * @param {Object} scope The callback function's this scope
     */
    GoogleSheetsAuth.prototype.loadCredentialsAndAuthorize = function (callbackFn, scope) {
        scope = scope || this;
        fs.readFile('client_secret.json', function (err, content) {
            if (err) {
                console.log('Error loading client secret file: ' + err);
                return;
            }
            // Authorize a client with the loaded credentials, then call the
            // Google Sheets API.
            this.authorize(JSON.parse(content), callbackFn, scope);
        }.bind(this));
    };

    /**
     * Create an OAuth2 client with the given credentials, and then execute the
     * given callback function.
     *
     * @param {Object} credentials The authorization client credentials.
     * @param {function} callback The callback to call with the authorized client.
     * @param {Object} scope The callback's scope
     * @private
     */
    GoogleSheetsAuth.prototype.authorize = function(credentials, callback, scope) {
        var clientSecret = credentials.installed.client_secret;
        var clientId = credentials.installed.client_id;
        var redirectUrl = credentials.installed.redirect_uris[0];
        var auth = new googleAuth();
        var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

        // Check if we have previously stored a token.
        fs.readFile(this.tokenPath, function(err, token) {
            if (err) {
                this.getNewToken(oauth2Client, callback, scope);
            } else {
                oauth2Client.credentials = JSON.parse(token);
                callback.call(scope, oauth2Client);
            }
        }.bind(this));
    };

    /**
     * Get and store new token after prompting for user authorization, and then
     * execute the given callback with the authorized OAuth2 client.
     *
     * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
     * @param {getEventsCallback} callback The callback to call with the authorized client.
     * @param {Object} scope The callback's scope
     * @private
     */
    GoogleSheetsAuth.prototype.getNewToken = function(oauth2Client, callback, scope) {
        var authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: this.scopes
        });
        console.log('Authorize this app by visiting this url: ', authUrl);
        var rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        rl.question('Enter the code from that page here: ', function(code) {
            rl.close();
            oauth2Client.getToken(code, function(err, token) {
                if (err) {
                    console.log('Error while trying to retrieve access token', err);
                    return;
                }
                oauth2Client.credentials = token;
                this.storeToken(token);
                callback.call(scope, oauth2Client);
            }.bind(this));
        }.bind(this));
    };

    /**
     * Store token to disk be used in later program executions.
     *
     * @param {Object} token The token to store to disk.
     * @private
     */
    GoogleSheetsAuth.prototype.storeToken = function (token) {
        try {
            fs.mkdirSync(this.tokenDir);
        } catch (err) {
            if (err.code != 'EEXIST') {
                throw err;
            }
        }
        fs.writeFile(this.tokenPath, JSON.stringify(token));
        console.log('Token stored to ' + this.tokenPath);
    };

    return GoogleSheetsAuth;

})();
