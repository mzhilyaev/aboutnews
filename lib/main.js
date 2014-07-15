/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";
const {Ci,Cu,Cc} = require("chrome");
const tabs = require("sdk/tabs");
const {data} = require("sdk/self");
const {TopDomains} = require("TopDomains");
const {OutbrainRecommender} = require("OutbrainRecommender");
const {RssCollector} = require("RssCollector");
const {HistoryCollector} = require("HistoryCollector");
const {storage} = require("sdk/simple-storage");
const {Class} = require("sdk/core/heritage");
const {Factory, Unknown} = require("sdk/platform/xpcom");
const {PageMod} = require("sdk/page-mod");
const {TermUtils} = require("TermUtils");

Cu.import("resource://gre/modules/Services.jsm", this);
Cu.import("resource://gre/modules/NewTabUtils.jsm", this);
Cu.import("resource://gre/modules/NetUtil.jsm");

let DebugPage = {
  init: function() {
    Factory(this.factory);
    PageMod(this.page);
  },

  factory: {
    contract: "@mozilla.org/network/protocol/about;1?what=news-debug",

    Component: Class({
      extends: Unknown,
      interfaces: ["nsIAboutModule"],

      newChannel: function(uri) {
        let chan = Services.io.newChannel(data.url("debug.html"), null, null);
        chan.originalURI = uri;
        return chan;
      },

      getURIFlags: function(uri) {
        return Ci.nsIAboutModule.URI_SAFE_FOR_UNTRUSTED_CONTENT;
      }
    })
  },
  page: {
    // load scripts
    contentScriptFile: [
      data.url("jquery-1.10.2.min.js"),
      data.url("js/angular.min.js"),
      data.url("js/app.js"),
    ],

    include: ["about:news-debug"],

    onAttach: function(worker) {
      // inject styles
      worker.port.emit("style", data.url("css/bootstrap.min.css"));
      worker.port.emit("style", data.url("css/bootstrap-theme.min.css"));
      worker.port.emit("style", data.url("css/styles.css"));
      worker.port.emit("updateFeeds", RssCollector.getFeedsArray());

      worker.port.on("addFeed", function(url) {
        RssCollector.addFeed(url).then(feed => {
          worker.port.emit("updateFeeds", RssCollector.getFeedsArray());
        },
        error => {
          worker.port.emit("updateFeedError", {
            url: data.url,
            error: error,
          });
        });
      });

      worker.port.on("removeFeed", function(url) {
        RssCollector.removeFeed(url);
        worker.port.emit("updateFeeds", RssCollector.getFeedsArray());
      });

      worker.port.on("scoreFeed", function(url) {
        RssCollector.scoreFeed(url);
        worker.port.emit("updateFeeds", RssCollector.getFeedsArray());
      });

      worker.port.on("recommend", function(hours, maxStories) {
        let recs = RssCollector.recommendStories({hours: hours, maxStories: maxStories});
        worker.port.emit("updateRecommended", recs);
      });

    },
  }
};

let NewTabPage = {
  init: function() {
    Services.prefs.setBoolPref("browser.newtab.preload", false);
    if (!storage.state) {
      storage.state = {};
    }
    tabs.on('ready' , function(tab) {
      if (tab.url == "about:newtab") {
        let worker = tab.attach({
            contentScript: "var dataUrl='" + data.url("") + "';",
            contentScriptFile: [data.url("jquery-1.10.2.min.js"),data.url("run.js")] ,
        });
        worker.port.emit("style",data.url("run.css"));
        worker.port.on("recommend" , function() {
          let stories = OutbrainRecommender.getTopArticles();
          worker.port.emit("show", stories, storage.state);
        });
        worker.port.on("minimize", function() {
          storage.state.hide = true;
          worker.port.emit("show", null, storage.state);
        });
        worker.port.on("maximize", function() {
          storage.state.hide = false;
          let stories = OutbrainRecommender.getTopArticles();
          worker.port.emit("show", stories, storage.state);
        });
        worker.port.on("reload", function() {
          let stories = OutbrainRecommender.getTopArticles(true);
          worker.port.emit("show", stories);
        });
      }
    });
  },
};

exports.main = function(options) {
  DebugPage.init();
  TopDomains.init();
  RssCollector.init();
  //NewTabPage.init();
  //OutbrainRecommender.refreshTopSites(TopDomains.sorted);
}

exports.onUnload = function (reason) {
  if (reason == "uninstall" || reason=="disable") {
    dump("Cleaning addon storage due to " + reason + "\n");
    RssCollector.clearStorage();
  }
};
