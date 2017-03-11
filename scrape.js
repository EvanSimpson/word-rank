var https = require('https');
var cheerio = require('cheerio');
var request = require('request');
var XRegExp = require('xregexp');

var timer = require('./timer.js');

function countWords(textString) {
  // unicode-safe "word letter" test
  // removes numbers and punctuation
  // leaves Unicode characters from other alphabets
  var unicodeText = new XRegExp("\\P{L}+", "g");
  return XRegExp.replace(textString, unicodeText, "")
    .trim() // trim leading and trailing whitespace
    .split() // split space-delimited words
    .filter(function(element){
      return element.length // remove empty strings
    }).length; // return number of words left
}

function getWordCount(node, url) {
  if (typeof node == 'undefined') {
    return 0;
  }
  if (typeof node.tagName == 'string' &&
    node.tagName.toLowerCase() == 'script') {
    // if a script tag got through, ignore it
    return 0;
  } else if ( node.type == 'text') {
    // pass text node content into the word counter
    return countWords(node.data);
  } else {
    var sum = 0;
    var children = node.childNodes;
    if (children !== null) {
      // recursively reduce word count over children
      for (var i=0; i<children.length; i++) {
        sum += getWordCount(children[i]);
      }
    }
    return sum;
  }
}

function scrape(url) {
  timer.time(url);
  return new Promise(function(resolve, reject) {
    // need to set a timeout since some sites can take minutes
    request(url, {timeout: 5000}, function(err, res, body) {
      if (err) {
        // add the run time to the err object and reject the promise
        err.time = timer.time(url);
        return reject(err);
      } else {
        // create and populate a custom response object
        // includes headers, word count, and run time
        var response = {
          headers: res.headers
        };
        var noScriptBody = cheerio.load(body)('body') // grab the body node
          .find('script')
            .remove() // remove all script tags
          .end();
        response.wordCount = getWordCount(noScriptBody[0]);
        response.runTime = timer.time(url);
        // resolve the promise with the response data
        resolve(response);
      }
    });
  });
}

module.exports = scrape;
