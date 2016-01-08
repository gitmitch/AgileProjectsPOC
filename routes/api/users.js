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
var User = require('../../db/user');
var tokenFuncs = require('./tokenFuncs');

router.use(tokenFuncs.adminRequired);

router.get('/', function(req, res, next) {
    User.find()
        .sort('username')
        .exec(function(err, users) {
            if(err) return next(err);
            res.json(users);
        })
});

router.get('/template', function(req, res, next) {
    var template = new User();
    res.json(template);
});

router.post('/:_id', function(req, res, next) {
    var newUser = new User(req.body);
    newUser.save(function (err, user) {
        if(err) return next(err);
        res.status(201).json(user);
    })
})

router.put('/:_id', function(req, res, next) {
    User.findByIdAndUpdate(req.params._id, req.body, { 'new': true }, function(err, updatedUser) {
        if(err) return next(err);
        res.status(200).json(updatedUser);
    });
})

router.delete('/:_id', function(req, res, next) {
    User.findByIdAndRemove(req.params._id, {}, function(err) {
        if(err) return next(err);
        res.status(200).end();
    });
})

module.exports = router;