/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";
const {Ci,Cu,Cc} = require("chrome");
const tabs = require("sdk/tabs");
const {data} = require("sdk/self");
const {storage} = require("sdk/simple-storage");
const {Class} = require("sdk/core/heritage");
const {Factory, Unknown} = require("sdk/platform/xpcom");
const {PageMod} = require("sdk/page-mod");
const {TermUtils} = require("TermUtils");
const {TopDomains} = require("TopDomains");
const {HistoryCollector} = require("HistoryCollector");
const {Downloader} = require("Downloader");
const {FeedHandler} = require("FeedHandler");
const {TrivialRanker} = require("TrivialRanker");

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

      worker.port.on("refreshSiteInfo", function(site) {
        Downloader.refreshSitesInfo().then(() => {
          worker.port.emit("updateSites", Downloader.getSitesArray());
        });
      });

      worker.port.on("addSite", function(site) {
        Downloader.addSite(site);
        worker.port.emit("updateSites", Downloader.getSitesArray());
      });

      worker.port.on("removeSite", function(site) {
        Downloader.removeSite(site);
        worker.port.emit("updateSites", Downloader.getSitesArray());
      });

      worker.port.on("clearSite", function(site) {
        Downloader.clearSite(site);
        FeedHandler.clearSite(site);
        worker.port.emit("updateSites", Downloader.getSitesArray());
      });

      worker.port.on("recentDocs", function(site) {
        Downloader.updateSite(site);
        worker.port.emit("updateSites", Downloader.getSitesArray());
      });

      worker.port.on("getRanked", function(site) {
        worker.port.emit("updateRanked", FeedHandler.getRankedDocs(site));
      });

      worker.port.on("data-url", function() {
        worker.port.emit("data-url", data.url(""));
      });

      // update sites
      worker.port.emit("updateSites", Downloader.getSitesArray());
    },
  }
};


let NewsPage = {
  init: function() {
    Factory(this.factory);
    PageMod(this.page);
  },

  factory: {
    contract: "@mozilla.org/network/protocol/about;1?what=news",

    Component: Class({
      extends: Unknown,
      interfaces: ["nsIAboutModule"],

      newChannel: function(uri) {
        let chan = Services.io.newChannel(data.url("news.html"), null, null);
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

    include: ["about:news"],

    onAttach: function(worker) {
      // inject styles
      worker.port.emit("style", data.url("css/bootstrap.min.css"));
      worker.port.emit("style", data.url("css/bootstrap-theme.min.css"));
      worker.port.emit("style", data.url("css/styles.css"));

      worker.port.on("rankedDocs", function(site, rankerName) {
        worker.port.emit("updateRanked", FeedHandler.getRankedDocsByRanker(site, rankerName));
      });

      worker.port.on("data-url", function() {
        worker.port.emit("data-url", data.url(""));
      });

      // update sites
      worker.port.emit("updateNames", {sites: FeedHandler.getSiteNames(), rankers: FeedHandler.getRankerNames()});
    },
  }
};

exports.main = function(options) {
  DebugPage.init();
  NewsPage.init();
  TopDomains.init();
  Downloader.init();
  FeedHandler.init([TrivialRanker]);
}

exports.onUnload = function (reason) {
  if (reason == "uninstall" || reason=="disable") {
    console.log("Cleaning addon storage due to " + reason);
    Downloader.clear();
    FeedHandler.clear();
  }
};
