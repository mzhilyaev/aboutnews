"use strict";

let newsApp = angular.module("newsApp", ["newsAppControllers"]);

newsApp.controller('MainController', function($scope, $location) {
  $scope.dataUrl = self.options.dataUrl;
  $scope.state = {
    score: true,
    site: false,
  };

  function setState(what) {
    Object.keys($scope.state).forEach(view => {
      $scope.state[view] = false;
    });
    $scope.state[what] = true;
  };

  $scope.navigate = function(view) {
    setState(view);
  };
});

newsApp.config(function($locationProvider, $sceDelegateProvider, $compileProvider) {
   $sceDelegateProvider.resourceUrlWhitelist([
    'self',
    self.options.dataUrl + "/**",
    'docScoresView.html',
   ]);

  $compileProvider.imgSrcSanitizationWhitelist(/^\s*(https?|ftp|resource):/);
});

// Low-level data injections
self.port.on("style", function(file) {
  let link = document.createElement("link");
  link.setAttribute("href", file);
  link.setAttribute("rel", "stylesheet");
  link.setAttribute("type", "text/css");
  document.head.appendChild(link);
});

self.port.on("import", function(data) {
  $('head').append(data);
});

self.port.on("bootstrap", function() {
  angular.bootstrap(document, ['newsApp']);
});
