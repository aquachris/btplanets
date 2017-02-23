module.exports = (function () {
    'use strict';

    var fs = require('fs');
    var readline = require('readline');
    var google = require('googleapis');
    var googleAuth = require('google-auth-library');
    var Observable = require('./Observable.js');

    /**
     * An instance of this class takes care of authenticating against the google api
     * for a given application.
     *
     * Note that modifications might require you to delete your previously saved
     * credentials at ~/.credentials/[appKey].json
     *
     * @fires authObjectReady When the auth object has been instantiated and populated
     */
    var SheetsAuthInstance = function (appKey, scopes) {
        this.parent.call(this);
        this.oauth2Client = null;
        this.appKey = appKey;
        this.scopes = scopes;
        this.tokenDir = (process.env.USERPROFILE || process.env.HOME || process.env.HOMEPATH) + '/.credentials/';
        this.tokenPath = this.tokenDir + this.appKey + '.json';

        this.addEventTopics('authObjectReady');
    };

    SheetsAuthInstance.prototype = Object.create(Observable.prototype);
    SheetsAuthInstance.prototype.constructor = SheetsAuthInstance;
    SheetsAuthInstance.prototype.parent = Observable;

    /**
     * Gets the OAuth client object.
     *
     * @returns {Object} The oauth client object
     */
    SheetsAuthInstance.prototype.getOAuth2Client = function () {
        return this.oauth2Client;
    };

    /**
     * Loads the credentials file and triggers authorization.
     */
    SheetsAuthInstance.prototype.loadCredentialsAndAuthorize = function () {
        fs.readFile('client_secret.json', function (err, content) {
            if (err) {
                console.log('Error loading client secret file: ' + err);
                return;
            }
            // Authorize a client with the loaded credentials, then call the
            // Google Sheets API.
            this.authorize(JSON.parse(content));
        }.bind(this));
    };

    /**
     * Creates an OAuth2 client with the given credentials.
     *
     * @param {Object} credentials The authorization client credentials.
     * @private
     */
    SheetsAuthInstance.prototype.authorize = function(credentials) {
        var clientSecret = credentials.installed.client_secret;
        var clientId = credentials.installed.client_id;
        var redirectUrl = credentials.installed.redirect_uris[0];
        var auth = new googleAuth();

        this.oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

        // Check if we have previously stored a token.
        fs.readFile(this.tokenPath, function(err, token) {
            if (err) {
                this.getNewToken();
            } else {
                this.oauth2Client.credentials = JSON.parse(token);
                this.fire('authObjectReady', [this, this.oauth2Client]);
            }
        }.bind(this));
    };

    /**
     * Gets and stores new token after prompting for user authorization.
     * @private
     */
    SheetsAuthInstance.prototype.getNewToken = function() {
        var authUrl = this.oauth2Client.generateAuthUrl({
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
            this.oauth2Client.getToken(code, function(err, token) {
                if (err) {
                    console.log('Error while trying to retrieve access token', err);
                    return;
                }
                this.oauth2Client.credentials = token;
                this.storeToken(token);
                this.fireEvent('authObjectReady', [this, this.oauth2Client]);
            }.bind(this));
        }.bind(this));
    };

    /**
     * Stores token to disk be used in later program executions.
     *
     * @param {Object} token The token to store to disk.
     * @private
     */
    SheetsAuthInstance.prototype.storeToken = function (token) {
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

    return SheetsAuthInstance;

})();
