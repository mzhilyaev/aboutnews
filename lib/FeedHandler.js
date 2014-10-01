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

const simplePrefs = require("sdk/simple-prefs")
const {storage} = require("sdk/simple-storage");
const timers = require("sdk/timers");

const kNewsFeedUpdate = "news-feed-update";

let FeedHandler = {

  init: function(rankers) {
    if (!storage.feedHandler) {
      storage.feedHandler = {
        sites: {},
      };
    }
    this.feedHandler = storage.feedHandler;
    this.rankers = rankers || [];
    Services.obs.addObserver(this, kNewsFeedUpdate, false);
  },

  addRanker: function(ranker) {
    this.rankers.push(ranker);
  },

  clear: function() {
    delete storage.feedHandler;
  },

  clearSite: function(site) {
    delete this.feedHandler.sites[site];
  },

  observe: function(aSubject, aTopic, aData) {
    if (aTopic == kNewsFeedUpdate) {
      aSubject = aSubject.wrappedJSObject;
      this.rankNewsUpdate(aSubject);
    }
  },

  rankNewsUpdate: function(data) {
    let {site, docs} = data;
    console.log("Ranking update from " + site);
    let siteEntry = this.feedHandler.sites[site];
    if (!siteEntry) {
      siteEntry = this.feedHandler.sites[site] = {};
    }
    // rank documents
    for (let i in this.rankers) {
      let ranker = this.rankers[i];
      for (let j in docs) {
        let doc = docs[j];
        // rankSiteDocument must return {rank: numericalRank, reason: {arbitrary object}}
        let rankData = ranker.rankSiteDocument(site, doc);
        if (rankData) {
          // insert document into ranked docs object for the site
          if (!siteEntry[doc.url]) {
            siteEntry[doc.url] = {
              url: doc.url,
              title: doc.title,
              published: doc.harvested * 1000,
              publishedDate: new Date(doc.harvested * 1000),
              summary: doc.content.substring(0, 200),
              image: doc.image,
              topics: doc.topics,
              entities: doc.semantics,
              tags: doc.tags,
              ranks: {},
            };
          }
          siteEntry[doc.url].ranks[ranker.getName()] = rankData;
        } // end of non-empty rank
      } // end of docs loop
    } // end of rankers loop
  },

  getRankedDocs: function(site) {
    if (site) {
      return this.feedHandler.sites[site];
    }
    else {
      return this.feedHandler.sites;
    }
  },

};

exports.FeedHandler = FeedHandler;
