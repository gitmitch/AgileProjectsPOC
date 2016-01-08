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


function repeat(repeatMe, numberOfTimes) {
    var a = [];
    for(var i=0; i<numberOfTimes; i++)
        a.push(repeatMe);
    return a;
}

app.filter('keylength', function () {
    // http://stackoverflow.com/questions/25299436/unable-to-call-object-keys-in-angularjs

    return function (input) {
        if (!angular.isObject(input)) {
            throw Error("Usage of non-objects with keylength filter!!")
        }
        return Object.keys(input).length;
    }
});

app.directive('onReadFile', function ($parse) {
    // http://jsfiddle.net/alexsuch/6aG4x/
    return {
        restrict: 'A',
        scope: false,
        link: function(scope, element, attrs) {
            var fn = $parse(attrs.onReadFile);

            element.on('change', function(onChangeEvent) {
                var reader = new FileReader();

                reader.onload = function(onLoadEvent) {
                    scope.$apply(function() {
                        fn(scope, {$fileContent:onLoadEvent.target.result});
                    });
                };

                var src = (onChangeEvent.srcElement || onChangeEvent.target);

                var files = src.files;
                if(files.length > 0)
                    reader.readAsText(files[0]);
                src.value = null;
            });
        }
    };
});

Date.prototype.addDays = function(days)
{
    // http://stackoverflow.com/questions/563406/add-days-to-datetime
    var dat = new Date(this.valueOf());
    dat.setDate(dat.getDate() + days);
    return dat;
}


function padInt(value, digits) {
    var str = value + "";
    while(str.length < digits) {
        str = "0" + str;
    }
    return str;
}

function getWeekOfString(date, dowStart) {
    var startDay = date;
    var endDay = date.addDays(7);
    while(startDay.getDay() != dowStart) {
        startDay = startDay.addDays(-1);
        endDay = endDay.addDays(-1);
    }
    return (startDay.getFullYear() + "-" + padInt(startDay.getMonth()+1, 2) + "-" + padInt(startDay.getDate(), 2) + " to "
    + endDay.getFullYear() + "-" + padInt(endDay.getMonth()+1, 2) + "-" + padInt(endDay.getDate(), 2));
}

function minAnything(array) {
    return _.reduce(array, function(memo, value) {
        if(memo < value)
            return memo;
        return value;
    });
}


function maxAnything(array) {
    return _.reduce(array, function(memo, value) {
        if(memo > value)
            return memo;
        return value;
    });
}

