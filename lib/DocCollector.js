/* -*- Mode: javascript; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 * vim: sw=2 ts=2 sts=2 expandtab
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const {Cc, Ci, Cu, ChromeWorker} = require("chrome");
Cu.import("resource://gre/modules/PlacesUtils.jsm")
Cu.import("resource://gre/modules/Services.jsm");
const {storage} = require("sdk/simple-storage");
const {TermUtils} = require("TermUtils");


function DocCollector(storageKey, siteFeatures) {
  if (storageKey) {
    if (!storage.docCollections) {
      storage.docCollections = {};
    }
    if (!storage.docCollections[storageKey]) {
      storage.docCollections[storageKey] = {
        docs: {},
        features: {},
        total: 0,
        siteFeatures: siteFeatures,
      };
    }
    this.collection = storage.docCollections[storageKey];
    this.storageKey = storageKey;
  }
  else {
    this.collection = {
      docs: {},
      features: {},
      total: 0,
      siteFeatures: siteFeatures,
    };
  }
}

DocCollector.prototype = {
  addDocument: function(doc) {
    let {url, title, summary} = doc;
    if (this.collection.docs[url]) return;
    this.collection.total ++;
    let docFeatures = {};
    // construct feature list for a document
    TermUtils.tokenizeText(title, docFeatures);
    TermUtils.tokenizeText(summary, docFeatures);
    doc.features = docFeatures;
    this.collection.docs[url] = doc;

    // add docFeatures to collection
    Object.keys(docFeatures).forEach(token => {
      this.addDocFeature(token, docFeatures[token]);
    });
    doc.score = 0;
  },

  addDocFeature: function(token, docCount) {
    if(!this.collection.features[token]) this.collection.features[token] = 0;
    this.collection.features[token] ++;
  },

  getFeatureWeight: function(token) {
    let count = this.collection.features[token] || 0;
    if (count > 1) return count / this.collection.total;
    return 0;
  },

  getFeatures: function() {
    return this.collection.features;
  },

  clearStorage: function () {
    delete storage.docCollections[this.storageKey];
    this.collection = {};
  },

  getSize: function() {
    return this.collection.total;
  },

  rankDocument: function(doc) {
    doc.score = 0;
    doc.scoreKeys = [];
    let seen = {};
    let siteFeatures = this.collection.siteFeatures;
    Object.keys(doc.features).forEach(token => {
       let fweight = this.getFeatureWeight(token) + (siteFeatures[token] > 1 ? siteFeatures[token]: 0);
       if (fweight && !seen[token]) {
         doc.score += fweight;
         doc.scoreKeys.push({token: token, weight: fweight});
         seen[token] = true;
       }
    });
    doc.scoreKeys.sort((a,b) => {
      return b.weight - a.weight;
    });
  },

  rankDocuments: function(recompute) {
    Object.keys(this.collection.docs).forEach(url => {
      let doc = this.collection.docs[url];
      if (doc.score == 0 || recompute) {
        this.rankDocument(doc);
      }
    });
  },

  resetSiteFeatures: function(siteFeatures) {
    this.collection.siteFeatures = siteFeatures;
    this.rankDocuments(true);
  },

  removeOutliers: function() {
    // we should get rid of keys that happen too often
    Object.keys(this.collection.features).forEach(token => {
      if (this.collection.features[token] > 0.9*this.collection.total) {
        delete this.collection.features[token];
      }
    });
  },

  getDocuments: function() {
    return this.collection.docs;
  },

  getScoredDocumentsBeforeTime: function(beforeTimeMl) {
    let results = [];
    Object.keys(this.collection.docs).forEach(url => {
      let doc = this.collection.docs[url];
      if (doc.published >= beforeTimeMl) {
        results.push(doc);
      }
    });

    results.sort((a,b) => {
      return b.score - a.score;
    });

    return results;
  },
};

exports.DocCollector = DocCollector;
