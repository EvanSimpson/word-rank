var express = require('express');
var sqlite3 = require('sqlite3');

var timer = require('./timer.js');
var scrape = require('./scrape.js');
var ranks = require('./ranks.json');

var db = new sqlite3.Database('data.sqlite3', function(err) {
  if (err) {
    console.log(err);
  } else {
    db.run(
      'CREATE TABLE IF NOT EXISTS sites ' +
      '(site TEXT, headers TEXT, ' +
      'words INTEGER, runTime REAL, status TEXT);'
    );
    scanAllPages();
  }
});

function saveData(url, response, status) {
  db.run('INSERT OR REPLACE INTO sites VALUES '+
    '($site, $headers, $words, $runTime, $status)', {
      $site: url,
      // Ideally would escape these header strings
      // as it's the only externally generated data
      $headers: Object.keys(response.headers).join(':'),
      $words: response.wordCount,
      $runTime: timer.formatTime(response.runTime),
      $status: status
    });
}

// a simple callback collector
var callbackCounter = 0;
function scanComplete() {
  callbackCounter++;
  if (callbackCounter == ranks.length) {
    console.log(timer.time('all'));
  }
}

function createScanner(url) {
  return function() {
    scrape('http://' + url)
      .then(function(response) {
        console.log(url, response.wordCount,
          timer.formatTime(response.runTime));
        saveData(url, response, 'SUCCESS');
        scanComplete();
      })
      .catch(function(err) {
        console.log(url, err.code);
        var response = {
          headers: {},
          wordCount: 0,
          runTime: err.time
        }
        saveData(url, response, err.code);
        scanComplete();
      });
  }
}

function scanAllPages(){
  timer.time('all');
  for (var i=0; i<ranks.length; i++) {
    var url = ranks[i]['site-url'];
    var scanner = createScanner(url);
    scanner();
  }
}
