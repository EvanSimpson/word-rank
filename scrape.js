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

function getWordCount(node) {
  if (node.tagName.toLowerCase() == 'script') {
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
  request(url, function(err, res, body) {
    if (err) {
      // TODO
      console.log(err);
    } else {
      console.log(res.headers);
      var noScript = cheerio.load(body)('body') // grab the body node
        .find('script')
          .remove() // remove all script tags
        .end();
      var wordCound = getWordCount(noScript[0]);
      var runTime = timer.time(url);
      console.log(url, wordCound, timer.formatTime(runTime));
    }
  });
}

module.exports = scrape;
