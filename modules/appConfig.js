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

var configDB = require("../db/config.js");
var _ = require('underscore');

var appConfig = {};
var configMessages = "";

var configureApp = function() {
    configDB.findOne(function (err, config) {
        if(err) {
            console.log("Failed to load application configuration: " + JSON.stringify(err));
            process.exit(1);
        }
        if(config === null) {
            var msg = "No initial app configuration exists. Creating default in the database at " + wwwConfig.mongoConnection + "."
            console.log(msg);
            configMessages += " " + msg;
            var newConfig = new configDB();
            return newConfig.save(function (err, savedConfig) {
                if(err) {
                    console.log("Failed to save initial app configuration: " + JSON.stringify(err));
                    process.exit(1);
                }
                appConfig = savedConfig;
            });
        }
        configMessages += " Application configuration already existed in the database at " + wwwConfig.mongoConnection + ".";
        appConfig = config;
    })
}

var getConfig = function() {
    var config = appConfig.toObject();
    config.baseDNs = _.keys(wwwConfig.ActiveDirectoryConfig);
    return config;
}

var getConfigMessages = function() {
    return configMessages;
}

module.exports = {
    "getConfig": getConfig,
    "getConfigMessages": getConfigMessages,
    "configureApp": configureApp
};

