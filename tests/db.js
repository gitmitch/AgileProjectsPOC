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

var assert = require('chai').assert;
var expect = require('chai').expect;

var fs = require('fs');
var path = require('path');


var kanbanModel = require('../db/kanbanModel.js');


describe('shared database-related functions', function() {
    it('generates a kanban model summary from a kanban model', function() {
        var kanbanModelPayload = JSON.parse(fs.readFileSync(path.join(__dirname, './testKanbanModel.json'), 'utf8'));
        var kanbanModelSummaryPayload = JSON.parse(fs.readFileSync(path.join(__dirname, './testKanbanModelSummary.json'), 'utf8'));

        expect(JSON.stringify(kanbanModel.generateKanbanModelSummary(kanbanModelPayload), null, 4)).to.equal(JSON.stringify(kanbanModelSummaryPayload, null, 4));
    });
})