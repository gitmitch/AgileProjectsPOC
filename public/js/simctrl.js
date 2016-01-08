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

var app = angular.module('simApp', ['angular-c3-simple', 'ui.bootstrap', 'ngAnimate', 'ui.grid', 'ngSanitize', 'ngCsv', 'ngHandsontable']);


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

function repeat(repeatMe, numberOfTimes) {
  var a = [];
  for(var i=0; i<numberOfTimes; i++)
    a.push(repeatMe);
  return a;
}

function stripBlankObjects(objs) {
  return _.filter(objs, function(obj) {
    if(obj == null)
      return false;
    if(_.filter(_.values(obj), function(val) {
          return(!(val == null || val == ""))
        }).length == 0)
      return false;
    return true;
  });
}

function blankDupes(array) {
  return(_.map(array, function(value, index, list) {
    if(index == 0)
      return value;
    if(value == list[index-1])
      return "";
    return value;
  }));
}

function cumulativeSum(array) {
  return _.reduce(array, function(memo, value, index) {
    if(memo.length > 0)
      value += memo[memo.length-1];
    memo.push(value);
    return memo;
  }, []);
}

function betaInputs(mode, min, max) {
  // returns an object with properties alpha and beta, min and max
  var relativeMean = ((mode - min) / (max - min) * 4.0 + 1.0) / 6.0
  var mean = (max - min) * relativeMean + min
  var alpha = (mean - min) / (max - min) * ((mean - min) * (max - mean) / (Math.pow((max - min), 2) / 36.0) - 1.0)
  var beta = ((max - mean) / (max - min)) * ((mean - min) * (max - mean) / (Math.pow((max - min), 2) / 36.0) - 1.0)

  return {
    alpha: alpha,
    beta: beta,
    min: min,
    max: max
  };
}

function betaSample(inputs) {
  return (jStat.beta.sample(inputs.alpha, inputs.beta) * (inputs.max - inputs.min) + inputs.min);
}

function getBetaSamples(iterations, mode, min, max) {
  var inputs = betaInputs(mode, min, max);
  return(_.times(iterations, function() {
    return(Math.round(betaSample(inputs)));
  }));
}

function simpleProbSample(probability, impact) {
  if(Math.random() <= probability)
    return impact;
  return 0;
}

function getSimpleProbSamples(iterations, probability, impact) {
  return(_.times(iterations, function() {
    return simpleProbSample(probability, impact);
  }))
}

function barHistogramChartConfig(samples, chartId, xLabel) {
  var histogram = d3.layout.histogram();
  var h = histogram(samples);

  var freqs = _.pluck(h, 'y');


  var bins = _.map(h, function(bin) {
    var lowerBound = Math.round(bin.x);
    var upperBound = Math.round(bin.x + bin.dx);
    if(_(bin).min() == _(bin).max())
      return Math.round(bin[0]);
    if(lowerBound != upperBound)
      return lowerBound + "-" + upperBound;
    return upperBound;

  })

  for(var i=0; i<bins.length; i++) {
    if(freqs[i] == 0) {
      bins[i] = "";
    }
  }

  return {
    bindto: chartId,
    data: {
      columns: [['Frequency'].concat(freqs)],
      type: 'bar'
    },
    axis: {
      x: {
        type: 'category',
        categories: bins,
        label: {
          text: xLabel,
          position: 'outer-center'
        },
        tick: {
          multiline: false
        }
      },
      y: {
        label: {
          text: 'Frequency',
          position: 'outer-middle'
        }
      },
    },
    legend: {
      show: false
    },
    padding: {
      top: 40,
      bottom: 40
    }
  };
}

function probabilityHistogramChartConfig(samples, chartId, xLabel) {
  var probabilities = d3.layout.histogram().frequency(false);
  var p = probabilities(samples);

  var probs = _.map(cumulativeSum(_.pluck(p, 'y')), function(prob) {
    return Math.round(prob * 100);
  });

  var minBin = Math.round(p[0].x);

  var probBins = _.map(p, function(bin, binNdx) {
    var lowerBound = minBin;
    var upperBound = Math.round(bin.x + bin.dx);
    if(binNdx == 0 && _(bin).min() == _(bin).max())
      return Math.round(bin[0]);
    //if(lowerBound != upperBound)
    //  return lowerBound + "-" + upperBound;
    return upperBound;

  })

  //for(var i=1; i<probBins.length; i++) {
  //  if(probs[i] == probs[i-1]) {
  //    probBins[i] = probBins[i-1];
  //  }
  //}

  return {
    bindto: chartId,
    data: {
      columns: [['Percentile'].concat(probs)],
      type: 'line'
    },
    //spline: {
    //  interpolation: {
    //    type: 'linear'
    //  }
    //},
    axis: {
      x: {
        type: 'category',
        categories: probBins,
        label: {
          text: xLabel,
          position: 'outer-center'
        },
        tick: {
          multiline: false,
          culling: true
        }
      },
      y: {
        label: {
          text: 'Percentile',
          position: 'outer-middle'
        },
        min: 0,
        max: 100,
        padding: {top:0, bottom:0}
      },
    },
    legend: {
      show: false
    },
    padding: {
      top: 40,
      bottom: 40
    }
  };
}


