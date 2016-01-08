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

var _ = require('underscore');
var fs = require('fs');
var http = require('http');
var httpntlm = require('../modules/httpntlm');
var async = require('async');

function main() {
    var args = process.argv.slice(2);
    var config = JSON.parse(fs.readFileSync(args[0], 'utf8'));
    console.log("reading credentials from " + config.credentialsFile);
    config.credentials = JSON.parse(fs.readFileSync(config.credentialsFile, 'utf8'));

    http.globalAgent.maxSockets = config.maxConcurrentRequests;

    var model = JSON.parse(fs.readFileSync(config.modelStorageFile, 'utf8'));

    decorateTFS(model, config);
}

function configAndDecorate(configFilename, model) {

    var config = JSON.parse(fs.readFileSync(configFilename, 'utf8'));
    console.log("reading credentials from " + config.credentialsFile);
    config.credentials = JSON.parse(fs.readFileSync(config.credentialsFile, 'utf8'));
    decorateTFS(model, config);
}

function decorateTFS(model, config, callbackWhenDoneDecorating) {
    log("decorating tfs...");

    // get the classes of service
    //var classesOfService = JSON.parse(fs.readFileSync(config.classesOfServiceFile, 'utf8'));
    var classesOfService = model.classesOfService;

    // for each item in the class of service, calculate the cycle time and update the item in TFS
    //_(classesOfService).each(function(classOfService) {
    async.each(classesOfService, function(classOfService, classDone) {
        if(classOfService.decorateTFS) {

            // check for proper configuration
            if(classOfService.decoratorConfig == null) {
                log("class of service config is missing decoratorConfig property: " + JSON.stringify(classOfService));
                return;
            }

            if(classOfService.decoratorConfig.columnsToInclude == null) {
                log("no columns were specified in decoratorConfig: " + JSON.stringify(classOfService));
                return;
            }

            // get the items in the class
            var classFromModel = _.findWhere(model.classesOfService, { name: classOfService.name, board: classOfService.board });
            if(classFromModel == undefined) {
                log("classes of service config file referenced a class of service that wasn't present in the model: " + JSON.stringify(classOfService));
                return;
            }

            // for each item, calculate the cycle time
            var cycleTimes = _(classFromModel.itemsAll).map(function(itemId) {
                return {
                    itemId: itemId,
                    cycleTime: computeCycleTimeForItem(model, itemId, classOfService.board, classOfService.decoratorConfig.columnsToInclude)
                };
            });

            // update TFS with the data
            async.eachLimit(cycleTimes, config.maxConcurrentRequests, function(ctRecord, callbackWhenDone) {


                var field = classOfService.decoratorConfig.fieldToUpdate;

                if(model.itemInfo[ctRecord.itemId][field] == null || Number(model.itemInfo[ctRecord.itemId][field]) != ctRecord.cycleTime) {
                    log("updated " + ctRecord.itemId + ": " + ctRecord.cycleTime);
                    updateTFSField(config, ctRecord.itemId, field, ctRecord.cycleTime, callbackWhenDone);

                } else {
                    log("no need to update " + ctRecord.itemId);
                    // https://github.com/caolan/async/issues/75
                    process.nextTick(callbackWhenDone);
                }
            }, classDone)

        }
        else {
            return process.nextTick(classDone);
        }
    }, callbackWhenDoneDecorating)

}

function updateTFSField(config, itemId, fieldName, value, callback) {
    var body = JSON.stringify(
            [ {
                op: 'add',
                path: '/fields/' + fieldName,
                value: value
            }]
    );

    var options = {
        'url': config.url + "/_apis/wit/workitems/" + itemId + "?bypassRules=true&api-version=1.0",
        'method': "PATCH",
        'body': body,
        'json': true,
        'headers': {
            'Content-Type': 'application/json-patch+json',
            'Accept': 'application/json'
        },

        'username': config.credentials.username,
        'password': config.credentials.password,
        'domain': config.credentials.domain

    }

    //return process.nextTick(callback);

    httpntlm.patch(options, function(error, response) {
        if(error || response == null) {
            log("error updating " + itemId + ". error: " + error.message + ", response: " + JSON.stringify(response));
            return callback(error);
        }
        if(response.statusCode == null || response.statusCode != 200) {
            log("error in http response for " + itemId + ": " + JSON.stringify(response));
            return callback(error);
        }
        return callback(error);

    });

}


function computeCycleTimeForItem(model, id, board, columns) {


    var ct = 0;
    if(model.rawCycleTimes[id] == null || !model.rawCycleTimes[id][board] == null)
        return ct;

    ct = _.reduce(model.rawCycleTimes[id][board], function(memo, column) {
        if(_.contains(columns, column.columnName))
            return memo + column.bizDays;
        return memo;
    }, ct);

    return ct;

}


function log(str) {
    console.log(str);
}

module.exports = {
    main: main,
    decorateTFS: decorateTFS,
    configAndDecorate: configAndDecorate
}