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

app.controller('editKanbanReportModalInstanceCtrl', ['$scope', '$uibModalInstance', 'SavedKanbanReport', 'reportToEdit', function($scope, $uibModalInstance, SavedKanbanReport, reportToEdit) {

    $scope.report = angular.copy(reportToEdit);
    $scope.report.version = 1; // here is where we would handle upgrading to newer versions of the schema, i think. don't have to worry about it now

    $scope.errorMessage = null;


    var success = function (updatedReport) {
            $uibModalInstance.close(updatedReport);
        },
        failure = function(response) {
            if(response.status == 400 && response.data.error != null)
                $scope.errorMessage = response.data.error;
            else
                $scope.errorMessage = "Error from the server. Sorry, this looks like a bug. ( " + response.status + ").";
        };

    $scope.save = function() {
        $scope.report.$save().then(success, failure);
    };

    $scope.cancel = function() {
        $uibModalInstance.dismiss('cancel');
    };

    $scope.delete = function() {
        $scope.report.$delete().then(success, failure);
    }
}]);