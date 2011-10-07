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

test('Instance', 16, function () {
  var coreInst = Flow.pkg('core')(new Flow());
  'indexOf|vetIndexOf|getVar|go'.split('|').forEach(function (mbr) {
    equal(typeof coreInst[mbr], 'function', 'The package-instance method "' + mbr + '" is present.');
  });
  'args|calls|route|vars|delay|cache|locked|stateIds|pending|parentFlows|targets|phase'.split('|').forEach(function (mbr) {
    ok(typeof coreInst[mbr] !== 'undefined', 'The package-instance property "' + mbr + '" is present.');
  });
});

test('State', 9, function () {
  var state = Flow.pkg('core')(new Flow()).states[0];
  'pendable|isRoot|rootIndex|restrict|map|vars|fncs'.split('|').forEach(function (mbr) {
    ok(state.hasOwnProperty(mbr), 'Has the "' + mbr + '" member-property.');
  });
  equal(typeof state.scopeVars, 'function', 'Has the "scopeVars" member-function.');
  equal(typeof state.canTgt, 'function', 'Has the "canTgt" member-function.');
});

test('Proxy', 9, function () {
  var flow = new Flow();
  'map|query|lock|vars|args|target|go|wait|status'.split('|').forEach(function (mbr) {
    equal(typeof flow[mbr], 'function', 'The proxy method "' + mbr + '" is present.');
  });
});

module('Parsing');