function justTheDate(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function changeValuesAfter(array, ndx, change) {
    var curNdx = ndx;
    while(curNdx < array.length) {
        array[curNdx] += change;
        curNdx++;
    }
}

app.controller("kanbanCtrl", ['$scope', 'SavedKanbanReport', '$uibModal', function ($scope, SavedKanbanReport, $uibModal) {


    // $scope.kanbanModel - directly from the model saved on the server, built by tfsextractor.js

    // $scope.params.reportableClasses - list of classes of service in the UI, includes:
    // className
    // board
    // minDate (string via toLocaleDateString)
    // maxDate (string via toLocaleDateString)
    // selected

    // $scope.params.columnSelections - array of classes of service that the user has checked, with a list of all available columns, and columns the user has checked



    function init() {



        $scope.kanbanModel = kanbanModel;
        $scope.configFromServer = configFromServer;
        $scope.params = {};
        $scope.params.reportableClasses = [];
        $scope.params.columnSelections = [];

        _.each($scope.kanbanModel.classesOfService, function(classOfService) {
            $scope.params.reportableClasses.push({
                className: classOfService.name,
                board: classOfService.board,
                minDisplayDate: new Date(classOfService.minDate).toLocaleDateString(),
                maxDisplayDate: new Date(classOfService.maxDate).toLocaleDateString(),
                minDate: new Date(classOfService.minDate),
                maxDate: new Date(classOfService.maxDate),
                selected: false,
                minReportDate: new Date(classOfService.minDate),
                maxReportDate: new Date(classOfService.maxDate)
            })
        })



        $scope.enableReport = false;
        $scope.gridStatus = {
            active: false
        };

    }

    init();

    $scope.showSaveModal = function(report) {
        return $uibModal.open({
            templateUrl: '/partials/editKanbanReport',
            controller: 'editKanbanReportModalInstanceCtrl',
            resolve: {
                reportToEdit: function () {
                    return report;
                }
            }
        }).result;
    }

    $scope.showLoadModal = function() {
        return $uibModal.open({
            templateUrl: '/partials/pickKanbanReport',
            controller: 'pickKanbanReportModalInstanceCtrl',
            resolve: {
                user: function () {
                    return $scope.user;
                }
            }
        }).result;
    }

    $scope.saveConfig = function() {

        var newReport = new SavedKanbanReport();
        newReport.payloadJSON = JSON.stringify({
            reportableClasses: $scope.params.reportableClasses,
            columnSelections: $scope.params.columnSelections
        });
        newReport.username = $scope.user.username;
        if($scope.savedReport != null) {
            newReport.name = $scope.savedReport.name;
            newReport.isShared = $scope.savedReport.isShared;
        }
        $scope.showSaveModal(newReport).then(function(savedReport) {
            $scope.savedReport = savedReport;
        });

    }

    var reportLoader = function(payload) {
        _.each($scope.params.reportableClasses, function(classOfService, classNdx) {
            var savedClass = _.find(payload.reportableClasses, function(searchClass) {
                return searchClass.className == classOfService.className
                    && searchClass.board == classOfService.board
                    && searchClass.selected;
            });
            if(savedClass !== undefined) {
                if(!classOfService.selected) {
                    classOfService.selected = true;
                    addClassSelection(classNdx);
                    classOfService.minReportDate = new Date(savedClass.minReportDate);
                    classOfService.maxReportDate = new Date(savedClass.maxReportDate);
                }
            } else {
                if(classOfService.selected) {
                    classOfService.selected = false;
                    removeClassSelection(classNdx);
                }
            }
        })

        validateReportDates();

        _.each($scope.params.columnSelections, function(selection, selectionNdx) {
            var selectionFromPayload = _.find(payload.columnSelections, function(searchSelection) {
                return searchSelection.className == selection.className
                    && searchSelection.board == selection.board;
            });

            if(selectionFromPayload !== undefined) {
                selection.selectedColumnNames = _.filter(selectionFromPayload.selectedColumnNames, function(columnFromPayload) {
                    return _.contains(selection.possibleColumnNames, columnFromPayload);
                });
            } else {
                selection.selectedColumnNames = [];
            }
        })
    }

    $scope.loadConfig = function() {
        $scope.enableReport = false;

        $scope.showLoadModal().then(function(reportToLoad) {
            $scope.savedReport = reportToLoad;
            reportLoader(JSON.parse(reportToLoad.payloadJSON));
        })

    }

    function validateReportDates() {
        _.each($scope.params.reportableClasses, function(classOfService) {
            if(classOfService.minReportDate == null || classOfService.minReportDate < classOfService.minDate)
                classOfService.minReportDate = classOfService.minDate;
            if(classOfService.maxReportDate == null || classOfService.maxReportDate > classOfService.maxDate)
                classOfService.maxReportDate = classOfService.maxDate;

        });
    }

    $scope.changeClassSelection = function(classNdx, oldValue) {
        if(oldValue == 'false') {
            // added a class
            addClassSelection(classNdx);
        }
        else {
            // removed a class
            removeClassSelection(classNdx);
        }
    }

    function addClassSelection(classNdx) {
        $scope.params.columnSelections.push({
            className: $scope.params.reportableClasses[classNdx].className,
            board: $scope.kanbanModel.classesOfService[classNdx].board,
            selectedColumnNames: [],
            possibleColumnNames: $scope.kanbanModel.classesOfService[classNdx].columnNames
        })
        $scope.params.reportableClasses[classNdx].selected = true;
    }

    function removeClassSelection(classNdx) {
        $scope.params.columnSelections.splice(_.findIndex($scope.params.columnSelections, function(item) {
            return item.className == $scope.params.reportableClasses[classNdx].className;
        }), 1);
        $scope.params.reportableClasses[classNdx].selected = false;
    }

    $scope.selectAllColumns = function(classNdx) {
        $scope.params.columnSelections[classNdx].selectedColumnNames = $scope.params.columnSelections[classNdx].possibleColumnNames.slice();
    }

    $scope.selectNoneColumns = function(classNdx) {
        $scope.params.columnSelections[classNdx].selectedColumnNames = [];
    }


    $scope.runReport = function() {
        validateReportDates();




        $scope.reports = {};
        $scope.reports.cycleTimesPerClass_Item = {};


        $scope.reports.cycleTimes = [];
        $scope.reports.bottlenecks = [];
        $scope.reports.wipCharts = [];

        var ctHistoCats = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, ">20"];
        var ctHistoColumns = [];

        var throughputSeries = [];


        // setup WIP chart parameters
        var startWipChart = justTheDate(minAnything(_.pluck(_.filter($scope.params.reportableClasses, function(c) {
            return c.selected;
        }), 'minReportDate')));
        var endWipChart = justTheDate(maxAnything(_.pluck(_.filter($scope.params.reportableClasses, function(c) {
            return c.selected;
        }), 'maxReportDate')));


        $scope.reports.cycleTimeGrid = {
            enableFiltering: true,
            data: [],
            columnDefs: [
                {
                    field: 'classOfService',
                    displayName: 'Class Of Service'
                },
                {
                    field: 'itemID',
                    displayName: 'Item ID'
                },
                {
                    field: 'cycleTime',
                    displayName: 'cycleTime'
                }

            ]
        };


        _.each($scope.kanbanModel.classesOfService, function(classOfService, ndx) {
            if($scope.params.reportableClasses[ndx].selected) {
                var board = classOfService.board;
                var className = classOfService.name;
                var columns = getColumnsForClass(className);
                var reportClassNdx = $scope.reports.cycleTimes.length;

                // get total cycle time for each item

                var ctHistoCounts = repeat(0, ctHistoCats.length);

                var throughputByWeek = {};

                var closedItemFilterFrom = justTheDate(new Date($scope.params.reportableClasses[ndx].minReportDate));
                var closedItemFilterTo = justTheDate(new Date($scope.params.reportableClasses[ndx].maxReportDate)).addDays(1);

                var itemsClosed = _.filter(classOfService.itemsClosed, function(itemId) {
                    var itemClosedDate = new Date($scope.kanbanModel.itemInfo[itemId].closedDate);
                    return itemClosedDate >= closedItemFilterFrom && itemClosedDate < closedItemFilterTo;
                });

                $scope.reports.cycleTimesPerClass_Item[className] = [];
                _.each(itemsClosed, function(itemId) {
                    var cycleTime = computeCycleTimeForItem(itemId, board, columns);
                    $scope.reports.cycleTimesPerClass_Item[className].push({
                        id: itemId,
                        cycleTime: cycleTime
                    });

                    // should be counted in the bin that is less than or equal to the category value, but greater than the previous category value
                    // cycleTime is always an integer

                    var ctHistoBinNdx = Math.floor(cycleTime / 2.0);
                    var remainder = cycleTime % 2;
                    if(cycleTime <1) {
                        ctHistoBinNdx = 0;
                    }
                    else if(cycleTime > ctHistoCats[ctHistoCats.length-2]) {
                        ctHistoBinNdx = ctHistoCats.length - 1;
                    }
                    else if(remainder == 0) {
                        ctHistoBinNdx--;
                    }

                    ctHistoCounts[ctHistoBinNdx]++;


                    // add to throughput counters
                    if(!($scope.kanbanModel.itemInfo[itemId].closedDate == null)) {
                        var closedDate = new Date($scope.kanbanModel.itemInfo[itemId].closedDate);
                        var throughputKey = getWeekOfString(closedDate, $scope.configFromServer.dowStart);
                        if(throughputByWeek[throughputKey] == null)
                            throughputByWeek[throughputKey] = 0;
                        throughputByWeek[throughputKey]++;
                    }



                }); // end of each itemClosed


                // calculate WIP chart
                // start by initializing WIP counters
                var wipDates = [];
                var curWipDate = justTheDate(minAnything(_.map(classOfService.itemsAll, function(itemId) {
                    var minForThisItem = minAnything(_.map($scope.kanbanModel.itemHistory[itemId], function(revision) {
                        return new Date(revision.changedDate);
                    }));
                    if(minForThisItem == null)
                        return new Date();
                    return minForThisItem;
                })));

                while(curWipDate <= endWipChart) {
                    wipDates.push(curWipDate.valueOf());
                    curWipDate = curWipDate.addDays(1);
                }

                var wipColumnCounters = {};
                // keys will be column names
                // values will be array of # of items on each day
                _.each(columns, function(column) {
                    wipColumnCounters[column] = [];
                    _.each(wipDates, function(date) {
                        wipColumnCounters[column].push(0);
                    });
                });

                _.each(classOfService.itemsAll, function(itemId) {
                    _.each($scope.kanbanModel.itemHistory[itemId], function(revision) {
                        if(revision[board] != null) {
                            var revDate = justTheDate(new Date(revision.changedDate)).valueOf();
                            var dateNdx = _.indexOf(wipDates, revDate, true);
                            if(dateNdx != -1) {
                                if (revision[board].oldValue != null && _.contains(columns, revision[board].oldValue)) {
                                    changeValuesAfter(wipColumnCounters[revision[board].oldValue], dateNdx, -1);
                                }
                                if (revision[board].newValue != null && _.contains(columns, revision[board].newValue)) {
                                    changeValuesAfter(wipColumnCounters[revision[board].newValue], dateNdx, 1);
                                }
                            }
                        }
                    }) // end of each for revisions of an item
                }); // end of each for itemsAll

                var sliceAt = _.indexOf(wipDates, startWipChart.valueOf());
                if(sliceAt == -1)
                    sliceAt = 0;
                wipDates = wipDates.slice(sliceAt);

                var wipChartColumns = [['x'].concat(_.map(wipDates, function(datevalue) {
                    return new Date(datevalue);
                }))];
                var wipChartTypes = {};

                _.each(wipColumnCounters, function(counters, column) {
                    wipChartColumns.push([column].concat(counters.slice(sliceAt)));
                    wipChartTypes[column] = 'area-step';
                });



                $scope.reports.wipCharts.push({
                    className: className,
                    chartConfig: {
                        bindto: 'wipCharts_' + $scope.reports.wipCharts.length,
                        data: {
                            x: 'x',
                            columns: wipChartColumns,
                            types: wipChartTypes,
                            groups: [columns]
                        },
                        axis: {
                            x: {
                                type: 'timeseries',
                                tick: {
                                    format: '%Y-%m-%d'
                                }
                            },
                            y: {
                                label: {
                                    text: 'Number of Items In-Progress'
                                }
                            }
                        }
                    }
                });


                // get cycle time metrics
                $scope.reports.cycleTimesPerClass_Item[className] = _.sortBy($scope.reports.cycleTimesPerClass_Item[className], 'cycleTime');
                $scope.reports.cycleTimeGrid.data = $scope.reports.cycleTimeGrid.data.concat(_.map($scope.reports.cycleTimesPerClass_Item[className], function(item) {
                    return {
                        classOfService: className,
                        itemID: item.id,
                        cycleTime: item.cycleTime
                    }
                }));

                if($scope.reports.cycleTimesPerClass_Item[className].length > 0) {
                    $scope.reports.cycleTimes.push({
                        className: classOfService.name,
                        median: computePercentile($scope.reports.cycleTimesPerClass_Item[className], 0.5).cycleTime,
                        perc80: computePercentile($scope.reports.cycleTimesPerClass_Item[className], 0.8).cycleTime,
                        perc90: computePercentile($scope.reports.cycleTimesPerClass_Item[className], 0.9).cycleTime,
                        average: computeAverage($scope.reports.cycleTimesPerClass_Item[className], 'cycleTime').toFixed(1),
                        count: $scope.reports.cycleTimesPerClass_Item[className].length,
                        dateRange: closedItemFilterFrom.toLocaleDateString() + " - " + closedItemFilterTo.toLocaleDateString()
                    });
                }
                else {
                    $scope.reports.cycleTimes.push({
                        className: classOfService.name,
                        median: 'N/A',
                        perc80: 'N/A',
                        perc90: 'N/A',
                        average: 'N/A',
                        count: $scope.reports.cycleTimesPerClass_Item[className].length,
                        dateRange: closedItemFilterFrom.toLocaleDateString() + " - " + closedItemFilterTo.toLocaleDateString()
                    });
                }


                // get bottlenecks
                var bottlenecks = [];
                _.each(columns, function(column) {
                    bottlenecks.push({
                        columnName: column,
                        itemDays: _.reduce(_.map(itemsClosed, function(itemId) {
                            return getRawCycleTime(itemId, board, column);
                        }), function(memo, value) {
                            return memo + value;
                        })
                    })
                })

                bottlenecks = _.sortBy(bottlenecks, 'itemDays').reverse();

                var bottlenecksConfig = {
                    data: {
                        columns: [
                            ['item-days'].concat(_.pluck(bottlenecks, 'itemDays'))
                        ],
                        type: 'bar'
                    },
                    axis: {
                        x: {
                            type: 'category',
                            categories: _.pluck(bottlenecks, 'columnName')
                        },
                        y: {
                            label: {
                                text: 'item-days',
                                position: 'outer-middle'
                            }
                        },
                        rotated: true
                    },
                    legend: {
                        show: false
                    },
                    padding: {
                        bottom: 20
                    },
                    size: {
                        height: (bottlenecks.length + 4) * 45
                    },
                    bar: {
                        width: 45
                    }
                };
                $scope.reports.bottlenecks.push({
                    className: classOfService.name,
                    columns: bottlenecks,
                    chart: bottlenecksConfig
                });

                // get cycle time histogram data
                ctHistoColumns.push([className].concat(ctHistoCounts));

                var throughputKeys = _.keys(throughputByWeek).sort();
                var throughputValues = _.map(throughputKeys, function(key) {
                    return throughputByWeek[key];
                });
                throughputSeries.push({
                    className: classOfService.name,
                    throughputKeys: throughputKeys,
                    throughputValues: throughputValues
                });

            }
        }) // end of _.each for classes of service

        $scope.reports.ctHistoConfig = {
            bindto: '#ctHisto',
            data: {
                columns: ctHistoColumns,
                type: 'bar'
            },
            axis: {
                x: {
                    type: 'category',
                    categories: ctHistoCats,
                    label: {
                        text: 'Cycle Time',
                        position: 'outer-center'
                    }
                },
                y: {
                    label: {
                        text: 'Count',
                        position: 'outer-middle'
                    }
                },
            },
            legend: {
                position: 'right'
            },
            padding: {
                top: 40,
                bottom: 40
            }
        }

        $scope.reports.throughputSummaries = throughputSeries;

        var throughputX = ['x'];
        var throughputY = _.map(throughputSeries, function (series) {
            return [series.className];
        })

        var allThroughputKeys = _.union.apply(_, _.pluck(throughputSeries, 'throughputKeys')).sort();

        if(allThroughputKeys.length >= 2) {
            var isoDatePart = "xxxx-xx-xx";

            var minThroughputDateString = allThroughputKeys[0].substring(0, isoDatePart.length);
            var maxThroughputDateString = allThroughputKeys[allThroughputKeys.length - 1].substring(0, isoDatePart.length);

            var minYear = parseInt(minThroughputDateString.substring(0, 4));
            var minMonth = parseInt(minThroughputDateString.substring(5, 7)) - 1;
            var minDay = parseInt(minThroughputDateString.substring(8, 10));

            var minThroughputDate = new Date(minYear, minMonth, minDay);
            var maxThroughputDate = new Date(parseInt(maxThroughputDateString.substring(0, 4)), parseInt(maxThroughputDateString.substring(5, 7)) - 1, parseInt(maxThroughputDateString.substring(8, 10)));
            var curThroughputDate = minThroughputDate;

            while (curThroughputDate <= maxThroughputDate) {
                throughputX.push(curThroughputDate.addDays(6).toISOString().substring(0, isoDatePart.length));
                var curThroughputKey = getWeekOfString(curThroughputDate, configFromServer.dowStart);
                _.each(throughputSeries, function (series, seriesNdx) {
                    var keyNdx = _.indexOf(series.throughputKeys, curThroughputKey);
                    if (keyNdx == -1) {
                        throughputY[seriesNdx].push(0);
                    }
                    else {
                        throughputY[seriesNdx].push(series.throughputValues[keyNdx]);
                    }
                })
                curThroughputDate = curThroughputDate.addDays(7);
            }
        }

        $scope.reports.throughputConfig = {
            bindto: '#throughputChart',
            data: {
                x: 'x',
                columns: [throughputX].concat(throughputY)
            },
            axis: {
                x: {
                    type: 'timeseries',
                    tick: {
                        format: '%Y-%m-%d'
                    },
                    label: {
                        text: 'Week Ending'
                    }
                },
                y: {
                    label: {
                        text: 'Number of Items Closed'
                    }
                }
            }
        }

        $scope.enableReport = true;

    }




    function getRawCycleTime(id, board, column) {
        if($scope.kanbanModel.rawCycleTimes[id] == null || $scope.kanbanModel.rawCycleTimes[id][board] == null)
            return 0;

        var result = _.find($scope.kanbanModel.rawCycleTimes[id][board], function(record) {
            return record.columnName == column;
        });

        if(result === undefined)
            return 0;

        return result.bizDays;
    }

    function computePercentile(sortedArray, perc) {
        var ndx = Math.round(sortedArray.length * perc);
        if(ndx >= sortedArray.length)
            return sortedArray[sortedArray.length-1];
        return sortedArray[ndx];
    }

    function computeAverage(items, property) {
        return _.reduce(items, function(memo, item) {
                return memo + parseInt(item[property]);
            }, 0) / items.length;
    }


    function getColumnsForClass(className) {

        var columnSelection = _.find($scope.params.columnSelections, function(item) {
            return item.className == className;
        });

        return columnSelection.selectedColumnNames;

    }

    function computeCycleTimeForItem(id, board, columns) {


        var ct = 0;
        if($scope.kanbanModel.rawCycleTimes[id] == null || !$scope.kanbanModel.rawCycleTimes[id].hasOwnProperty(board))
            return ct;

        ct = _.reduce($scope.kanbanModel.rawCycleTimes[id][board], function(memo, column) {
            if(_.contains(columns, column.columnName))
                return memo + column.bizDays;
            return memo;
        }, ct);

        return ct;

    }




}]);