'use strict';

var procpsTicker = require('procps-ticker')
  , tsdb         = require('timestreamdb')
  , level        = require('level')
  , through      = require('through2')

var procps           = procpsTicker.procps;
exports.flags        = procps.readproctab.flags;
exports.flagsFillAll = procps.readproctab.flagsFillAll;

function print(db) {
  db.ts('foo')
   // .range(new Date().getTime() - 400, new Date().getTime())
  //  .toArray(function (a) { console.log(a.length) })
  .toArray(console.log)
}

// Test
if (!module.parent && typeof window === 'undefined') {
  var dump = require('level-dump');
  var db = require('levelup')('inmem', { valueEncoding: 'json', db: require('memdown') });

  db = tsdb(db);

  var stream = procpsTicker.sysinfo.meminfo({ interval: 50 });
  stream
    .on('end', function () { print(db) })
   // .on('data', function (d) { db.put('foo', d) })

    // todo: why don't these work properly
    // this adds only one instead of 10
    .pipe(through.obj(function (x) { db.put('foo', x) } ))
    
    // this adds none at all 
    //.pipe(through.obj(function (x) { return { key: 'foo', value: x } } ))
    //.pipe(db.createWriteStream());

  setTimeout(function () { stream.end() }, 520);
}