test('program keys', 3, function () {
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
      'a|': 1, // has pipe
      'a/': 1, // has forward slash
      '_a': 1, // begins with underscore
      '@a': 1, // begins with @
      '[a': 1, // begins with [
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

test('_on', 2, function () {
  var corePkg = Flow.pkg('core'),
    fnc = function () {};
  equal(corePkg(new Flow({_on: fnc})).states[1].fncs[0], fnc, 'The _on component was compiled as a function of the state.');
  equal(corePkg(new Flow({_on: 1})).states[1].fncs[0], 0, 'The _on component was not compiled when not a function.');
});

test('_in', 2, function () {
  var corePkg = Flow.pkg('core'),
    fnc = function () {};
  equal(corePkg(new Flow({_in: fnc})).states[1].fncs[1], fnc, 'The _in component was compiled as a function of the state.');
  equal(corePkg(new Flow({_in: 1})).states[1].fncs[1], 0, 'The _in component was not compiled when not a function.');
});

test('_out', 2, function () {
  var corePkg = Flow.pkg('core'),
    fnc = function () {};
  equal(corePkg(new Flow({_out: fnc})).states[1].fncs[2], fnc, 'The _out component was compiled as a function of the state.');
  equal(corePkg(new Flow({_out: 1})).states[1].fncs[2], 0, 'The _out component was not compiled when not a function.');
});

test('_over', 2, function () {
  var corePkg = Flow.pkg('core'),
    fnc = function () {};
  equal(corePkg(new Flow({_over: fnc})).states[1].fncs[3], fnc, 'The _over component was compiled as a function of the state.');
  equal(corePkg(new Flow({_over: 1})).states[1].fncs[3], 0, 'The _over component was not compiled when not a function.');
});

test('_bover', 2, function () {
  var corePkg = Flow.pkg('core'),
    fnc = function () {};
  equal(corePkg(new Flow({_bover: fnc})).states[1].fncs[4], fnc, 'The _bover component was compiled as a function of the state.');
  equal(corePkg(new Flow({_bover: 1})).states[1].fncs[4], 0, 'The _bover component was not compiled when not a function.');
});

test('_root', 6, function () {
  var states = Flow.pkg('core')(new Flow({
      a: {
        _root: 1,
        b: {
          _root: 0,
          c: {
            _root: 1
          }
        }
      },
      b: {
        _root: 0
      }
    })).states;
  [0,1,2,2,4,1].forEach(function (rootIdx, stateIdx) {
      equal(states[stateIdx].rootIndex, rootIdx, 'The state at index ' + stateIdx + ', has the expected "rootIndex" value.');
  });
});

test('_pendable', 6, function () {
  var states = Flow.pkg('core')(new Flow({
      a: {
        _pendable: 0,
        b: {
          _pendable: 1,
          c: {
            _pendable: 0
          }
        }
      },
      b: {
        _pendable: 0
      }
    })).states;
  [1,1,0,0,0,0].forEach(function (pendingFlag, stateIdx) {
      equal(states[stateIdx].pendable, pendingFlag, 'The state at index ' + stateIdx + ', has the expected "pendable" value.');
  });
});

test('_restrict', 6, function () {
  var states = Flow.pkg('core')(new Flow({
      a: {
        _restrict: 0,
        b: {
          _restrict: 1,
          c: {
            _restrict: 0
          }
        }
      },
      b: {
        _restrict: 1
      }
    })).states;
  '|||1|1|1'.split('|').forEach(function (restricted, stateIdx) {
      equal(states[stateIdx].restrict, restricted, 'The state at index ' + stateIdx + ', has the expected "restricted" flag.');
  });
});

test('_vars', 30, function () {
  var obj = {},
    rand = Math.random(),
    stateVars = [
      [], // _flow
      [ // _program
        {name: '1', value: undefined, use: 0}
      ],
      [ // a
        {name: 'a', value: undefined, use: 0},
        {name: 'b', value: undefined, use: 0},
        {name: 'c', value: obj, use: 1},
        {name: 'd', value: rand, use: 1}
      ],
      [ // a/b
        {name: 'a', value: undefined, use: 0}
      ],
      [ // a/c
        {name: 'a', value: obj, use: 1}
      ],
      [ // a/d
        {name: '0', value: undefined, use: 0}
      ],
      [ // /failedVars/c
      ],
      [ // /failedVars/d
      ],
      [ // /failedVars/e
      ],
      [ // /failedVars/f
      ],
      [ // /failedVars/g
      ]
    ];
    Flow.pkg('core')(new Flow({
      _vars: 1,
      a: {
        _vars: ['a', ['b', {c: obj, d: rand}]],
        b: {
          _vars: 'a',
          c: {
            _vars: {a:obj}
          }
        },
        d: {
          _vars: 0
        }
      },
      failedVars: {
        _vars: undefined,
        b: {
          _vars: null
        },
        c: {
          _vars: /s/
        },
        d: {
          _vars: []
        },
        e: {
          _vars: {}
        }
      }
    })).states.forEach(function (state, stateIdx) {
      state.vars.forEach(function (varSet, varIdx) {
        var varCfg = stateVars[stateIdx][varIdx];
        equal(varSet.name, varCfg.name, 'The variable ' + varIdx + ' of state ' + state.location + ', has the expected "name" value.');
        equal(varSet.value, varCfg.value, 'The variable ' + varIdx + ' of state ' + state.location + ', has the expected "value" value.');
        equal(varSet.use, varCfg.use, 'The variable ' + varIdx + ' of state ' + state.location + ', has the expected "use" value.');
      });
      if (!state.vars.length) {
        ok(1, 'A _var component of "' + state.data._vars + '" does not compile into variable configurations.');
      }
  });
});

module('Instance');

test('.getVar()', 15, function () {
  var corePkg = Flow.pkg('core'),
    pkgInst = corePkg(new Flow()),
    vars,
    value = {},
    name = 'foo',
    name2 = 'bar',
    vto;
  function getVariables() {
    vars = [];
    for (var varName in pkgInst.vars) {
      if (pkgInst.vars.hasOwnProperty(varName)) {
        vars.push(varName);
      }
    }
  }

  getVariables();
  ok(!vars.length, 'There are no active variables by default.');
  [null, undefined].forEach(function (arg) {
    equal(pkgInst.getVar(arg), false, 'Passing "' + arg + '" returns false.');
  });
  vto = pkgInst.getVar(name);
  equal(typeof vto, 'object', 'Passing a name argument returns an object.');
  getVariables();
  equal(vars.length, 1, 'One variable tracking object exists.');
  ok(pkgInst.vars.hasOwnProperty(name), 'The vto name is a key in the "vars" member of the package-instance.');
  equal(vto.name, name, 'The vto\'s "name" member is the expected string.');
  equal(T.type(vto.values), 'array', 'The vto\'s "values" member is an array.');
  equal(vto.values.length, 0, 'The "values" array is empty.');
  equal(pkgInst.getVar(name), vto, 'A vto is a singleton, representing a variable of the state.');
  pkgInst.getVar(name, value);
  equal(vto.values.length, 0, 'Passing a values argument to an existing vto does not add values.');
  vto = pkgInst.getVar(name2, value);
  equal(typeof vto, 'object', 'Passing two arguments returns a vto.');
  getVariables();
  equal(vars.length, 2, 'Two vto\'s exist.');
  equal(vto.values.length, 1, 'The second vto has an initial value.');
  equal(vto.values[0], value, 'The second vto has the expected initial value.');
});

test('.go()', function () {
});

test('.indexOf()', function () {
  var coreInst = Flow.pkg('core')(new Flow({
      a: {
        b: {
          c: 1
        }
      },
      d: {
        e: 1
      },
      f: 1,
      g: 1
    })),
    states = coreInst.states,
    randIdx = ~~(Math.random() * states.length),
    qryPaths = '//'.split('|');
  function customFunction() {};
  customFunction.toString = function () {
    return qryPath;
  };
  [null, undefined, function (){}].forEach(function (arg) {
    equal(coreInst.indexOf(arg), -1, 'Returns -1 when the argument is ' + arg + '.');
  });
  equal(coreInst.indexOf(NaN), -1, 'Returns -1 when the query is an out-of-range number.');
  equal(coreInst.indexOf(randIdx), randIdx, 'Returns the same index when the query is an in-range number.');
});

test('.vetIndexOf()', function () {
  var coreDef = Flow.pkg('core'),
    coreInst = coreDef(new Flow(
      {
        _restrict: 1,
        node: {
          _restrict: 1,
        }
      }
    ));
  equal(coreInst.vetIndexOf(2, coreInst.states[1]), 2, 'Returns the expected index when targeting a descendant of a restricted state.');
  equal(coreInst.vetIndexOf(2, coreInst.states[2]), -1, 'Returns -1 when targeting the restricted state.');
  equal(coreInst.vetIndexOf(1, coreInst.states[2]), -1, 'Returns -1 when targeting a state outside the path of the restricted state.');
});

module('State');

test('.scopeVars()', 5, function () {
  var corePkg = Flow.pkg('core'),
    value = 'bar',
    coreInst = corePkg(new Flow({
      _vars: [
        {
          foo: value
        }
      ]
    })),
    state = coreInst.states[1],
    vto = coreInst.getVar('foo', 1);
  equal(state.scopeVars(), undefined, 'Returns "undefined".');
  equal(vto.values.length, 2, 'Adds an index to the values array of the vto of a state.');
  equal(vto.values[0], value, 'Prepends a value to the values array of the vto.');
  state.scopeVars(1);
  equal(vto.values.length, 1, 'Passing a truthy value removes an index from the vto values.');
  state.scopeVars(1);
  ok(!coreInst.vars.hasOwnProperty('foo'), 'When the vto has no more values, descoping removes the vto from the package-instance.');
});

test('.canTgt()', function () {
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