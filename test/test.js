
var ps = require('../');
var B = require('bluebird');
var fs = require('fs');
var split = require('split');
var path = require('path');

var t = require('blue-tape');


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
