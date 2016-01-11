#!/usr/bin/env node

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



var fs = require('fs');
var webclient = require('../modules/webclient');
var async = require('async');
var projectormodel = require('../modules/projectormodel');
var kanbanModel = require('../db/kanbanModel');
var tfsdecorator = require('../modules/tfsdecorator');
var _ = require('underscore');
var http = require('http');


var args = process.argv.slice(2);
var config = JSON.parse(fs.readFileSync(args[0], 'utf8'));

var db = require('../db');
var connectDb = function(callback) {
    db.connect(config.mongoConnection, function (err) {
        if (err) {
            console.log('failed to connect to database: ' + JSON.stringify(err));
            process.exit(0);
        }
        console.log('mongodb connected');
        callback();
    })
}
var ClassOfService = require('../db/classOfService');




console.log("reading credentials from " + config.credentialsFile);
config.credentials = JSON.parse(fs.readFileSync(config.credentialsFile, 'utf8'));

http.globalAgent.maxSockets = config.maxConcurrentRequests;

var model = {};

if(args[1] == 'skipdownload')
    model = load();
else
    model = new projectormodel.Model();

// in series, get classes and then run queries

var serialOps = [
    connectDb,
    getClassesOfService.bind(null, model),
    getItemsForClasses.bind(null, model),
    getHistoryForItems.bind(null, model),
    getInfoForItems.bind(null, model),
    addColumnsToClasses.bind(null, model),
    computeRawCycleTimes.bind(null, model),
    persist.bind(null, model),
    tfsdecorator.decorateTFS.bind(null, model, config)
];

if(args[1] == 'skipdownload')
    serialOps = serialOps.slice(5);


async.series(
    serialOps,
    function (err) {
        if(err) {
            log("error with series");
            log(err.message);
        }

        db.disconnect(function() {
            log("all done");
        })

    }

);

function computeRawCycleTimes(model, callbackWhenDone) {

    model.rawCycleTimes = {};

    async.forEachOf(model.itemHistory, function(historyRecord, id, callbackWhenItemDone) {
        model.rawCycleTimes[id] = computeColumnTimes(historyRecord);
        callbackWhenItemDone();
    }, callbackWhenDone);

    //_.each(model.itemHistory, function(historyRecord, id) {
    //        model.rawCycleTimes[id] = computeColumnTimes(historyRecord);
    //        log(model.rawCycleTimes[id]);
    //})
    //callbackWhenDone();

}

function computeColumnTimes(itemHistory) {
    // itemHistory is an array of revisions
    // each revision is of the form {
    //  changedDate: datetime
    //  board1: {
    //      oldValue: (optional)
    //      newValue: (optional)
    //  }
    // }

    // returns dictionary by board ID: {
    //  array of columns: [ {columnName:, bizDays: }]
    // }

    var columnTimes = {};

    if(itemHistory.length <= 1)
        return null;

    for(var revNdx = 1; revNdx < itemHistory.length; revNdx++) {
        _.each(itemHistory[revNdx], function(value, key) {
            if(key != 'changedDate') {
                var board = key;
                var prevColumn = value.oldValue;
                // find the previous record with the same board and prev.newValue = cur.oldValue
                var searchNdx = revNdx-1;
                while(searchNdx >= 0 && !(
                  itemHistory[searchNdx].hasOwnProperty(board) && itemHistory[searchNdx][board].newValue == prevColumn))
                    searchNdx--;
                if(searchNdx >=0)
                    addColumnTimesRecord(columnTimes, board, prevColumn, bizDaysBetween(itemHistory[searchNdx].changedDate, itemHistory[revNdx].changedDate));
                // if this is the last revision, then add cycle time to current date
                if(revNdx == itemHistory.length-1)
                    addColumnTimesRecord(columnTimes, board, value.newValue, bizDaysBetween(itemHistory[revNdx].changedDate, new Date()));
            }
        })
    }

    return columnTimes;
}

function addColumnTimesRecord(columnTimes, board, column, days) {
    if(!columnTimes.hasOwnProperty(board))
        columnTimes[board] = [];
    var columnNdx = _.findIndex(columnTimes[board], function(element) {
        return element.columnName == board;
    })
    if(columnNdx == -1) {
        columnTimes[board].push({
            columnName: column,
            bizDays: 0
        });
        columnNdx = columnTimes[board].length - 1;
    }
    columnTimes[board][columnNdx].bizDays += days;
}

Date.prototype.addDays = function(days)
{
    // http://stackoverflow.com/questions/563406/add-days-to-datetime
    var dat = new Date(this.valueOf());
    dat.setDate(dat.getDate() + days);
    return dat;
}



function bizDaysBetween(beforedate, afterdate) {
    before = new Date(beforedate);
    after = new Date(afterdate);

    before = new Date(before.getFullYear(), before.getMonth(), before.getDate());
    after = new Date(after.getFullYear(), after.getMonth(), after.getDate());

    if(after < before)
        return bizdaysdiff(afterdate, beforedate);

    var cur = before;
    var numDays = 0;
    while(cur <= after) {
        var dow = new Date(cur).getDay();
        if(dow != 0 && dow != 6)
            numDays++;
        cur = cur.addDays(1);
    }

    if(numDays < 1)
        return 0;
    return numDays-1;

}

