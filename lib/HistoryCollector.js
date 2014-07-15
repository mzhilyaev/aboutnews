/* -*- Mode: javascript; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 * vim: sw=2 ts=2 sts=2 expandtab
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const {Class} = require("sdk/core/heritage");

const {Cc, Ci, Cu, ChromeWorker} = require("chrome");
Cu.import("resource://gre/modules/PlacesUtils.jsm")
Cu.import("resource://gre/modules/Services.jsm");
const {TermUtils} = require("TermUtils");
const {DocCollector} = require("DocCollector");

let HistoryCollector = {
  getSiteHistoryDocCollector: function(site) {
    let docCollector = new DocCollector();
    let rev_host = site.split("").reverse().join("");
    let stmt = PlacesUtils.history.DBConnection.createStatement(
      "SELECT title, url, frecency  " +
      "FROM moz_places " +
      "WHERE rev_host like '" + rev_host + "%' " +
      "ORDER BY last_visit_date");

    while (stmt.executeStep()) {
      docCollector.addDocument({
        url: stmt.row.url,
        title: stmt.row.title,
      });
    }
    docCollector.removeOutliers();
    return docCollector;
  },
};

exports.HistoryCollector = HistoryCollector;
