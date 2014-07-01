/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";
const {Ci,Cu,Cc} = require("chrome");
const tabs = require("sdk/tabs");
const {data} = require("sdk/self");
const {TopDomains} = require("TopDomains");
const {OutbrainRecommender} = require("OutbrainRecommender");

Cu.import("resource://gre/modules/Services.jsm", this);
Cu.import("resource://gre/modules/NewTabUtils.jsm", this);

// list of hosts granted access permission to apps installation list
/**
 * User profile object
*/

Services.prefs.setBoolPref("browser.newtab.preload", false);

exports.main = function(options) {
  tabs.on('ready' , function(tab) {
    if (tab.url == "about:newtab") {
      let worker = tab.attach({
          contentScriptFile: [data.url("jquery-1.10.2.min.js"),data.url("run.js")] ,
          onMessage: function (message) {
                      console.log(message);
                    }
      });
      worker.port.emit("style",data.url("run.css"));
      worker.port.on("recomend" , function() {
          let stories = OutbrainRecommender.getTopArticles();
          worker.port.emit("show", stories);
      });
    }
  });

  TopDomains.init();
  //dump(JSON.stringify(TopDomains.sorted) + " ====\n");
  OutbrainRecommender.refreshTopSites(TopDomains.sorted);
}
