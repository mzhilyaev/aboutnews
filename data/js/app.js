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
  $scope.hours = 24;
  $scope.maxStories = 10;
  $scope.recommended = [];
  $scope.feedsDocOrder = [];

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

  $scope.recommend = function recommend() {
    delete $scope.error;
    self.port.emit("recommend", $scope.hours, $scope.maxStories);
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

  $scope.toggleSort = function(index) {
    if ($scope.feedsDocOrder[index]) {
      // sort by date
      $scope.feeds[index].docs.sort((a,b) => {
        return b.published - a.published;
      });
      $scope.feedsDocOrder[index] = false;
      $("#_feed_sort_" + index).text("sort by score");
    } else {
      // sort by score
      $scope.feeds[index].docs.sort((a,b) => {
        return b.score - a.score;
      });
      $scope.feedsDocOrder[index] = true;
      $("#_feed_sort_" + index).text("sort by date");
    }
  }

  self.port.on("updateFeeds", function(feeds) {
    $scope.$apply(_ => {
      // order feeds properly
      for (let index = 0; index < feeds.length; index++) {
        if ($scope.feedsDocOrder[index]) {
          // we need to order by score
          feeds[index].docs.sort((a,b) => { return b.score - a.score;});
        }
      }
      $scope.feeds = feeds;
    });
  });

  self.port.on("updateRecommended", function(recs) {
    $scope.$apply(_ => {
      $scope.recommended = recs;
    });
  });

  self.port.on("updateFeedError", function(data) {
    $scope.$apply(_ => {
      $scope.error = data.error;
    });
  });

  self.port.on("scoredFeedResults", function(data) {
    $scope.$apply(_ => {
      $scope.scored = data.error;
    });
  });

  self.port.emit("data-url");
  self.port.on("data-url", function(url) {
    $scope.dataUrl = url;
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
