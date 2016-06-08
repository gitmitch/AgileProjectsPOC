/*

 Copyright 2016 Viewpoint, Inc.

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.

 */

// the point of this module is to make it easier later to expand
// options for connecting to TFS/VSO/VSTS beyond HTTP and NTLM to
// include HTTPS, basic auth, etc.

var httpntlm = require('./httpntlm');
var request = require('request');
var fs = require('fs');
var _ = require('underscore');

var getDefaultOptions = function() {
    var defaultOptions = {
        url: '',
        method: 'GET',
        json: true,
        headers: {
            'Content-Type': 'application/json'
        },
        protocol: 'http',
        authentication: 'ntlm',
        credentials: {
            username: '',
            password: '',
            domain: ''
        }
    };

    return defaultOptions;
}


var savedOptions = getDefaultOptions();

var getSavedOptions = function() {
    return savedOptions;
}

var getSavedOptionsCopy = function() {
    var copy = {
        url: getSavedOptions().url,
        method: getSavedOptions().method,
        json: getSavedOptions().json,
        headers: {
            'Content-Type': getSavedOptions().headers['Content-Type']
        },
        protocol: getSavedOptions().protocol,
        authentication: getSavedOptions().authentication,
        credentials: {
            username: getSavedOptions().credentials.username,
            password: getSavedOptions().credentials.password,
            domain: getSavedOptions().credentials.domain,
            method: getSavedOptions().credentials.method,
            token: getSavedOptions().credentials.token
        }
    };
    return copy;
}

var loadCredentialsOnce = function(credentialsFile) {
    if(_.isEqual(getSavedOptions().credentials, getDefaultOptions().credentials))
        getSavedOptions().credentials = JSON.parse(fs.readFileSync(credentialsFile, 'utf8'));
}

var rawRequest = function(options, callback) {

    if(options.credentials.method == null)
        options.credentials.method = 'ntlm';

    if(options.url.startsWith('http://') && options.credentials.method == 'ntlm') {
        var reqFunc = {
            'GET': httpntlm.get,
            'POST': httpntlm.post
        }[options.method];

        var reqOptions = {
            url: options.url,
            method: options.method,
            json: options.json,
            headers: options.headers,
            username: options.credentials.username,
            password: options.credentials.password,
            domain: options.credentials.domain,
            body: options.body
        };

        reqFunc(reqOptions, callback);
    }
    else if(options.url.startsWith('https://') && options.credentials.method == 'personalToken') {
        var reqOptions = {
            url: options.url,
            method: options.method,
            headers: options.headers,
            body: options.body,
            auth: {
                user: 'someloser', //this can be anything: http://roadtoalm.com/2015/07/22/using-personal-access-tokens-to-access-visual-studio-online/
                pass: options.credentials.token
            }
        }
        request(reqOptions, callback);
    }
    else
        process.nextTick(callback.bind(null, new Error('unsupported protocol and/or authentication method')))

}

var jsonBody = function(options, callback) {
    rawRequest(options, function(err, response) {
        if(response.body != null)
            callback(err, JSON.parse(response.body));
        else
            callback(err);
    });
}

module.exports = {
    getDefaultOptions: getDefaultOptions,
    rawRequest: rawRequest,
    getSavedOptions: getSavedOptions,
    getSavedOptionsCopy: getSavedOptionsCopy,
    loadCredentialsOnce: loadCredentialsOnce,
    jsonBody: jsonBody
}