function getInfoForItems(model, callbackWhenDone) {

    model.itemInfo = {};

    async.eachLimit(model.allItems, config.maxConcurrentRequests, function(id, callbackWhenItemDone) {
        getItemInfo(id, model, function(err, info) {

            if(err) {
                log("error getting info for item " + id);
                return callbackWhenItemDone(err);
            }
            log("got info for item " + id);
            model.itemInfo[id] = info;
            callbackWhenItemDone(null);
        })
    }, function(err) {
        log("done downloading info for all items");
        callbackWhenDone(err);
    });
}

function getItemInfo(id, model, callbackWithInfo) {

    var boards = model.allBoards;

    var additionalInfoFields = [];
    if(model.additionalInfoFields != null)
        additionalInfoFields = model.additionalInfoFields;

    var baseurl = config.url + "/_apis/wit/workitems?ids=" + id + "&api-version=1.0";

    var options = {
        'url': baseurl,
        'method': "GET",
        'json': true,
        'headers': {
          'Content-Type': 'application/json',
        },
        'credentials': config.credentials

    }

    webclient.rawRequest(options, function(error, response) {
        if (!error && response.statusCode == 200) {

            var responseObj = JSON.parse(response.body);

            var infoObj = {};

            var fields = {
                "System.WorkItemType": "type",
                "System.Title": "title",
                "Microsoft.VSTS.Common.ClosedDate": "closedDate"
            };
            _(additionalInfoFields).each(function(field) {
                fields[field] = field;
            });

            _.each(fields, function(internalField, externalField) {
                if(responseObj.value[0].fields.hasOwnProperty(externalField))
                    infoObj[internalField] = responseObj.value[0].fields[externalField];
            });

            infoObj.boards = [];

            _.each(boards, function(board) {
                if(responseObj.value[0].fields.hasOwnProperty("WEF_" + board + "_Kanban.Column"))
                    infoObj.boards.push({
                        board: board,
                        column: responseObj.value[0].fields["WEF_" + board + "_Kanban.Column"]
                    })
            })

            callbackWithInfo(null, infoObj);

        }
        else {
            if(response)
                logRequestError("getItemInfo", response);
            else
                log("request error, but no response data: " + JSON.stringify(error))
            callbackWithInfo(true);
        }
    })


}

function addColumnsToClasses(model, callbackWhenDone) {
    model.columnsForBoard = {};

    _.each(model.allBoards, function(board) {
        model.columnsForBoard[board] = [];
    })

    _.each(model.itemHistory, function(itemRevisions) {
        _.each(itemRevisions, function(revision) {
            _.each(revision, function(value, key) {
                if(value.hasOwnProperty('oldValue'))
                    model.columnsForBoard[key] = _.union(model.columnsForBoard[key], [value.oldValue]);
                if(value.hasOwnProperty('newValue'))
                    model.columnsForBoard[key] = _.union(model.columnsForBoard[key], [value.newValue]);
            })
        })

    })

    _.each(model.classesOfService, function(classOfService) {
        classOfService.columnNames = model.columnsForBoard[classOfService.board].sort();


        var closedDates = _.map(classOfService.itemsClosed, function(itemId) {
            return(model.itemInfo[itemId]['closedDate']);
        });
        classOfService.minDate = _.reduce(closedDates, function(memo, closedDate) {
            if(closedDate === undefined || closedDate == null)
                return memo;
            if(closedDate < memo)
                return closedDate;
            return memo;
        });
        classOfService.maxDate = _.reduce(closedDates, function(memo, closedDate) {
            if(closedDate === undefined || closedDate == null)
                return memo;
            if(closedDate > memo)
                return closedDate;
            return memo;
        });

    })

    callbackWhenDone(null);
}


function persist(model, callbackWhenDone) {

    async.parallel([
        function(cbWhenFileSaved) {
            fs.writeFile(config.modelStorageFile, JSON.stringify(model), cbWhenFileSaved);
        },
        function(cbWhenDatabaseUpdated) {
            kanbanModel.replace(model, cbWhenDatabaseUpdated);
        }
    ], callbackWhenDone);

}

function load() {
    return JSON.parse(fs.readFileSync(config.modelStorageFile, 'utf8'));
}


function getHistoryForItems(model, callbackWhenDone) {
    model.computeAllItemsAndBoards();

    async.eachLimit(model.allItems, config.maxConcurrentRequests, function(id, callback) {
        getItemHistory(id, model.allBoards, function(err, history) {
            if(!err)
                model.itemHistory[id] = history;
            callback(err);
        })
    }, callbackWhenDone);
}

