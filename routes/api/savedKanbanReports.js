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
var SavedKanbanReport = require('../../db/savedKanbanReport');
var tokenFuncs = require('./tokenFuncs');
var _ = require('underscore');


var errorHandler = function(err) {
    if(err.name == 'ValidationError')
        return _.chain(err.errors).values().pluck('message').value().join(' ');
    else
        return err.message;

}


router.get('/shared', function(req, res, next) {
    SavedKanbanReport.find({'isShared': true})
        .sort('name')
        .exec(function(err, reports) {
            if(err) return next(err);
            res.json(reports);
        })
});


router.use(tokenFuncs.tokenRequired);


router.get('/mine', function(req, res, next) {
    SavedKanbanReport.find({'username': req.jwtPayload.username})
        .sort('name')
        .exec(function(err, reports) {
            if(err) return next(err);
            res.json(reports);
        })
});

router.post('/', function(req, res, next) {
    // find and delete any existing reports by this user with the same name, and save this one

    var newReport = new SavedKanbanReport(req.body);
    newReport.save(function(err, savedReport) {
        if(err) return res.status(400).json({'error': errorHandler(err)});
        SavedKanbanReport.find()
            .where('_id').ne(savedReport._id)
            .and([
                {'username': req.jwtPayload.username},
                {'name': req.body.name}
            ]).remove()
            .exec(function(err, count) {
                if(err) return next(err);
                res.status(201).json(savedReport);
            })

    })

});

// todo: add a check in the delete function against the JWT token so users can only delete their own reports.

router.delete('/:_id', function(req, res, next) {
    SavedKanbanReport.findByIdAndRemove(req.params._id, {}, function(err) {
        if(err) return next(err);
        res.status(200).end();
    });
});


module.exports = router;