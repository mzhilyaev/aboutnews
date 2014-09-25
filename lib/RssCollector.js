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
const {DocCollector} = require("DocCollector");
const {HistoryCollector} = require("HistoryCollector");

const UPDATE_MILISECONDS = 300000;
const HOUR_MILISECONDS = 3600000;

let RssCollector = {

  init: function() {
    if (!storage.rssCollector) {
      storage.rssCollector = {
        feeds: {},
        feedId: 1,
      };
    }
    this.collector = storage.rssCollector;
    // setup DocCollectors for each feed
    this.docCollectors = {};
    Object.keys(this.collector.feeds).forEach(url => {
      this.docCollectors[url] = new DocCollector(url);
    });

    this.update();
    timers.setInterval(() => {this.update();},UPDATE_MILISECONDS);
  },

  fetchRssFile: function(url) {
    let deferred = Promise.defer();
      Request({
        url: simplePrefs.prefs.docServer + "/hosts/recentdocs/",
        content: JSON.stringify({host: url, limit: 100}),
        contentType: "application/json",
        onComplete: function(response) {
          if (response.status == 200) {
            try {
              let docs = response.json;
              console.log(docs.length);
              deferred.resolve(docs);
            } catch (e) {
              dump(e + " ERROROR\n");
              deferred.reject(e);
            }
          }
          else {
            deferred.reject("Failed http request: " + response.status);
          }
        },
    }).post();
    return deferred.promise;
  },

  scoreFeed: function(url) {
    let feed = this.collector.feeds[url];
    if (feed) {
      return this.updateFeed(feed);
    }
    else {
      return null;
    }
  },

  addFeed: function(site, updateSeconds) {
    updateSeconds = updateSeconds || 600;
    if (!this.collector.feeds[site]) {
      this.collector.feeds[site] = {
        url: site,
        updateDelta: updateSeconds * 1000,
        lastUpdated: 0,
        tld: site,
        id: this.collector.feedId++,
      };
      this.docCollectors[site] = new DocCollector(site, {});
    }
    let feed = this.collector.feeds[site];
    feed.updateDelta = updateSeconds * 1000;
    return this.updateFeed(feed);
  },

  updateFeed: function(feed) {
    dump("Updating feed " + feed.url+ "\n");
    // @TODO may be alreadyt updating - make a flag
    return this.fetchRssFile(feed.url).then(docs => {
      if (docs) {
        let docCollector = this.docCollectors[feed.url];
        docs.forEach(item => {
          let published = (item.published) ? item.published * 1000:
                          ((item.harvested) ? item.harvested * 1000 : Date.now());
          docCollector.addDocument({
            url: item.url,
            title: item.title,
            summary: item.content,
            published: published,
            publishedDate: (new Date(published)).toString(),
          });
        });
        dump("\nUpdated feed " + feed.url+ " number of docs " + docCollector.getSize() + "\n");
        let siteHistory = HistoryCollector.getSiteHistoryDocCollector(feed.url);
        let siteTerms = siteHistory.getFeatures();
        docCollector.resetSiteFeatures(siteTerms);
      }
      feed.lastUpdated = Date.now();
    });
  },

  update: function() {
    Object.keys(this.collector.feeds).forEach(url => {
      let feed = this.collector.feeds[url];
      if (feed.lastUpdated < (Date.now() - feed.updateDelta)) {
        this.updateFeed(feed);
      }
      else {
        dump("skipping " + url + " update \n");
      }
    });

  },

  clear: function() {
    Object.keys(this.collector.feeds).forEach(url => {
      this.docCollectors[url].clearStorage();
    });
    this.docCollectors = {};
  },

  clearStorage: function() {
    this.clear();
    delete storage.rssCollector;
  },

  getRssCollection: function(url) {
    return this.docCollectors[url];
  },

  getFeedsObject: function() {
    return this.collector.feeds;
  },

  getFeedsArray: function() {
    return Object.keys(this.collector.feeds).map(url => {
      let feed = this.collector.feeds[url];
      let collector = this.docCollectors[url];
      let docs = collector.getDocuments();
      let docArray = Object.keys(docs).map(url => {return docs[url];}).sort((a,b) => {return b.published - a.published;});
      return {
         id: feed.id,
         url: url,
         tld: feed.tld,
         title: feed.title,
         lastUpdated: (new Date(feed.lastUpdated)) + "",
         size: (collector) ? collector.getSize() : 0,
         docs: docArray,
        };
    });
  },

  removeFeed: function(url) {
    delete this.collector.feeds[url];
    this.docCollectors[url].clearStorage();
    delete this.docCollectors[url];
  },

  recommendStories: function(options={}) {
     let timeBackHours = options.hours || 24;
     let maxStories = options.maxStories || 10;
     let publishedTimeLimit = Date.now() - timeBackHours*HOUR_MILISECONDS;
     let scoreBoard = {};
     let results = [];
     // build slices of docs from each feed
     Object.keys(this.collector.feeds).forEach(url => {
       let collector = this.docCollectors[url];
       let feed = this.collector.feeds[url];
       let scored = collector.getScoredDocumentsBeforeTime(publishedTimeLimit);
       if (scored && scored.length) {
        scoreBoard[url] = scored;
       }
     });

     // walk the score board and pick stories - assume all feeds are equally important
     while (maxStories && Object.keys(scoreBoard).length) {
       for (let url in scoreBoard) {
         let doc = scoreBoard[url].shift();
         results.push({doc: doc, tld: this.collector.feeds[url].tld});
         if (scoreBoard[url].length == 0) {
           delete scoreBoard[url];
         }
         maxStories--;
       }
     }

     return results;
  },

};

exports.RssCollector = RssCollector;
