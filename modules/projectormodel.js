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

function Model() {
    this.classesOfService = [];
    this.allItems = [];
    this.allBoards = [];
    this.itemHistory = {};


    this.computeAllItemsAndBoards = function() {
        this.allItems = [];
        this.allBoards = [];
        _.each(this.classesOfService, function(classOfService) {
            this.allBoards = _.union(this.allBoards, [classOfService.board]);
            //this.allItems = _.union(this.allItems, _.map(classOfService.items, function(item) {
            //    return item.id;
            //}));
            this.allItems = _.union(this.allItems, classOfService.itemsAll, classOfService.itemsClosed);
        }, this)

    }


}

loadFromFile = function(fileName) {
    return JSON.parse(fs.readFileSync(fileName, 'utf8'));
}

module.exports = {
    Model: Model,
    loadFromFile: loadFromFile
}