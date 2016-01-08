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

var User = require('../../db/user');
var jwt = require('jsonwebtoken');



var tokenRequired = function(req, res, next) {
    var token = req.headers['x-auth'];
    if(token) {
        jwt.verify(token, wwwConfig.jwtSecret, function(err, payload) {
            if(err) return res.status(401).json({message: 'JWT token verification failed'});
            req.jwtPayload = payload;
            next();
        });
    } else {
        return res.status(401).json({message: 'JWT token not found in the X-Auth header'});
    }
};

var adminRequired = function(req, res, next) {
    tokenRequired(req, res, function() {
        User.findOne({'username': req.jwtPayload.username}, function(err, user) {
            if(err) return next(err);
            if(!user.isAdmin) res.status(401).json({message: 'User is not an admin'});
            else next();
        });
    })

};

var managerRequired = function(req, res, next) {
    tokenRequired(req, res, function() {
        User.findOne({'username': req.jwtPayload.username}, function(err, user) {
            if(err) return next(err);
            if(!user.isManager) res.status(401).json({message: 'User is not a manager'});
            else next();
        });
    })

};



module.exports = {
    tokenRequired: tokenRequired,
    adminRequired: adminRequired,
    managerRequired: managerRequired
}