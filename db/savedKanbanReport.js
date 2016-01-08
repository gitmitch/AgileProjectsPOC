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

var savedKanbanReportSchema = db.Schema({
    name: {type: String, required: true},
    version: {type: Number, required: true},
    payloadJSON: {type: String, required: true},
    isShared: {type: Boolean, required: true, default: false},
    username: {type: String, required: true}
})

savedKanbanReportSchema.virtual('payload').get(function () {
    return JSON.parse(this.payload);
});

savedKanbanReportSchema.virtual('payload').set(function (payloadObject) {
    this.payloadJSON = JSON.stringify(payloadObject);
});


savedKanbanReportSchema.pre('save', function(next) {
    this.name = this.name.trim();
    next();
})

module.exports = db.model('savedKanbanReport', savedKanbanReportSchema);