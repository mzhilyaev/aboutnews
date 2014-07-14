/* -*- Mode: javascript; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 * vim: sw=2 ts=2 sts=2 expandtab
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const {Cc, Ci, Cu, ChromeWorker} = require("chrome");
Cu.import("resource://gre/modules/PlacesUtils.jsm")
Cu.import("resource://gre/modules/Services.jsm");

const {StopWords} = require("StopWords");

const kNotWordPattern = /[^A-Za-z0-9 ]+/g;

exports.TermUtils = {
  tokenizeText: function(text = "", inTokens) {
    let tokens = inTokens || {};
    if (text) {
      text = text.replace(kNotWordPattern, " ") || "";
      text.split(/\s+/).forEach(token => {
        let lowCaseToken = token.toLowerCase();
        // get rid of short ones
        if (token.length <= 1) return;
        // get rid of numbers
        if (token.match(/^[0-9]*$/)) return;
        // test for a stopword, but skip all caps
        if (token.match(/[a-z]/) && StopWords[lowCaseToken]) return;
        // store the token
        if (token.match(/^[A-Z][A-Z0-9]*$/)) {
          // all caps as is
          if (!tokens[token]) tokens[token] = 0;
          tokens[token] ++;
        }
        else {
          if (!tokens[lowCaseToken]) tokens[lowCaseToken] = 0;
          tokens[lowCaseToken] ++;
        }
      });
    }
    return tokens;
  },

  tokenizeTextArray: function(textItems) {
    let terms = {};
    textItems.forEach(item => {
      let itemMap = {};
      this.tokenizeText(item).forEach(token => {
        if (!terms[token]) terms[token] = 0;
        terms[token] ++;
      });
    });
    return terms;
  },
};
