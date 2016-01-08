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

app.controller("configureCtrl", ['$scope', '$uibModal', 'ClassOfService', function ($scope, $uibModal, ClassOfService) {

    $scope.refreshList = function() {
        $scope.classesOfService = ClassOfService.query(function success(classesOfService) {}, function failure(response) {
            if(response.status == 401)
                $scope.errorMessage = "You are not authorized. Are you logged-in? If so, your account probably isn't authorized to manage classesOfService.";
            else
                $scope.errorMessage = response.data.message || JSON.stringify(response);
        });
    }
    $scope.refreshList();

    $scope.showEditModal = function(classOfService, isNew) {
        return $uibModal.open({
            templateUrl: '/partials/editClassOfService',
            controller: 'editClassOfServiceModalInstanceCtrl',
            resolve: {
                classToEdit: function () {
                    return classOfService;
                },
                isNew: isNew
            }
        }).result;
    }

    $scope.edit = function(classOfService) {
        $scope.showEditModal(classOfService, false).then($scope.refreshList);
    };

    $scope.createClassOfService = function() {
        ClassOfService.template(function(template) {
            $scope.showEditModal(template, true).then($scope.refreshList);
        });


    }
}]);

app.controller('editClassOfServiceModalInstanceCtrl', ['$scope', '$uibModalInstance', 'ClassOfService', 'classToEdit', 'isNew', function($scope, $uibModalInstance, ClassOfService, classToEdit, isNew) {

    $scope.classOfService = angular.copy(classToEdit);

    $scope.isNew = isNew;
    $scope.errorMessage = null;

    $scope.possibleColumns = $scope.classOfService.decoratorConfig.columnsToInclude.slice();

    ClassOfService.columns({_id: $scope.classOfService._id}).$promise.then(function(columns) {
        $scope.possibleColumns = columns;
    });



    $scope.selectAllColumns = function() {
        $scope.classOfService.decoratorConfig.columnsToInclude = $scope.possibleColumns.slice();
    };

    $scope.selectNoColumns = function() {
        $scope.classOfService.decoratorConfig.columnsToInclude = [];
    }

    var success = function (updatedClass) {
            $uibModalInstance.close(updatedClass);
        },
        failure = function(response) {
            if(response.status == 400 && response.data.error != null)
                $scope.errorMessage = response.data.error;
            else
                $scope.errorMessage = "Error from the server. Sorry, this looks like a bug. ( " + response.status + ").";
        };

    $scope.save = function() {

        if(isNew)
            $scope.classOfService.$save().then(success, failure);
        else
            ClassOfService.update($scope.classOfService).$promise.then(success, failure);
    };

    $scope.cancel = function() {
        $uibModalInstance.dismiss('cancel');
    };

    $scope.delete = function() {
        $scope.classOfService.$delete().then(success, failure);
    }
}]);