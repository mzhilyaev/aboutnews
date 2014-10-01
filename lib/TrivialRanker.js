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

let TrivialRanker = {

  getName: function() {
    return "TrivialRanker";
  },

  rankSiteDocument: function(site, doc) {
    return {
      rank: Math.round(Math.random()*100),
      reason: {},
    };
  }
};

exports.TrivialRanker = TrivialRanker;
