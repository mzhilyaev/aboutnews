/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is the Simple RSS Reader (SRR) extension.
 *
 * The Initial Developer of the Original Code is Alvaro A. Lima Jr.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

const {Cc,Ci,Cr,Cu} = require("chrome");
Cu.import("resource://gre/modules/PlacesUtils.jsm");
Cu.import("resource://gre/modules/NetUtil.jsm");

function getProperties(obj, properties) {
	return (obj != null) ? obj[properties] : '';
}

// Object
function SRRFeed() {
	// URL FEED
	this.url = '';

	this.initVars();
}

SRRFeed.prototype.initVars = function() {
	// Error
	this.xmlNotAvailable = false;

	// Data of FEED
	this.uri 			= '';
	this.version 		= 0;
	this.authors 		= '';
	this.contributors 	= '';
	this.id 			= 0;
	this.link 			= '';
	this.updated 		= '';
	this.title 			= '';
	this.subtitle		= '';
	this.rights 		= '';
	this.items  		= [];
	this.livemarks		= [];
};

SRRFeed.prototype.setUrl = function(url) {
	this.url = url;
};

SRRFeed.prototype.getUrl = function() {
	return this.url;
};

SRRFeed.prototype.getLivemarks = function() {
	return this.livemarks;
};

// Total items
SRRFeed.prototype.count = function() { return this.items.length; };

SRRFeed.prototype._convertToUnicode = function(data) {
	let defaultEncoding = "UTF-8";
	let matches = data.match(/<?xml[^>]+encoding=['"]([^"']+)["']/i);
	let encoding = matches ? matches[1] : defaultEncoding;
	let converter = Cc['@mozilla.org/intl/scriptableunicodeconverter'].getService(Ci.nsIScriptableUnicodeConverter);

	try {
		converter.charset = encoding;
		data = converter.ConvertToUnicode(data);
	} catch (e) {
		dump(e);
	}
	return data;
};

// Parser Feed String
SRRFeed.prototype.parser = function(data) {
	let self = this;
	let data = this._convertToUnicode(data);

	if (data.length) {
		let parser = Cc["@mozilla.org/feed-processor;1"]
										.createInstance(Ci.nsIFeedProcessor);
		try {
			parser.listener = self;
			parser.parseFromString(data, NetUtil.newURI(this.url));
		} catch(e) {
			throw('Error parsing feed.');
		}
	}
};

// Feed Handle Result
SRRFeed.prototype.handleResult = function(result) {

	// Verific error
	if(result.bozo) {
		this.initVars();
		this.xmlNotAvailable = true;
		return false;
	} else {
		this.xmlNotAvailable = false;
	}

	try {
		var feed = result.doc;
		feed.QueryInterface(Ci.nsIFeed);
	} catch(e) {
    dump(e + " Feed Error\n");
		this.initVars();
		return false;
	}


	try {
		// Update elements
		this.uri 			= getProperties(feed.uri, "spec");
		this.version 		= feed.version;
		this.authors 		= this.peopleToJSON(feed.authors);
		this.contributors 	= this.peopleToJSON(feed.contributors);
		this.id 			= feed.id;
		this.link 			= getProperties(feed.link, "spec");
		this.updated 		= feed.updated;
		this.title 			= getProperties(feed.title, "text");
		this.subtitle 		= getProperties(feed.subtitle, "text");
		this.rights 		= getProperties(feed.rights, "text");
		this.items  		= this.entriesToJSON(feed.items);
	} catch (e) {
		dump(e + " Feed Error\n");
		return;
	}
};

SRRFeed.prototype.peopleToJSON = function(persons) {
	if(persons === null) {
		return null;
	} else if(persons.length === 0) {
		return [];
	} else {
		let people = [];
		let enumerator = persons.enumerate();
		while(enumerator.hasMoreElements()) {
			let person = enumerator.getNext().QueryInterface(Ci.nsIFeedPerson);
			if (person) {
				people.push({ name  : person.name,
							  email : person.email,
							  uri   : getProperties(person.uri, "spec") });
			}
		}
		return people;
	}
};

SRRFeed.prototype.entriesToJSON = function(entries) {
	if(entries === null) {
		return null;
	}
	if(entries.length === 0) {
		return [];
	}
	let items = [];
	let enumerator = entries.enumerate();
	while(enumerator.hasMoreElements()) {
		let entry = enumerator.getNext().QueryInterface(Ci.nsIFeedEntry);
		if (entry) {
			items.push({content   	 : this._entityDecode(getProperties(entry.content, "text")).replace( /<[^>]+>/g, '' ),
						summary   	 : this._entityDecode(getProperties(entry.summary, "text")).replace( /<[^>]+>/g, '' ),
						id        	 : entry.id,
						link      	 : getProperties(entry.link, "spec"),
						rights    	 : getProperties(entry.rights, "text"),
						title     	 : this._entityDecode(getProperties(entry.title, "text")).replace( /<[^>]+>/g, '' ),
						updated   	 : entry.updated,
						published 	 : entry.published,
						authors   	 : this.peopleToJSON(entry.authors),
						contributors : this.peopleToJSON(entry.contributors)
			});
		}
	}
	return items;
};

SRRFeed.prototype._entityDecode = function(aStr) {
	var formatConverter = Cc["@mozilla.org/widget/htmlformatconverter;1"].createInstance(Ci.nsIFormatConverter);
	var fromStr = Cc["@mozilla.org/supports-string;1"].createInstance(Ci.nsISupportsString);
	fromStr.data = aStr;
	var toStr = {value: null};

	try {
		formatConverter.convert("text/html", fromStr, fromStr.toString().length, "text/unicode", toStr, {});
	} catch(e) {
		return aStr;
	}

	if (toStr.value) {
		toStr = toStr.value.QueryInterface(Ci.nsISupportsString);
		return toStr.toString();
	}
	return aStr;
};

exports.SRRFeed = SRRFeed;
