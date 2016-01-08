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

app.controller('pickKanbanReportModalInstanceCtrl', ['$scope', '$uibModalInstance', 'SavedKanbanReport', 'user', function($scope, $uibModalInstance, SavedKanbanReport, user) {

    $scope.user = user;

    var refreshReports = function() {
        $scope.sharedReports = [];
        SavedKanbanReport.getShared().$promise.then(function(reports) {
            $scope.sharedReports = reports;
        });

        $scope.myReports = [];

        SavedKanbanReport.getMine().$promise.then(function(reports) {
            $scope.myReports = reports;
            $scope.sharedReports = _.filter($scope.sharedReports, function(sharedReport) {
                return _.findWhere($scope.myReports, {_id: sharedReport._id}) === undefined;
            });
        })


    }

    refreshReports();

    $scope.errorMessage = null;

    $scope.loadReport = function(report) {
        $uibModalInstance.close(report);
    }


    $scope.cancel = function() {
        $uibModalInstance.dismiss('cancel');
    };

    $scope.deleteReport = function(report) {
        report.$delete().then(function() {
            refreshReports();
        });
    };

}]);