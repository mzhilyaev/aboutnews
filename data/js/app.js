"use strict";

let newsDebugApp = angular.module("newsDebugApp", []);

newsDebugApp.filter('escape', function() {
  return window.escape;
});

newsDebugApp.controller("newsDebugCtrl", function($scope) {
  $scope.newsDebug = null;
  $scope.doConfigureFeeds = true;
  $scope.doScoreFeeds = true;
  $scope.Math = window.Math;
  $scope.feedDocs = [];

  $scope.removeFeed = function(url) {
    self.port.emit("removeFeed", url);
  }

  $scope.toggleScoreFeeds = function() {
    $scope.doScoreFeeds = !scope.doScoreFeeds;
  }

  $scope.toggleConfigureFeeds = function() {
    $scope.doConfigureFeeds = !scope.doConfigureFeeds;
  }

  $scope.clearFeed = function(url) {
    self.port.emit("clearFeed", url);
  }

  $scope.removeFeed = function(url) {
    self.port.emit("removeFeed", url);
  }

  $scope.scoreFeed = function(url) {
    self.port.emit("scoreFeed", url);
  }

  $scope.submitFeedUrl = function submitFeedUrl() {
    delete $scope.error;
    self.port.emit("addFeed", $scope.feedUrl);
  }

  $scope.toggleFeed = function(id) {
    $("#_feed_scored_" + id).toggle();
    if ($("#_feed_toggle_" + id).text() == "Hide") {
      $("#_feed_toggle_" + id).text("Show");
    }
    else {
      $("#_feed_toggle_" + id).text("Hide");
    }
  }

  $scope.toggleKeys = function(a,b) {
    $("#_"+a+"_"+b).toggle();
  }

  self.port.on("updateFeeds", function(feeds) {
    $scope.$apply(_ => {
      $scope.feeds = feeds;
    });
  });

  self.port.on("updateFeedError", function(data) {
    dump(JSON.stringify(data) + " >>>>\n");
    $scope.$apply(_ => {
      $scope.error = data.error;
    });
  });

  self.port.on("scoredFeedResults", function(data) {
    $scope.$apply(_ => {
      $scope.scored = data.error;
    });
  });

});

angular.bootstrap(document, ['newsDebugApp']);

// Low-level data injection
self.port.on("style", function(file) {
  let link = document.createElement("link");
  link.setAttribute("href", file);
  link.setAttribute("rel", "stylesheet");
  link.setAttribute("type", "text/css");
  document.head.appendChild(link);
});
