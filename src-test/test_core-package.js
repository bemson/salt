var T = {
  type: function (thing) {
    return Object.prototype.toString.call(thing).match(/\s(.+)\]$/)[1].toLowerCase();
  }
};

module('Package');

test('Dependencies', 2, function () {
  ok(Array.prototype.every, 'Array.prototype.every exists.');
  ok(Flow.pkg().filter(function (pkg) {
      return pkg === 'core';
    }).length, 'The "core" package is present.');
});

test('Definition', 8, function () {
  var corePkgDef = Flow.pkg('core');
  'addStatus|events|dataKey|invalidKey|init|onBegin|onTraverse|onEnd'.split('|').forEach(function (mbr) {
    ok(corePkgDef[mbr], 'The package-definition has a "' + mbr + '" member.');
  });
});

test('Instance', 5, function () {
  var coreInst = Flow.pkg('core')(new Flow());
  'indexOf|vetIndexOf|getVar|scopeVars|go'.split('|').forEach(function (mbr) {
    equal(typeof coreInst[mbr], 'function', 'The package-instance method "' + mbr + '" is present.');
  });
});

test('Proxy', 9, function () {
  var flow = new Flow();
  'map|query|lock|vars|args|target|go|wait|status'.split('|').forEach(function (mbr) {
    equal(typeof flow[mbr], 'function', 'The proxy method "' + mbr + '" is present.');
  });
});

test('parsing', 3, function () {
  var corePkg = Flow.pkg('core'),
    defCnt = corePkg(new Flow()).states.length,
    data = {
      _junk: {},
      '_': {},
      _in: {}
    },
    attr,
    stateData = corePkg(new Flow(data)).states[1].data,
    hasAllData = false;
  equal(corePkg(new Flow({
      '!@#$%^&*().,;:\'"]{}-+~`\\<>': 1, // no alphanumerics
      '|': 1, // has pipe
      '/': 1, // has forward slash
      '_': 1, // begins with underscore
      '@': 1, // begins with @
      '[': 1, // begins with [
      toString: 1 // is the string "toString"
    })).states.length, defCnt,
    'A program with invalid keys has the expected number of states.'
  );
  equal(corePkg(new Flow({
      'a_': 1,
      'a@': 1,
      'a[': 1,
      'tostring': 1
    })).states.length, defCnt + 4,
    'A program with valid keys has the expected number of states.'
  );
  for (attr in stateData) {
    if (stateData.hasOwnProperty(attr) && (hasAllData = stateData[attr] === data[attr])) {
      break;
    }
  }
  ok(hasAllData, 'A state, defined with underscore prefixed keys, has the expected data properties.');
});

module('Instance');

module('Component');

test('_in', function () {
});

test('_on', function () {
});

test('_out', function () {
});

test('_over', function () {
});

test('_bover', function () {
});

test('_root', function () {
});

test('_pendable', function () {
});

test('_restrict', function () {
});

test('_vars', function () {
});

module('Proxy');

test('.query', function () {
  var program = {

  };
});

test('.target', function () {
});

test('.go', function () {
});

test('.vars', function () {
  var flow = new Flow(),
    vName = 'foo',
    vValue = 1,
    type = T.type;
  equal(type(flow.vars()), 'array', 'Returns an array when called without arguments.');
  [null, undefined, [], {}, function () {}, NaN].forEach(function (arg) {
    equal(flow.vars(arg), false, 'Returns false when the first argument is not a string.');
  });
  equal(flow.vars(vName), undefined, 'Returns "undefined" when retrieving an unknown variable.');
  equal(flow.vars(vName, vValue), true, 'Returns true when setting a variable.');
  equal(flow.vars(vName), vValue, 'Returns the value previously set.');

});

test('.args', function () {
});

test('.map', function () {
  var program = {
      a: {
        b: {
          c: {}
        },
        d: {}
      }
    },
    type = T.type,
    flow = new Flow(program),
    coreInst = Flow.pkg('core')(flow),
    curIndex = coreInst.tank.currentIndex,
    map = flow.map();
  [null, undefined, NaN, /./, 'foo', {}, [], function () {}].forEach(function (arg) {
    equal(flow.map(arg), false, 'This method returns false when given \'' + arg + '\', a "' + type(arg) + '".');
  });
  equal(typeof map, 'function', 'Method returns a function by default.');
  ok(flow.map().hasOwnProperty('toString'), 'Map functions have custom .toString function.');
  ok(map.a && map.a.b && map.a.b.c && map.a.d, 'Map functions match the program order and heirarchy.');
  equal(typeof map(), 'boolean', 'Map functions return a boolean.');
  ok(curIndex !== coreInst.tank.currentIndex, 'Map functions change the state of a flow instance.');
  coreInst.states.forEach(function (state, idx) {
    var map = flow.map(idx);
    if (idx) {
      equal(state.map, map, 'Passing ' + idx + ' returns the .map member of the corresponding state.');
    } else {
      equal(coreInst.states[1].map, map, 'Passing 0, returns the .map member from the program state (at index 1).');
    }
  });
});