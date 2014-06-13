'use strict';

var ticker = require('procps-ticker')
  , tsdb   = require('timestreamdb')
  , os     = require('os');

function inspect(obj, depth) {
  console.error(require('util').inspect(obj, false, depth || 5, true));
}

function createStreams(config) {
  var sysinfo = config.sysinfo || {};

  var tickers = Object.keys(config)
    .filter(function (x) { return x !== 'sysinfo' })
    .map(function (x) { return { id: x, opts: config[x], fn: ticker[x] } })
    .concat(
      Object.keys(sysinfo)
        .map(function (x) { return { id: x, opts: sysinfo[x], fn: ticker.sysinfo[x] } })
    );

  var streams = tickers
    .reduce(function (acc, x) {
      acc[x.id] = x.fn(x.opts);
      return acc;
    }, {})

  return streams;
}

function endStreams(streams, cb) {
  var keys = Object.keys(streams);
  var tasks = keys.length;
  keys
    .forEach(function (k) {
      var x = streams[k];
      x.on('end', function () {
        if (!--tasks) cb();
      })  
      x.end();
    })
}

function pipeStreams(db, streams, hostname) {
  Object.keys(streams)
    .forEach(function (k) { 
      var key = streams[k].key = hostname + '\xff' + k;
      streams[k].on('data', function (d) { db.put(key, d) })
    })
}

var go = module.exports = function (db, config) {
  var hostname = config.hostname || os.hostname();
  var streams = createStreams(config);

  db = tsdb(db);
  pipeStreams(db, streams, hostname);

  return { db: db, streams: streams };
}

// Test
function end(res) {
  endStreams(res.streams, function () {
    // res.db.ts(os.hostname()).toArray(inspect)
    // res.db.ts(res.streams.meminfo.key).toArray(inspect);
//    dump.allKeys(db)
    res.db.ts(res.streams.meminfo.key)
      .toArray(function (x) { 
        console.log('%d meminfos', x.length) 
        inspect(x);
      });
    
  });
}

// Test
if (!module.parent && typeof window === 'undefined') {
  
  var reservoir     = require('../');
  var inspectStream = require('inspect-stream');
  var dump          = require('level-dump');

  var flags = reservoir.flags;
  var all = reservoir.flagsFillAll;

  var config = {
      readproctab: { interval: 200, flags: all ^ flags.PROC_FILLENV }
    , sysinfo: {
          meminfo: { interval: 300 }
        , getstat: { interval: 300 }
      }
  }

  var db = require('levelup')('inmem', { valueEncoding: 'json', db: require('memdown') });

  var res = go(db, config);
  setTimeout(end, 1000, res);
}