function getItemHistory(id, boards, callbackWithHistory) {
    // callback arguments: err, history

    var baseurl = config.url + "/_apis/wit/workitems/" + id + "/updates?api-version=1.0";
    // &$top=200&$skip=300



    var sizeOfLastPage = config.revisionsStep;
    var skip = 0;
    var fullHistory = [];

    async.whilst(function() {return sizeOfLastPage == config.revisionsStep},
    function(callback) {
        var options = {
            'url': baseurl + "&$top=" + config.revisionsStep + "&$skip=" + skip,
            'method': "GET",
            'json': true,
            'headers': {
                'Content-Type': 'application/json',
            },
            'credentials': config.credentials

        }

        fetchHistoryPage(options, boards, function(err, pageSize, history) {


            if(err) {
                log("error fetching history page " + skip + " for id " + id + ", " + options.url);
                return callback(err);
            }
            log("got history for " + id + ", page " + (skip / config.revisionsStep) + " with " + pageSize + " events " + " of which " + history.length + " were interesting")
            sizeOfLastPage = pageSize;
            skip += config.revisionsStep;
            fullHistory = fullHistory.concat(history);
            callback();
        })
    }, function(err) {
            if(err) {
                log("error fetching history for id " + id);
                return callbackWithHistory(true);
            }

            callbackWithHistory(null, fullHistory);
        });



}

function fetchHistoryPage(options, boards, callback) {
    webclient.rawRequest(options, function(error, response) {
        if (!error && response.statusCode == 200) {

            var responseObj = JSON.parse(response.body);
            var newRevisions = _.filter(responseObj.value, function(element) {
                if(!element.hasOwnProperty("fields"))
                    return false;
                for(var i=0; i<boards.length; i++)
                    if(element.fields.hasOwnProperty("WEF_" + boards[i] + "_Kanban.Column"))
                        return true;
                return false;
            }, this);

            var history = _.map(newRevisions, function(rev) {

                var revRecord = { };

                _.each(rev.fields, function(value, key) {
                    if(key == 'System.ChangedDate')
                        revRecord.changedDate = value.newValue;
                    else {
                        _.each(boards, function(board) {
                            if(key == "WEF_" + board + "_Kanban.Column") {
                                revRecord[board] = value;
                            }
                        }, this);
                    }
                }, this);

                return revRecord;
            }, this);

            callback(null, responseObj.value.length, history);
        }
        else {
            if(response)
                logRequestError("getItemHistory", response);
            else
                log("request error, but no response data: " + JSON.stringify(error))
            callback(true);
        }
    })
}



function getClassesOfService(model, callback) {
    log("getting classes of service...")

    ClassOfService.find().lean().exec(function(err, classesOfService) {
        if(err) return callback(err);
        model.classesOfService = classesOfService;
        model.additionalInfoFields = _.chain(model.classesOfService)
            .pluck('decoratorConfig')
            .pluck('fieldToUpdate')
            .uniq()
            .filter(function(val) {
                return val != null;
            })
            .value();
        return callback();
    })


    //fs.readFile(config.classesOfServiceFile, 'utf8', function(err, data) {
    //    if(err)
    //        return callback(err);
    //    var classesConfig = JSON.parse(data);
    //    model.classesOfService = classesConfig.classes;
    //    model.additionalInfoFields = classesConfig.additionalInfoFields;
    //    return callback(null);
    //
    //});

}

function getItemsForClasses(model, callbackWhenDone) {

    async.each(model.classesOfService, (function (classOfService, callbackCoS) {
        log("getting items for class " + classOfService.name);
        async.parallel([
          function(callback) {
              getItemsFromWIQL(classOfService.queryForAll, function(items, err) {
                  if(err) {
                      log("error getting all items for class: " + classOfService.name);
                      return callback(err);
                  }
                  classOfService.itemsAll = _.pluck(items, 'id');
                  callback();
              })
          },
          function(callback) {
              getItemsFromWIQL(classOfService.queryForClosed, function(items, err) {
                  if(err) {
                      log("error getting closed items for class: " + classOfService.name);
                      return callback(err);
                  }
                  classOfService.itemsClosed = _.pluck(items, 'id');
                  callback();
              })
          }
        ], callbackCoS);

    }), function(err) {
        if(err) {
            log("error getting items for classes");
            return callbackWhenDone(err);
        }
        callbackWhenDone();
    })
}


function getItemsFromWIQL(wiql, callback) {

    var body = {
        'query': wiql
    }

    var options = {
        'url': config.url + "/_apis/wit/wiql?api-version=1.0",
        'method': "POST",
        'body': JSON.stringify(body),
        'json': true,
        'headers': {
            'Content-Type': 'application/json',
        },
        'credentials': config.credentials

    }

    webclient.rawRequest(options, function(error, response) {
        if (!error && response.statusCode == 200) {
            callback(JSON.parse(response.body).workItems);
        }
        else {
            logRequestError("getItemsFromWIQL", response);
            callback(null, error);
        }
    })

}

function log(str) {
    console.log(str);
}

function logRequestError(message, response) {
    if(response != null && response.statusCode != null)
        log("Error calling API (" + message + "). Response code " + response.statusCode);
    else
        log("Error calling API (" + message + "). Response: " + JSON.stringify(response));
}