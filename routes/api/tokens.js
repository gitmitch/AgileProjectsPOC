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

var  router = require('express').Router();
var ActiveDirectory = require('activedirectory');
var User = require('../../db/user.js');
var jwt = require('jsonwebtoken');


router.get('/tokens', function(req, res, next) {
    res.render('token');
})

router.post("/tokens", function(req, res, next) {
    var options = wwwConfig.ActiveDirectoryConfig[req.body.domain];

    var ad = new ActiveDirectory(options);
    var username = req.body.username + '@' + req.body.domain,
        password = req.body.password;



    ad.authenticate(username, password, function(err, auth) {
        if(err) {
            res.status(500).json(err);
            return;
        }

        if(auth) {
            User.findOne({username: username})
                .exec(function(err, user) {
                    if(err) return next(err);
                    if(!user) {
                        user = new User({username: username});
                        user.isAdmin = (username == wwwConfig.initialAdmin);
                        user.isManager = (username == wwwConfig.initialAdmin);
                        user.save();
                    }
                    else if(user.username == wwwConfig.initialAdmin
                            && (!user.isAdmin || !user.isManager)) {
                        user.isAdmin = true;
                        user.isManager = true;
                        user.save();
                    }


                    var token = jwt.sign({ username: username }, wwwConfig.jwtSecret, {expiresIn: wwwConfig.jwtExpirationSeconds});
                    res.status(200).json({user: user, token: token});
                });

        }
        else {
            res.status(401).json({message: "invalid credentials"});
        }
    })
})


module.exports = router;