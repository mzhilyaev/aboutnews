/* -*- Mode: javascript; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 * vim: sw=2 ts=2 sts=2 expandtab
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const {Cc, Ci, Cu, ChromeWorker} = require("chrome");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/commonjs/sdk/core/promise.js");
Cu.import("resource://gre/modules/NetUtil.jsm");

const {Request} = require("sdk/request");
const simplePrefs = require("sdk/simple-prefs")
const {storage} = require("sdk/simple-storage");
const timers = require("sdk/timers");

const UPDATE_MILISECONDS = 300000;
const HOUR_MILISECONDS = 3600000;

const kDocsLimit = 100;

let Downloader = {

  init: function() {
    if (!storage.dataCollector) {
      storage.dataCollector = {
        sites: {},
        siteId: 1,
      };
    }
    this.collector = storage.dataCollector;
    this.stash = {};
    this.update();
    timers.setInterval(() => {this.update();},UPDATE_MILISECONDS);
  },

  fetchRecentDocs: function(site, options = {}) {
    let {limit, sequenceId} = options;
    let deferred = Promise.defer();

    if (!this.collector.sites[site]) {
      this.addSite(site);
    }

    Request({
      url: simplePrefs.prefs.docServer + "/hosts/recentdocs/",
      content: JSON.stringify({
        host: site,
        sequenceId: sequenceId || this.collector.sites[site].sequenceId,
        limit: limit || kDocsLimit,
      }),
      contentType: "application/json",
      onComplete: function(response) {
        if (response.status == 200) {
          let docs = response.json;
          // store the sequenceId 
          if (docs && docs.length) {
            this.collector.sites[site].sequenceId = docs[0].sequenceId || 0;
          }
          deferred.resolve(docs);
        }
        else {
          deferred.reject("Failed http request: " + response.status);
        }
      }.bind(this),
    }).post();
    return deferred.promise;
  },

  makeSiteEntry: function(site, keepId) {
    this.collector.sites[site] = {
      site: site,
      sequenceId: 0,
      updateDelta: 600 * 1000,  // make update delta 5 minutes
      lastUpdated: 0,
      id: this.collector.siteId++,
    };
  },

  addSite: function(site) {
    return this.addSites([site]);
  },

  addSites: function(sites) {
    var advisorySites = [];
    sites.forEach(site => {
      if (!this.collector.sites[site]) {
        this.makeSiteEntry(site);
        advisorySites.push(site);
      }
    });

    if (advisorySites.length) {
      // tell server to insert these sites into database
      Request({
        url: simplePrefs.prefs.docServer + "/hosts/tophosts",
        content: JSON.stringify(advisorySites),
        contentType: "application/json",
        onComplete: function(response) {
          if (response.status == 200) {
            console.log("Adviced site inserted: " + JSON.stringify(advisorySites));
          }
          else {
            console.log("Advisory call failed: " + response.status);
          }
        }.bind(this),
      }).post();
    }
  },

  // @TODO - this must return something meaningful, but needs backen support
  refreshSitesInfo: function() {
    let deferred = Promise.defer();

    Request({
      url: simplePrefs.prefs.docServer + "/hosts/tophosts/info/",
      content: JSON.stringify(Object.keys(this.collector.sites)),
      contentType: "application/json",
      onComplete: function(response) {
        if (response.status == 200) {
          let info = response.json;
          deferred.resolve(info);
        }
        else {
          deferred.reject("Failed http request: " + response.status);
        }
      }.bind(this),
    }).post();
    return deferred.promise;
  },

  clear: function() {
    delete storage.dataCollector;
  },

  clearSite: function(site) {
    if (this.collector.sites[site]) {
      this.collector.sites[site].lastUpdated = 0;
      this.collector.sites[site].sequenceId = 0;
    }
  },

  removeSite: function(site) {
    console.log("removing " + site);
    delete this.collector.sites[site];
  },

  getSitesArray: function() {
    return this.collector.sites;
  },

  updateSite: function(site) {
    console.log("Updating site " + site);
    return this.fetchRecentDocs(site).then(docs => {
      this.collector.sites[site].lastUpdated = Date.now();  
      if (docs) {
        Services.obs.notifyObservers({
          wrappedJSObject: {
            site: site,
            docs: docs,
          }
        }, "news-feed-update", null)
        console.log("Got docs from update " + docs.length);
      }
      return docs;
    });
  },

  update: function() {
    Object.keys(this.collector.sites).forEach(site => {
      let siteEntry = this.collector.sites[site];
      if (siteEntry.lastUpdated < (Date.now() - siteEntry.updateDelta)) {
        this.updateSite(site);
      }
      else {
        console.log("Skipping " + site + " update");
      }
    });
  }

};

exports.Downloader = Downloader;
