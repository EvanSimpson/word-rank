var express = require('express');
var Datastore = require('nedb');

var timer = require('./timer.js');
var scrape = require('./scrape.js');
var ranks = require('./ranks.json');

var db = new Datastore({ filename: 'data.nedb', autoload: true });
var app = express();
app.set('view engine', 'pug');
app.use(express.static('public'));

app.get('/', function(req, res) {
  getSites(function(err, docs){
    if (err) {
      return dbError(res);
    } else {
      getOverallStats(res, function(avgWords, totalTime){
        res.render('./index.pug', {
          heading: 'Alexa Top 100 Ranked by Word Count',
          page: 'home',
          labels: [
            'Rank',
            'URL',
            'Word Count',
            'Run Time (Seconds)'
          ],
          data: docs,
          data_labels: [
            'site',
            'words',
            'runTime'
          ],
          avgWords: avgWords,
          totalTime: totalTime
        });
      });
    }
  });
});

app.get('/headers', function(req, res) {
  getHeaders(function(err, headers){
    getOverallStats(res, function(avgWords, totalTime){
      headers.map(function(header){
        header.percent = header.count + '%'
      });
      res.render('./index.pug', {
        heading: 'Top Site Headers',
        page: 'overview',
        labels: [
          'Rank',
          'Header String',
          'Percent of Sites'
        ],
        data: headers,
        data_labels: [
          'header',
          'percent'
        ],
        avgWords: avgWords,
        totalTime: totalTime
      });
    });
  });
});

app.post('/refresh', function(req, res) {
  deleteRecords(function(err){
    scanAllPages(function(totalTime) {
      getSites(function(err, docs){
        if (err) {
          return dbError(res);
        } else {
          var sum = docs.reduce(function(sum, doc) {
            return sum + doc.words
          }, 0);
          db.update({ avgWords: { $exists: true }},
            { avgWords: sum / docs.length },
            { upsert: true },
            function(){
              res.json({
                'time': timer.formatTime(totalTime),
                'avgWords': sum / docs.length,
                'sites': docs
              });
            });
        }
      });
    });
  });
});

app.listen(3000, function () {
  console.log('Server listening...');
});

function dbError(res) {
  res.status(500).send('Error accessing the database');
}

function getSites(callback) {
  db.find({ site: { $exists: true }})
    .sort({ words: -1 })
    .exec(callback);
}

function getHeaders(callback) {
  db.find({ header: { $exists: true }})
    .sort({ count: -1 })
    .limit(20)
    .exec(callback);
}

function getOverallStats(res, callback) {
  db.find({ avgWords: { $exists: true}}, function(err, words){
    if (err) {
      return dbError(res);
    } else {
      db.find({ total_time: { $exists: true }}, function(err, time) {
        if (err) {
          return dbError(res);
        } else {
          callback(words[0], time[0]);
        }
      });
    }
  });
}

function deleteRecords(callback) {
  db.remove({}, { multi: true }, callback);
}

function saveData(url, response, status) {
  db.insert({
    site: url,
    words: response.wordCount,
    runTime: timer.formatTime(response.runTime),
    state: status
  });
  var headers = Object.keys(response.headers);
  for (var i=0; i<headers.length; i++ ) {
    db.update(
      { 'header': headers[i] + ": " + response.headers[headers[i]]},
      { $inc: { count: 1}},
      { upsert: true }
    );
  }
}

// a simple callback collector
var callbackCounter = 0;
function createScanCallback(callback) {
  return function scanComplete() {
    callbackCounter++;
    if (callbackCounter == ranks.length) {
      var time = timer.time('all');
      db.update(
        { 'total_time': { $exists: true }},
        { 'total_time': timer.formatTime(time)},
        { upsert: true },
        function() {
          callback && callback(time);
        }
      );
    }
  };
}

function createScanner(url, scanCallback) {
  return function() {
    scrape('http://' + url)
      .then(function(response) {
        saveData(url, response, 'SUCCESS');
        scanCallback && scanCallback();
      })
      .catch(function(err) {
        var response = {
          headers: {},
          wordCount: 0,
          runTime: err.time
        }
        saveData(url, response, err.code);
        scanCallback && scanCallback();
      });
  }
}

function scanAllPages(callback){
  timer.time('all');
  for (var i=0; i<ranks.length; i++) {
    var url = ranks[i]['site-url'];
    var scanCallback = createScanCallback(callback);
    var scanner = createScanner(url, scanCallback);
    scanner();
  }
}
