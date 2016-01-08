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

var classOfServiceSchema = db.Schema({
    name: {type: String, required: true},
    queryForClosed: {type: String, required: true},
    queryForAll: {type: String, required: true},
    board: {type: String, required: true},
    boardURL: {type: String},
    decorateTFS: {type: Boolean, default: false},
    decoratorConfig: {
        fieldToUpdate: {type: String},
        columnsToInclude: [String]
    }
})

classOfServiceSchema.virtual('apiURL.prefix').get(function () {
    if(this.boardURL == null)
        return null;
    if(this.boardURL.substr(this.boardURL.length - '/_backlogs/board/Stories'.length) == '/_backlogs/board/Stories')
        return this.boardURL.substring(0, this.boardURL.length - '/_backlogs/board/Stories'.length) + '/_apis';
    else
        return this.boardURL.substring(0, this.boardURL.length - '/_backlogs/board'.length) + '/_apis';

    // todo: obviously, this is not very resilient to errors
});

classOfServiceSchema.virtual('apiURL.boardColumns').get(function () {
    if(this.apiURL.prefix == null)
       return null;
    return this.apiURL.prefix + '/work/boards/Stories/columns?api-version=2.0-preview';
});

classOfServiceSchema.pre('save', function(next) {
    var err;
    var messages = [];

    this.name = this.name.trim();
    this.queryForClosed = this.queryForClosed.trim();
    this.queryForAll = this.queryForAll.trim();
    this.board = this.board.trim();

    if(messages.length > 0)
        err = new Error(messages.join(" "));

    next(err);
})

module.exports = db.model('classOfService', classOfServiceSchema);