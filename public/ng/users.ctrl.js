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

app.controller("usersCtrl", ['$scope', '$uibModal', 'User', function ($scope, $uibModal, User) {




    $scope.refreshList = function() {
        $scope.users = User.query(function success(users) {}, function failure(response) {
            if(response.status == 401)
                $scope.errorMessage = "You are not authorized. Are you logged-in? If so, your account probably isn't authorized to manage users.";
            else
                $scope.errorMessage = response.data.message || JSON.stringify(response);
        });
    }
    $scope.refreshList();

    $scope.showEditModal = function(user) {
        return $uibModal.open({
            templateUrl: '/partials/editUser',
            controller: 'editUserModalInstanceCtrl',
            resolve: {
                user: function () {
                    return user;
                }
            }
        }).result;
    }

    $scope.edit = function(user) {
        $scope.showEditModal(user).then(function(action) {
            var resourcePromise = null;
            if(action === 'delete')
                resourcePromise = user.$delete();
            else
                resourcePromise = User.update(action).$promise;
            resourcePromise.then(function() { $scope.refreshList() } );;
        });
    };

    $scope.createUser = function() {
        User.template(function(template) {
            $scope.showEditModal(template).then(function(action) {
                if(action !== 'delete') {
                    template.$save().then(function() { $scope.refreshList(); });
                }
            });
        });


    }


}]);

app.controller('editUserModalInstanceCtrl', function($scope, $uibModalInstance, user) {
    $scope.user = angular.copy(user);
    $scope.save = function() {
        $uibModalInstance.close($scope.user);
    };

    $scope.cancel = function() {
        $uibModalInstance.dismiss('cancel');
    };

    $scope.delete = function() {
        $uibModalInstance.close('delete');
    }
});

app.controller('userLoginCtrl', ['$scope', 'TokenService', '$location', function ($scope, TokenService, $location) {

    $scope.errorMessage = null;
    $scope.pleaseWait = false;

    $scope.domains = configFromServer.baseDNs;
    $scope.selectedDomain = $scope.domains[0];

    $scope.login = function() {
        $scope.errorMessage = null;
        $scope.pleaseWait = true;
        var username = $scope.username
        TokenService.login($scope.username, $scope.password, $scope.selectedDomain)
            .then(function(result) {
                if(result) {
                    $scope.$emit('login', result);
                    $location.path("/");
                }
                else {
                    $scope.errorMessage = "Authentication Failed";
                    $scope.pleaseWait = false;
                }
            })
    }



}]);