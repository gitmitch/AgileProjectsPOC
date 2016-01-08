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

var router = require('express').Router();
var _ = require('underscore');
var User = require('../../db/user');
var ClassOfService = require('../../db/classOfService');
var webclient = require('../../modules/webclient');
var async = require('async');
var fs = require('fs');
var tokenFuncs = require('./tokenFuncs');

router.use(tokenFuncs.managerRequired);

router.get('/', function(req, res, next) {
    ClassOfService.find()
        .sort('name')
        .exec(function(err, classesOfService) {
            if(err) return next(err);
            res.json(classesOfService);
        })
});

router.get('/template', function(req, res, next) {
    var template = new ClassOfService();
    res.json(template);
});

var errorHandler = function(err) {
    if(err.name == 'ValidationError')
        return _.chain(err.errors).values().pluck('message').value().join(' ');
    else
        return err.message;

}

router.post('/:_id', function(req, res, next) {
    var newDocument = new ClassOfService(req.body);
    newDocument.save(function (err, doc) {
        if(err)
            res.status(400).json({'error': errorHandler(err)});
        else
            res.status(201).json(doc);
    })
})

router.put('/:_id', function(req, res, next) {

    ClassOfService.findById(req.params._id, function(err, classOfService) {
        if(err) return next(err);
        classOfService.set(req.body);
        classOfService.save(function (err, doc) {
            if(err)
                res.status(400).json({'error': errorHandler(err)});
            else
                res.status(200).json(doc);
        })
    })

})

router.delete('/:_id', function(req, res, next) {
    ClassOfService.findByIdAndRemove(req.params._id, {}, function(err) {
        if(err) return next(err);
        res.status(200).end();
    });
})

router.get('/:_id/columns', function(req, res, next) {
    webclient.loadCredentialsOnce(wwwConfig.tfsCredentialsFile);
    var options = webclient.getSavedOptionsCopy();

    var classOfService;

    async.waterfall([
        function(stepDone) {
            // get the class of service
            ClassOfService.findById(req.params._id, stepDone);
        },
        function(classOfServiceFromDb, stepDone) {
            // ask TFS for the list of columns on this board
            if(classOfServiceFromDb == null)
                return stepDone(new Error('class of service not found'));
            // todo: call the callback on the nexttick like the error below

            if(classOfServiceFromDb.apiURL.boardColumns == null)
                return process.nextTick(stepDone.bind(null, new Error('class of service doesnt have a board URL')));

            classOfService = classOfServiceFromDb;
            options.url = classOfService.apiURL.boardColumns;
            webclient.jsonBody(options, stepDone);
        }],
        function(err, tfsResult) {
            if(err) return next(err);

            // todo: provide some better error responses

            var tfsColumns = _.pluck(tfsResult.value, 'name');
            var modelColumns = JSON.parse(fs.readFileSync(wwwConfig.modelStorageFile, 'utf8'))
                .columnsForBoard[classOfService.board];

            var returnColumns;

            if(modelColumns == null)
                returnColumns = tfsColumns;
            else
                returnColumns = _.union(tfsColumns, modelColumns);

            res.status(200).json(returnColumns.sort());
        }
    );

})

module.exports = router;