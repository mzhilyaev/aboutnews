"use strict";

let newsDebugApp = angular.module("newsDebugApp", []);

newsDebugApp.filter('escape', function() {
  return window.escape;
});

newsDebugApp.controller("newsDebugCtrl", function($scope) {
  $scope.newsDebug = null;
  $scope.doConfigureSites = true;
  $scope.Math = window.Math;

  $scope.refreshSiteInfo = function(site) {
    console.log("sending refresh");
    self.port.emit("refreshSiteInfo");
  }

  $scope.getResentDocs = function(site) {
    self.port.emit("recentDocs", site);
  }

  $scope.removeSite = function(site) {
    self.port.emit("removeSite", site);
  }

  $scope.clearSite = function(site) {
    self.port.emit("clearSite", site);
  }

  $scope.submitSite = function() {
    delete $scope.error;
    self.port.emit("addSite", $scope.site);
  }

  $scope.showRanked = function(site) {
    self.port.emit("getRanked", site);
  }

  $scope.clearRanked = function() {
    $scope.rankedDocs = null;
  }

  self.port.on("updateRanked", function(data) {
    $scope.$apply(_ => {
      $scope.rankedDocs = JSON.stringify(data, null, 1);
    });
  });

  self.port.on("updateSites", function(sites) {
    $scope.$apply(_ => {
      $scope.sites = [];
      Object.keys(sites).forEach(site => {
        let entry = sites[site];
        $scope.sites.push({
          site: site,
          lastUpdated: new Date(entry.lastUpdated),
          sequenceID: entry.sequenceId,
        });
      });
    });
  });

  self.port.on("addSiteError", function(data) {
    $scope.$apply(_ => {
      $scope.error = data.error;
    });
  });

  self.port.emit("data-url");
  self.port.on("data-url", function(url) {
    $scope.dataUrl = url;
  });

});


newsDebugApp.controller("newsShowCtrl", function($scope) {
  $scope.Math = window.Math;

  $scope.showDocs = function() {
    console.log($scope.siteName);
    console.log($scope.rankerName);
    console.log($scope.siteName, $scope.rankerName);
    self.port.emit("rankedDocs", $scope.siteName, $scope.rankerName);
  };

  self.port.on("updateNames", function(data) {
    $scope.$apply(_ => {
      $scope.siteNames = data.sites;
      $scope.rankerNames = data.rankers;
    });
  });

  self.port.on("updateRanked", function(data) {
    $scope.$apply(_ => {
      $scope.rankedDocs = data.splice(0,10);
      console.log($scope.rankedDocs);
    });
  });


  self.port.on("addSiteError", function(data) {
    $scope.$apply(_ => {
      $scope.error = data.error;
    });
  });

});

//angular.bootstrap(document, ['newsDebugApp']);

// Low-level data injection
self.port.on("style", function(file) {
  let link = document.createElement("link");
  link.setAttribute("href", file);
  link.setAttribute("rel", "stylesheet");
  link.setAttribute("type", "text/css");
  document.head.appendChild(link);
});
