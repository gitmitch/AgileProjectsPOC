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


var db = require('./index.js');
var shared = require('./shared.js');
var _ = require('underscore');

var kanbanModelSchema = db.Schema({
    updated: {type: Date, default: Date.now},
    payload: {}
})

var model = db.model('kanbanModel', kanbanModelSchema);

var replace = function(newPayload, callback) {
    shared.replace(model, newPayload, callback);
}

var generateKanbanModelSummary = function(payload) {
    return {
        classesOfService: _(payload.classesOfService).map(function(classOfService) {
            return {
                name: classOfService.name,
                queryForClosed: classOfService.queryForClosed,
                queryForAll: classOfService.queryForAll,
                board: classOfService.board,
                columnNames: classOfService.columnNames,
                minDate: classOfService.minDate,
                maxDate: classOfService.maxDate
            };
        }),
        allBoards: payload.allBoards,
        columnsForBoard: payload.columnsForBoard
    };

}

module.exports = {
    model: model,
    replace: replace,
    generateKanbanModelSummary: generateKanbanModelSummary
}