app.controller("simController", ['$scope', 'hotRegisterer', function ($scope, hotRegisterer) {


  
  
  
  function init() {

    $scope.inputs = {};
    $scope.setDefaultInputs();

    $scope.enableReport = false;




  }

  $scope.setDefaultInputs = function() {

    if($scope.inputs.iterations == null)
      $scope.inputs.iterations = 10000;

    if($scope.inputs.maxSprints == null)
      $scope.inputs.maxSprints = 25;

    if($scope.inputs.featuresTableData == null) {
      $scope.inputs.featuresTableSettings = {
        contextMenu: [
          'row_above', 'row_below', 'remove_row'
        ]
      };
      $scope.inputs.featuresTableData = [];
    }

    if($scope.inputs.throughputTableData == null) {
      $scope.inputs.throughputTableSettings = {
        contextMenu: [
          'row_above', 'row_below', 'remove_row'
        ]
      };
      $scope.inputs.throughputTableData = [];
    }

    if($scope.inputs.throughputRisksTableData == null) {
      $scope.inputs.throughputRisksTableSettings = {
        contextMenu: [
          'row_above', 'row_below', 'remove_row'
        ]
      };
      $scope.inputs.throughputRisksTableData = [];
    }

   if($scope.inputs.scopeTableData == null) {
     $scope.inputs.scopeTableSettings = {
       contextMenu: [
         'row_above', 'row_below', 'remove_row'
       ]
     };
     $scope.inputs.scopeTableData = [];
   }

    if($scope.inputs.scopeRisksTableData == null) {
      $scope.inputs.scopeRisksTableSettings = {
        contextMenu: [
          'row_above', 'row_below', 'remove_row'
        ]
      };
      $scope.inputs.scopeRisksTableData = [];
    }
  }

  init();


  $scope.saveInputs = function() {
    var payload = $scope.inputs;
    var fileName = window.prompt("Enter file name");
    if(fileName == null)
      return;

    fileName += ".json"

    var blob = new Blob([JSON.stringify(payload)], {type: "text/plain;charset=utf-8"});
    saveAs(blob, fileName);
  }

  $scope.loadInputs = function($fileContent) {
    var payload = JSON.parse($fileContent);

    if(payload.iterations != null)
      $scope.inputs.iterations = payload.iterations;
    else
      $scope.inputs.iterations = 1000;

    if(payload.maxSprints != null)
      $scope.inputs.maxSprints = payload.maxSprints;
    else
      $scope.inputs.maxSprints = 25;

    if(payload.featuresTableData != null)
      $scope.inputs.featuresTableData = payload.featuresTableData;
    else
      hotRegisterer.getInstance('featuresTableData').clear();

    if(payload.throughputTableData != null)
      $scope.inputs.throughputTableData = payload.throughputTableData;
    else
      hotRegisterer.getInstance('throughputTableData').clear();

    if(payload.throughputRisksTableData != null)
      $scope.inputs.throughputRisksTableData = payload.throughputRisksTableData;
    else
      hotRegisterer.getInstance('throughputRisksTableData').clear();

    if(payload.scopeTableData != null)
      $scope.inputs.scopeTableData = payload.scopeTableData;
    else
      hotRegisterer.getInstance('scopeTableData').clear();

    if(payload.scopeRisksTableData != null)
      $scope.inputs.scopeRisksTableData = payload.scopeRisksTableData;
    else
      hotRegisterer.getInstance('scopeRisksTableData').clear();


  }

  function reportError(msg) {
    alert(msg);
    return false;
  }

  $scope.runSim = function(switchTab) {

    $scope.enableReport = false;
    $scope.report = {};

    var featureSamples = simulateFeatures();
    if(featureSamples.length == 0)
      return reportError("Error: no scope was generated from features. Did you forget to populate the 'Story Counts per Feature' table?");

    var scopeRiskSamples = simulateScopeRisks();
    var totalScopeSamples = [];
    if(scopeRiskSamples.length > 0)
      totalScopeSamples = jStat([featureSamples, scopeRiskSamples]).sum();
    else
      totalScopeSamples = featureSamples;

    var validatedThroughputSources = _(stripBlankObjects($scope.inputs.throughputTableData))
      .map(_.partial(_.pick, _, 'min', 'mostLikely', 'max'))
      .map(_.partial(_.mapObject, _, Number))
      .map(function(tpSource) {
        return betaInputs(tpSource.mostLikely, tpSource.min, tpSource.max);
      });

    var validatedScopeChangeSources = _(stripBlankObjects($scope.inputs.scopeTableData))
      .map(_.partial(_.pick, _, 'min', 'mostLikely', 'max'))
      .map(_.partial(_.mapObject, _, Number))
      .map(function(tpSource) {
        return betaInputs(tpSource.mostLikely, tpSource.min, tpSource.max);
      });


    var validatedThroughputRisks = _(stripBlankObjects($scope.inputs.throughputRisksTableData))
      .map(_.partial(_.pick, _, 'prob', 'impact'))
      .map(_.partial(_.mapObject, _, Number));

    var maxSprints = Number($scope.inputs.maxSprints);

    var throughputSamples = [];
    var scopeChangeSamples = [];

    var numIterations = Number($scope.inputs.iterations);

    var numFeatures = stripBlankObjects($scope.inputs.featuresTableData).length;
    var sprintCompletionByFeature = _.times(numFeatures, function() {
      return [];
    });

    var iterations = _.times(numIterations, function(iterationNdx) {
      // number of sprints to complete the project
      // flag indicating whether the project actually completed
      // array of sprints with the number of features completed by the end of that sprint
      // number of stories added by the end of the project (including risks)
      // total project size

      var featureSizes = featureSamples[iterationNdx];
      var scopeRisk = scopeRiskSamples[iterationNdx];
      var initialScope = jStat(featureSizes).sum() + scopeRisk;
      featureSizes[0] += scopeRisk;

      var sprintNdx = 0;
      var totalProjectScope = initialScope;
      var doneCounter = 0;
      var cumulativeNumFeaturesPerSprint = [];
      var featureNdx = 0;

      while(doneCounter < totalProjectScope && sprintNdx < maxSprints) {
        var throughputSample = throughputTrial(validatedThroughputSources, validatedThroughputRisks);
        throughputSamples.push(throughputSample);
        doneCounter += throughputSample;

        var scopeChange = scopeTrial(validatedScopeChangeSources);
        scopeChangeSamples.push(scopeChange);
        totalProjectScope += scopeChange;
        featureSizes[featureNdx] += scopeChange;

        var featureThreshold = jStat(featureSizes.slice(0, featureNdx+1)).sum();
        if(doneCounter >= featureThreshold) {
          while(doneCounter >= featureThreshold && featureNdx < numFeatures) {
            sprintCompletionByFeature[featureNdx].push(sprintNdx + 1);
            featureNdx++;
            featureThreshold = jStat(featureSizes.slice(0, featureNdx+1)).sum();
          }
        }
        cumulativeNumFeaturesPerSprint.push(featureNdx);

        sprintNdx++;
      }

      return {
        completedProject: (doneCounter >= totalProjectScope),
        numSprints: sprintNdx,
        totalScope: totalProjectScope,
        initialScope: initialScope,
        cumulativeNumFeaturesPerSprint: cumulativeNumFeaturesPerSprint
      };

    });

    $scope.report.scopeChangeHistoConfig = barHistogramChartConfig(scopeChangeSamples, '#scopeChangeHisto', 'Additional Stories per Sprint');
    $scope.report.scopeChangeProbConfig = probabilityHistogramChartConfig(scopeChangeSamples, '#scopeChangeProb', 'Additional Stories per Sprint');

    $scope.report.throughputHistoConfig = barHistogramChartConfig(throughputSamples, '#throughputHisto', 'Throughput per Sprint');
    $scope.report.throughputProbConfig = probabilityHistogramChartConfig(throughputSamples, '#throughputProb', 'Throughput per Sprint');

    var initialScopeSamples = _(iterations).pluck('initialScope');
    $scope.report.initialScopeHistoConfig = barHistogramChartConfig(initialScopeSamples, '#initialScopeHisto', 'Number of Stories');
    $scope.report.initialScopeProbConfig = probabilityHistogramChartConfig(initialScopeSamples, '#initialScopeProb', 'Number of Stories');

    var totalScopeSamples = _(iterations).pluck('totalScope');
    $scope.report.totalScopeHistoConfig = barHistogramChartConfig(totalScopeSamples, '#totalScopeHisto', 'Number of Stories');
    $scope.report.totalScopeProbConfig = probabilityHistogramChartConfig(totalScopeSamples, '#totalScopeProb', 'Number of Stories');

    var successfulIterations = _(iterations).where({completedProject: true});
    $scope.report.successfulIterationsCount = successfulIterations.length;
    $scope.report.successPercentage = ((successfulIterations.length / numIterations).toFixed(2) * 100) + "%"



    var durationSamples = _(iterations).pluck('numSprints');
    $scope.report.durationHistoConfig = barHistogramChartConfig(durationSamples, '#durationHisto', 'Number of Sprints');
    $scope.report.durationProbConfig = probabilityHistogramChartConfig(durationSamples, '#durationProb', 'Number of Sprints');
    var maxDuration = _(durationSamples).max();
    $scope.report.maxDuration = maxDuration;

    var sprintWork = [];
    for(var sprintNdx=0; sprintNdx < maxDuration; sprintNdx++) {
      sprintWork.push(_(iterations).map(function(iteration) {
        if(sprintNdx < iteration.cumulativeNumFeaturesPerSprint.length)
          return iteration.cumulativeNumFeaturesPerSprint[sprintNdx];
        return numFeatures;
      }))
    }

    $scope.report.sprintWork = _(sprintWork).map(function(sprint, ndx) {
      return {
        sprintNum: ndx+1,
        sprintHistoConfig: barHistogramChartConfig(sprint, '#sprintWorkHisto_' + ndx, 'Number of Completed Features'),
        sprintProbConfig: probabilityHistogramChartConfig(sprint, '#sprintWorkProb_' + ndx, 'Number of Completed Features')
      }
    });


    for(var featureNdx=0; featureNdx<numFeatures; featureNdx++) {
      $scope.report.features[featureNdx].sprintHistoConfig = barHistogramChartConfig(sprintCompletionByFeature[featureNdx], '#featureSprintHisto_' + featureNdx, 'Completion in Sprint #');
      $scope.report.features[featureNdx].sprintProbConfig = probabilityHistogramChartConfig(sprintCompletionByFeature[featureNdx], '#featureSprintProb_' + featureNdx, 'Completion in Sprint #');
    }



    $scope.enableReport = true;
    //if(switchTab)
    //  $scope.tabs[1].active=true;
  }

  function throughputTrial(throughputSources, throughputRisks) {
    var riskFactor = jStat(_(throughputRisks).map(function(risk) {
      return simpleProbSample(risk.prob, risk.impact);
    })).sum();

    var tpSampleTotal = jStat(_(throughputSources).map(betaSample)).sum();

    var throughput = riskFactor + tpSampleTotal;
    if(throughput < 0)
      return 0;
    return throughput;
  }

  function scopeTrial(scopeChangeSources) {
    if(scopeChangeSources.length > 0)
      return jStat(_(scopeChangeSources).map(betaSample)).sum();
    else
      return 0;
  }

  function simulateScopeRisks() {
    var rows = stripBlankObjects($scope.inputs.scopeRisksTableData);
    var scopeRiskSamples = [];

    if(rows.length > 0) {
      var samplesPerRisk = _(rows).map(function (row) {
        return getSimpleProbSamples(Number($scope.inputs.iterations), Number(row.prob), Number(row.impact));
      });


      if (samplesPerRisk.length > 1)
        scopeRiskSamples = jStat(samplesPerRisk).sum();
      else
        scopeRiskSamples = samplesPerRisk[0];

      $scope.report.scopeRisksHistoConfig = barHistogramChartConfig(scopeRiskSamples, '#scopeRisksHisto', 'Number of Additional Stories');
      $scope.report.scopeRisksProbConfig = probabilityHistogramChartConfig(scopeRiskSamples, '#scopeRisksProb', 'Number of Additional Stories');
      $scope.report.showScopeRisks = true;
    } else {
      $scope.report.showScopeRisks = false;
      scopeRiskSamples = repeat(0, Number($scope.inputs.iterations));
    }

    return scopeRiskSamples;
  }

  function simulateFeatures() {
    $scope.report.features = _.map(stripBlankObjects($scope.inputs.featuresTableData), function(featureRow, ndx) {
      var samples = getBetaSamples(Number($scope.inputs.iterations), Number(featureRow.mostLikely), Number(featureRow.min), Number(featureRow.max));

      return {
        inputs: featureRow,
        histoConfig: barHistogramChartConfig(samples, '#featureHisto_' + ndx, 'Number of Stories'),
        probConfig: probabilityHistogramChartConfig(samples, '#featureProb_' + ndx, 'Number of Stories'),
        samples: samples
      };
    });


    return _.zip.apply(_, _($scope.report.features).pluck('samples'));

  }

  $scope.addRow = function(instance) {
    hotRegisterer.getInstance(instance).alter('insert_row');
  }

  $scope.clearTable = function(instance) {
    hotRegisterer.getInstance(instance).clear();
  }



}]);