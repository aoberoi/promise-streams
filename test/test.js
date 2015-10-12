
var ps = require('../');
var B = require('bluebird');
var fs = require('fs');
var split = require('split');
var path = require('path');
var inherits = require('util').inherits;
var Readable = require('stream').Readable;

var t = require('blue-tape');

function Counter() {
  Readable.call(this, { objectMode: true });
  this._max = 200;
  this._index = 1;
}
inherits(Counter, Readable);

Counter.prototype._read = function() {
  var i = this._index++;
  if (i > this._max) {
    this.push(null);
  } else {
    console.log('reading', i);
    this.push(i);
  }
};

function double(input) {
  console.log('doubling', input);
  return B.resolve(input * 2);
}

function lines() {
    return raw().pipe(split())
}
function raw() {
    return fs.createReadStream(path.join(__dirname, 'test.txt'), 'utf8');
}

function delayer() {
    return ps.through(function(line) {
        return this.push(B.delay(1).then(function() {
            return line ? parseFloat(line) : null;
        }));
    });
}

t.test('ps.wait', function(t) {
    var last = 0;
    return ps.wait(lines().pipe(ps.map(function(el) {
        return B.delay(1).then(function() {
            if (el) last = el;
            return el;
        });
    }))).then(function() {
        t.equal(last, "9", 'should wait for the last element')
    });
});

t.test('map-wait', function(t) {
    var last = 0;
    return lines().pipe(delayer())
    .map(function(el) {
        return B.delay(1).then(function() {
            return (last = el);
        })
    }).wait().then(function() {
        t.equal(last, 9, 'should wait for the last element')
    });
});

t.test('map-wait 2', function(t) {
    var counter = new Counter();
    return ps.wait(counter.pipe(ps.map(double))).then(function(value) {
      console.log(value);
      t.equal(0, 0, 'just a test');
    });
});

t.test('combined', function(t) {
    return lines().pipe(delayer())
    .map(function(el) {
        return el * 2;
    })
    .filter(function(el) {
        return el > 4
    })
    .reduce(function(acc, el) {
        return acc + el;
    })
    .then(function(sum) {
        t.equal(sum, 84, 'should map-reduce to correct sum');
    });

});

t.test('collect', function(t) {
    return ps.collect(raw()).then(function(data) {
        t.equal(data.length, 18, 'test.txt should be 18 bytes long');
    });
});
