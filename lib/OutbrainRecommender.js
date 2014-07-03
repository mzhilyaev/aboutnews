const {Request} = require("sdk/request");
const simplePrefs = require("sdk/simple-prefs")

const {Cc, Ci, Cu, ChromeWorker} = require("chrome");
Cu.import("resource://gre/modules/Services.jsm");

const USER = Math.floor(Math.random() * 1000);
const OUTBRAIN_PREFIX = "http://odb.outbrain.com/utils/get?url=http%3A%2F%2F";
const OUTBRAIN_SUFFIX = "%2F&widgetJSId=AR_1&key=" + simplePrefs.prefs.outbrainAPIKey + "&idx=0&user=" + USER + "&format=vjnc";
const RECENT = 1000 * 60 * 60 * 24 * 60;
const MAX_ARTICLES = 10;


let OutbrainRecommender = {

  domains: {},
  topSites: null,
  topArticles: [],
  nextDomainIndex: 0,

  fetchDomainLinks: function(domain) {
          if (!this.domains[domain]) {
            this.domains[domain] = {
              seen: {},
              current: [],
              emptyResults: 0,
            };
          }

          if (this.domains[domain].emptyResults >= 3) {
            // do not bother
            return;
          }

          let self = this;
          Request({
            url: OUTBRAIN_PREFIX + encodeURI(domain) + OUTBRAIN_SUFFIX,
            onComplete: function({status, json}) {

              // Bucket articles accordingly
              if (status == 200) {
                let found = false;
                json.response.documents.doc.forEach(function(article) {
                  // if article is payed or too old skipe it
                  if (article.url.substring(0, 25) == "http://paid.outbrain.com/" 
                      || Date.now() - new Date(article.publish_date.replace(" ", "T")) > RECENT) {
                      return;
                  }
                  if (self.addDomainArticle(domain, article)) {
                    found = true;
                  }
                });

                // inc the count of empty results if nothing new found
                if (found) {
                  self.domains[domain].emptyResults = 0;
                }
                else {
                  self.domains[domain].emptyResults ++;
                }
              }
            },
          }).get();
  },

  addDomainArticle: function(domain, article) {
    if (!this.domains[domain].seen[article.url]) {
      this.domains[domain].seen[article.url] = true;
      this.domains[domain].current.push(article);
      article.domain = domain;
      //dump("ADDING " + domain + " \n" + JSON.stringify(article) + " ====\n");
      return true;
    }
    return false;
  },

  refreshTopSites: function(topSites) {
    this.topSites = topSites;
    this.topSites.forEach(domain => {
      if (!this.domains[domain]) {
        this.fetchDomainLinks(domain);
      }
    });
  },

  recommendNextArticle: function() {
    // find the domain that has recomendations
    let start = this.nextDomainIndex;
    let article = null;
    while (!article) {
      let domain = this.topSites[this.nextDomainIndex++];
      // dump("Current domain " + domain + " " + this.domains[domain].current.length + "\n");
      if (this.nextDomainIndex >= this.topSites.length) this.nextDomainIndex = 0;

      article = this.domains[domain].current.shift();
      if (!article || this.domains[domain].current.length == 0) {
        this.fetchDomainLinks(domain);
      }

      if (article) {
        // dump("FOUND STORY ON " + domain + " \n");
        return article;
      }
      if (this.nextDomainIndex == start) break;
    }
    return null;
  },

  getTopArticles: function(reload=false) {
    let self = this;

    // dump("Getting Stories \n");
    if (reload) {
      this.topArticles = [];
    }

    let article = this.recommendNextArticle();
    while (article) {
      this.topArticles.unshift(article);
      if (this.topArticles.length >= MAX_ARTICLES) break;
      article = this.recommendNextArticle();
    }
    if (this.topArticles.length >= MAX_ARTICLES) {
      this.topArticles.pop();
    }
    return this.topArticles;
  },

};

exports.OutbrainRecommender = OutbrainRecommender;
