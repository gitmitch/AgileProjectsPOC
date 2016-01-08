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

var app = angular.module('kanbanApp', ['angular-c3-simple', 'ui.bootstrap', 'ngAnimate', 'ui.grid', 'ngSanitize', 'ngCsv', 'ngRoute', 'ngResource', 'checklist-model']);

app.service('TokenService', function($http) {
    var svc = this;
    svc.login = function(username, password, domain) {
        return $http.post('/api/tokens', {
            username: username,
            password: password,
            domain: domain
        }).then(function(response) {
            // success
            svc.token = response.data.token;
            $http.defaults.headers.common['X-Auth'] = svc.token;
            return response.data.user;
        }, function(response) {
            // failure
            console.log('failed authentication: (' + response.status + "): " + JSON.stringify(response.data));
            return false;
        })
    }


})

app.factory('User', function($resource) {
    return $resource('/api/users/:_id', {_id: '@_id'}, {
        template: {
            method: 'GET',
            url: '/api/users/template'
        },
        update: {
            method: 'PUT'
        }
    });
});

app.factory('SavedKanbanReport', function($resource) {
    return $resource('/api/savedKanbanReports/:_id', {_id: '@_id'}, {
        getShared: {
            action: 'getShared',
            method: 'GET',
            url: '/api/savedKanbanReports/shared',
            isArray: true
        },
        getMine: {
            action: 'getMine',
            method: 'GET',
            url: '/api/savedKanbanReports/mine',
            isArray: true
        },
    });
});



app.factory('ClassOfService', function($resource) {
    return $resource('/api/classesOfService/:_id', {_id: '@_id'}, {
        template: {
            method: 'GET',
            url: '/api/classesOfService/template'
        },
        update: {
            method: 'PUT'
        },
        columns: {
            method: 'GET',
            action: 'columns',
            url: '/api/classesOfService/:_id/columns',
            isArray: true
        }
    });
});

app.config(function($routeProvider) {
    $routeProvider
        .when('/', {controller: 'kanbanCtrl', templateUrl: '/partials/kanban'})
        .when('/users', {controller: 'usersCtrl', templateUrl: '/partials/users'})
        .when('/users/login', {controller: 'userLoginCtrl', templateUrl: '/partials/login'})
        .when('/configure', {controller: 'configureCtrl', templateUrl: '/partials/configure'})
});

app.controller('AppCtrl', function($scope) {
    var init = function() {


        logout();
    }

    var logout = function() {
        $scope.user = {};
        $scope.isLoggedIn = false;
        $scope.loggedInUsername = "Not logged in";
    }

    $scope.$on('login', function(skip, user) {
        $scope.isLoggedIn = true;
        $scope.user = user;

    })

    init();
})