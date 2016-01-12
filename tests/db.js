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
var path = require('path');
var async = require('async');

wwwConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '../../www.config.json'), 'utf8'));

var chai = require('chai');
var assert = chai.assert;
var expect = chai.expect;
var should = chai.should()


var kanbanModel = require('../db/kanbanModel.js');


var db = require('../db');
var sharedDbFuncs = require('../db/shared');

chai.config.includeStack = true;

describe('shared database-related functions', function() {
    before(function(done) {
        db.connect(wwwConfig.mongoConnection, function(err) {
            if(err) {
                console.log('failed to connect to database: ' + JSON.stringify(err));
                done(err);
            }
            console.log('mongodb connected');
            done();
        })
    });

    it('can ensure a given model has a single record in the database and can be updated', function(testDone) {
        var testReplaceSchema = db.Schema({
            updated: {type: Date, default: Date.now},
            payload: {}
        });
        var model = db.model('testReplaceSchema', testReplaceSchema);
        async.waterfall([
            function(stepDone) {
                model.remove({}, stepDone);
            },
            function(removed, stepDone) {
                model.count({}, stepDone);
            },
            function(count, stepDone) {
                count.should.be.equal(0);
                var newItem = new model({payload: {testVal: true}});
                newItem.save(stepDone);
            },
            function(savedItem, numAffected, stepDone) {
                expect(savedItem.payload.testVal).to.be.true;
                sharedDbFuncs.replace(model, {testVal: false}, stepDone);
            },
            function(savedItem, numAffected, stepDone) {
                expect(savedItem.payload.testVal).to.not.be.true;
                model.count({}, stepDone);
            },
            function(count, stepDone) {
                expect(count).to.be.equal(1);
                var anotherItem = new model({payload: {testVal: true}});
                anotherItem.save(stepDone);
            },
            function(savedItem, numAffected, stepDone) {
                expect(savedItem.payload.testVal).to.be.true;
                model.count({}, stepDone);
            },
            function(count, stepDone) {
                expect(count).to.be.equal(2);
                sharedDbFuncs.replace(model, {testVal: false}, stepDone);
            },
            function(savedItem, numAffected, stepDone) {
                expect(savedItem.payload.testVal).to.not.be.true;
                model.count({}, stepDone);
            },
            function(count, stepDone) {
                expect(count).to.be.equal(1);
                process.nextTick(stepDone);
            }
        ], function(err) {
            should.not.exist(err);
            testDone();
        })
    });

    it('generates a kanban model summary from a kanban model', function() {
        var kanbanModelPayload = JSON.parse(fs.readFileSync(path.join(__dirname, './testKanbanModel.json'), 'utf8'));
        var kanbanModelSummaryPayload = JSON.parse(fs.readFileSync(path.join(__dirname, './testKanbanModelSummary.json'), 'utf8'));

        expect(JSON.stringify(kanbanModel.generateKanbanModelSummary(kanbanModelPayload), null, 4)).to.equal(JSON.stringify(kanbanModelSummaryPayload, null, 4));
    });

})