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

var kanbanModelSchema = db.Schema({
    updated: {type: Date, default: Date.now},
    payload: {}
})

var model = db.model('kanbanModel', kanbanModelSchema);

var replace = function(newPayload, callback) {

    model.findOne(function(err, currentModel) {
        if(err) return callback(err);

        var modelToUpdate = currentModel;

        if(currentModel == null)
            modelToUpdate = new model();

        modelToUpdate.payload = newPayload;
        modelToUpdate.markModified('payload');
        modelToUpdate.save(callback);
    })

}

module.exports = {
    model: model,
    replace: replace
}