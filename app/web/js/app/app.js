/**
 * @name app module configuration
 *
 * @author Felix Brucker
 * @version v0.0.1
 *
 * @description
 * hanldes top level configuration
 *
 */
(function () {
  'use strict';

  var app = angular.module('app', ['ui.router', 'angular-loading-bar', 'angular.filter', 'wu.masonry'])
    .config(['$stateProvider', '$urlRouterProvider', '$locationProvider', config])
    .config(['cfpLoadingBarProvider', function (cfpLoadingBarProvider) {
      cfpLoadingBarProvider.includeSpinner = false;
      cfpLoadingBarProvider.latencyThreshold = 100;
    }]);
  app.directive('updateTitle', ['$rootScope', '$timeout',
    function ($rootScope, $timeout) {
      return {
        link: function (scope, element) {

          var listener = function (event, toState) {

            var title = 'Miner-Monitor';
            if (toState.data && toState.data.pageTitle) title = toState.data.pageTitle;

            $timeout(function () {
              element.text(title);
            }, 0, false);
          };

          $rootScope.$on('$stateChangeSuccess', listener);
        }
      };
    }
  ]);
  app.directive('masonryBrick', function masonryBrickDirective() {
    return {
      restrict: 'AC',
      require: '^masonry',
      scope: true,
      link: {
        pre: function preLink(scope, element, attrs, ctrl) {
          var id = scope.$id, index;

          ctrl.appendBrick(element, id);
          element.on('$destroy', function () {
            ctrl.removeBrick(id, element);
          });

          scope.$watch(function () {
              return element.height();
            },
            function (newValue, oldValue) {
              if (newValue != oldValue) {
                ctrl.scheduleMasonryOnce('layout');
              }
            }
          );
        }
      }
    }
  });
  app.directive('highlighter', ['$timeout', function ($timeout) {
    return {
      restrict: 'A',
      scope: {
        model: '=highlighter'
      },
      link: function (scope, element) {
        scope.$watch('model', function (nv, ov) {
          if (nv !== ov) {
            element.addClass('highlight');
            $timeout(function () {
              element.removeClass('highlight');
            }, 2000);
          }
        });
      }
    };
  }]);
  app.filter('bytes', function () {
    return function (bytes, precision) {
      if (isNaN(parseFloat(bytes)) || !isFinite(bytes)) return '-';
      if (bytes === 0) {
        return '0 B';
      }
      var negative = false;
      if (bytes < 0) {
        bytes = Math.abs(bytes);
        negative = true;
      }
      if (typeof precision === 'undefined') precision = 1;
      var units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'],
        number = Math.floor(Math.log(bytes) / Math.log(1024));

      if (number < 0) {
        return bytes.toFixed(precision) + ' B';
      }

      var formattedBytes = (bytes / Math.pow(1024, Math.floor(number))).toFixed(precision) + ' ' + units[number];

      return negative ? `-${formattedBytes}` : formattedBytes;
    }
  });
  app.filter('capacity', function () {
    return function (capacity, unit, precision = 2) {
      if (isNaN(parseFloat(capacity)) || !isFinite(capacity)) return '-';
      if (capacity === 0) {
        return '0 B';
      }
      var negative = false;
      if (capacity < 0) {
        capacity = Math.abs(capacity);
        negative = true;
      }
      var units = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB'];
      var unitIndex = Math.floor(Math.log(capacity) / Math.log(1024));
      var unitOffset = units.findIndex((curr) => curr === unit);
      var fullUnitIndex = unitOffset !== -1 ? unitOffset + unitIndex : unitIndex;

      if (fullUnitIndex < 0) {
        return capacity.toFixed(precision) + ' B';
      }

      var formattedCapacity = (capacity / Math.pow(1024, Math.floor(unitIndex))).toFixed(precision) + ' ' + units[fullUnitIndex];

      return negative ? `-${formattedCapacity}` : formattedCapacity;
    }
  });
  app.filter('hashrate', function () {
    return function (hashrate, precision, start = 1) {
      if (isNaN(parseFloat(hashrate)) || !isFinite(hashrate)) return '';
      if (parseFloat(hashrate) === 0) return '0 H/s';
      if (precision !== 0 && !precision) precision = 1;
      switch (start) {
        case 0:
          break;
        case 1:
          hashrate *= 1000;
          break;
      }
      var units = ['H/s', 'KH/s', 'MH/s', 'GH/s', 'TH/s', 'PH/s'],
        number = Math.floor(Math.log(hashrate) / Math.log(1000));
      if (number<0)
        return hashrate.toFixed(precision) + ' H/s';
      else
      return (hashrate / Math.pow(1000, Math.floor(number))).toFixed(precision) + ' ' + units[number];
    }
  });
  app.filter('iterationrate', function () {
    return function (hashrate, precision) {
      if (isNaN(parseFloat(hashrate)) || !isFinite(hashrate)) return '';
      if (parseFloat(hashrate) === 0) return '0 I/s';
      if (typeof precision === 'undefined') precision = 1;
      var units = ['I/s', 'KI/s', 'MI/s', 'GI/s', 'TI/s', 'PI/s'],
        number = Math.floor(Math.log(hashrate) / Math.log(1000));
      if (number<0)
        return hashrate.toFixed(precision) + ' I/s';
      else
        return (hashrate / Math.pow(1000, Math.floor(number))).toFixed(precision) + ' ' + units[number];
    }
  });
  app.filter('solutionrate', function () {
    return function (hashrate, precision) {
      if (isNaN(parseFloat(hashrate)) || !isFinite(hashrate)) return '';
      if (parseFloat(hashrate) === 0) return '0 Sol/s';
      if (typeof precision === 'undefined') precision = 1;
      var units = ['Sol/s', 'KSol/s', 'MSol/s', 'GSol/s', 'TSol/s', 'PSol/s'],
        number = Math.floor(Math.log(hashrate) / Math.log(1000));
      if (number<0)
        return hashrate.toFixed(precision) + ' Sol/s';
      else
      return (hashrate / Math.pow(1000, Math.floor(number))).toFixed(precision) + ' ' + units[number];
    }
  });
  app.filter('secondsToTimeString', function () {
    return function (seconds) {
      if (seconds === -1) {
        return 'N/A';
      }

      return moment().subtract(seconds, 'seconds').fromNow(true);
    }
  });
  app.filter('secondsToHrMin', function () {
      return function (seconds) {
          var hours = Math.floor((seconds % 86400) / 3600);
          var minutes = Math.floor(((seconds % 86400) % 3600) / 60);
          var timeString = '';
          if (hours > 0) timeString += hours + "h ";
          if (minutes >= 0) timeString += minutes + "m";
          return timeString;
      }
  });
  app.filter('toArray', function () {
    return function (obj, addKey) {
      if (!angular.isObject(obj)) return obj;
      if ( addKey === false ) {
        return Object.keys(obj).map(function(key) {
          return obj[key];
        });
      } else {
        return Object.keys(obj).map(function (key) {
          var value = obj[key];
          return angular.isObject(value) ?
            Object.defineProperty(value, '$key', { enumerable: false, value: key}) :
          { $key: key, $value: value };
        });
      }
    };
  });
  app.filter('isEmpty', function () {
    return function (obj) {
      if (!obj) {
        return true;
      }
      return Object.keys(obj).length===0;
    };
  });
  app.filter('nodeCryptonightPool', function() {
    return function(arr) {
      return arr.filter(obj => obj.type === 'node-cryptonote-pool' || obj.type === 'snipa-nodejs-pool');
    };
  });
  app.filter('nhOrMphOrMpos', function() {
    return function(arr) {
      if (!arr) {
        return [];
      }
      return arr.filter(obj => obj.enabled && (obj.type==='nicehash' || obj.type==='miningpoolhub' || obj.type==='genericMPOS'));
    };
  });
  app.filter('customnumber', function ($filter) {
    return function (number, precision = 2, force = false) {
      number = parseFloat(number);
      if (isNaN(number) || !isFinite(number)) return '';
      if (number === 0) {
        precision = 0;
      }
      if (force) {
        return $filter('number')(number, precision);
      }
      if (number > 100) {
        precision = 2;
      }
      return $filter('number')(parseFloat(number.toFixed(precision)), precision);
    }
  });

  function config($stateProvider, $urlRouterProvider, $locationProvider) {

    $locationProvider.html5Mode(true);

    //define module-specific routes here
    $stateProvider
      .state('stats', {
        url: '/',
        templateUrl: 'views/partials/stats.html',
        controller: 'statsCtrl',
        controllerAs: 'statsVm',
        data: {
          pageTitle: 'Miner-Monitor Stats'
        }
      })
      .state('generalConfig', {
        url: '/generalConfig',
        templateUrl: 'views/partials/configGeneral.html',
        controller: 'configCtrl',
        controllerAs: 'configVm',
        data: {
          pageTitle: 'Miner-Monitor General Config'
        }
      })
      .state('dashboardConfig', {
        url: '/dashboardConfig',
        templateUrl: 'views/partials/configDashboards.html',
        controller: 'configCtrl',
        controllerAs: 'configVm',
        data: {
          pageTitle: 'Miner-Monitor Dashboard Config'
        }
      })
      .state('deviceConfig', {
        url: '/deviceConfig',
        templateUrl: 'views/partials/configDevices.html',
        controller: 'configCtrl',
        controllerAs: 'configVm',
        data: {
          pageTitle: 'Miner-Monitor Device Config'
        }
      });
    $urlRouterProvider.otherwise('/');
  }

})();
