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

var async = require('async');


// ensures there is ever only one record in the database for this model
var replace = function(model, newPayload, callback) {

    async.waterfall([
        function(stepDone) {
            model.count({}, stepDone);
        },
        function(count, stepDone) {
            if(count>1)
                return model.remove({}, stepDone);
            process.nextTick(stepDone.bind(null, null, 0));
        },
        function(removed, stepDone) {
            model.findOne(stepDone);
        },
        function(currentModel, stepDone) {
            var modelToUpdate = currentModel;

            if(currentModel == null)
                modelToUpdate = new model();

            modelToUpdate.payload = newPayload;
            modelToUpdate.markModified('payload');
            modelToUpdate.save(callback);
            process.nextTick(stepDone);
        }
    ]);



}

module.exports = {
    replace: replace
}