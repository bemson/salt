var T = {
  type: function (thing) {
    return Object.prototype.toString.call(thing).match(/\s(.+)\]$/)[1].toLowerCase();
  }
};

module('Package');

test('Dependencies', 3, function () {
  ok(Array.prototype.indexOf, 'Array.prototype.indexOf exists.');
  ok(Array.prototype.every, 'Array.prototype.every exists.');
  ok(Flow.pkg().filter(function (pkg) {
      return pkg === 'core';
    }).length, 'The "core" package is present.');
});

test('Definition', 8, function () {
  var corePkgDef = Flow.pkg('core');
  'addStatus|events|dataKey|invalidKey|init|onBegin|onTraverse|onEnd'.split('|').forEach(function (mbr) {
    ok(corePkgDef.hasOwnProperty(mbr), 'The package-definition has a "' + mbr + '" member.');
  });
});

test('Instance', 17, function () {
  var coreInst = Flow.pkg('core')(new Flow());
  'indexOf|vetIndexOf|getVar|go'.split('|').forEach(function (mbr) {
    equal(typeof coreInst[mbr], 'function', 'The package-instance method "' + mbr + '" is present.');
  });
  'trust|args|calls|route|vars|delay|cache|locked|stateIds|pending|parents|targets|phase'.split('|').forEach(function (mbr) {
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

test('_on', 3, function () {
  var corePkg = Flow.pkg('core'),
    fnc = function () {};
  equal(corePkg(new Flow(fnc)).states[1].fncs[0], fnc, 'A single function passed to a new Flow is compiled as a function of the state.');
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

test('.indexOf()', 8, function () {
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
  [null, undefined, function (){}, {}, []].forEach(function (arg) {
    equal(coreInst.indexOf(arg), -1, 'Returns -1 when the argument is a "' + T.type(arg) + '".');
  });
  equal(coreInst.indexOf(NaN), -1, 'Returns -1 when the query is an out-of-range number.');
  equal(coreInst.indexOf(''), -1, 'Returns -1 when the query is an empty string.');
  equal(coreInst.indexOf(randIdx), randIdx, 'Returns the same index when the query is an in-range number.');
});

test('.vetIndexOf()', function () {
  var coreDef = Flow.pkg('core'),
    coreInst = coreDef(new Flow(
      {
        _restrict: 1,
        node: {
          _restrict: 1
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

test('presence', function () {

});

test('.lock()', 17, function  () {
  var flow = new Flow(function () {
      var scope = this;
      [null, undefined, false, true].forEach(function (arg) {
        equal(scope.lock(arg), true, 'Returns true when called from a trusted routine and passed "' + T.type(arg) + '".');
        if (arg) {
          ok(scope.lock(), 'Passing a "' + T.type(arg) + '" locked the Flow.');
        } else {
          ok(!scope.lock(), 'Passing a "' + T.type(arg) + '" unlocked the Flow.');
        }
      });
      
    }),
    coreInst = Flow.pkg('core')(flow);
  equal(flow.lock(), false, 'A flow is unlocked by default.');
  [null, undefined, false, true].forEach(function (arg) {
    equal(flow.lock(), false, 'A flow can not be locked by an untrusted routine, even when passed "' + T.type(arg) + '".');
  });
  equal(flow.target(1), true, 'An unlocked flow may be directed.');
  equal(flow.lock(), true, 'Returns true when called from outside and the Flow is locked.');
  equal(flow.target(0), true, '.target() returns false for a locked Flow');
  equal(flow.lock(0), false, 'A flow can not be unlocked by an untrusted routine.');
});

test('.query()', function () {
  var program = {

  };
});

test('.target()', 22, function () {
  var rtnVal = {},
    testVal = {},
    flow = new Flow({
      noRtn: function () {}, // 2
      rtnUndefined: function () { // 3
        return undefined;
      },
      rtn: function () { // 4
        return rtnVal;
      },
      args: { // 5
        simple: function () { // 6
          equal(arguments.length, 2, 'Passes additional arguments to the _on function.');
          ok(arguments[0] === rtnVal && arguments[1] === testVal, 'The expected arguments are passed to the _on function.');
        },
        stepped: { // 7
          _in: function  () {
            ok(this === flow, 'Scope of the component functions is the flow instance.');
            equal(this.target(NaN), false, 'Returns false when redirecting with invalid parameters.');
            equal(arguments.length, 0, 'No arguments passed to the _in function.');
          },
          _on: function () {
            equal(arguments[0], testVal, 'The expected arguments is passed to the _on function after invoking an _in function.');
          },
          _out: function () {
            equal(arguments.length, 0, 'No arguments passed to the _out function.');
          }
        }
      },
      bover: { // 8
        _bover: function () {
            equal(arguments.length, 0, 'No arguments passed to the _bover function.');
        }
      },
      over: { // 9
        _over: function () {
            equal(arguments.length, 0, 'No arguments passed to the _over function.');
        }
      },
      redirect: { // 10
        _on: function () {
          equal(this.target(1), false, 'Returns false when redirecting with valid paremeters.');
          this.target(11, rtnVal);
          return rtnVal;
        },
        end: function () { // 11
          equal(arguments[0], rtnVal, 'Arguments are changed during redirection.');
          return false;
        }
      }
    });
  [
    [null, false, 'Returns false when the query is "null".'],
    [undefined, false, 'Returns false when the query is "undefined" (or no query is passed).'],
    [NaN, false, 'Returns false when the query is an out-of-range number.'],
    ['', false, 'Returns false when the query is an invalid string.'],
    [1, true, 'Returns true when the target state has no _on function.'],
    [0, true, 'Can target the _flow state.'],
    [2, true, 'Returns true when the function has no return value.'],
    [3, true, 'Returns true when the function returns "undefined".'],
    [4, rtnVal, 'Returns the return value when the function returns anything besides "undefined".'],
    [4, rtnVal, 'Can target the current state.']
  ].forEach(function (set) {
    equal(flow.target(set[0]), set[1], set[2]);
  });
  flow.target(6, rtnVal, testVal);
  flow.target(7, testVal);
  flow.target(4, testVal);
  equal(flow.target(10, testVal), false, 'Returns result of the final targeted state\'s _on function.');
  flow.target(0, testVal);
});

test('.go()', 18, function () {
  var tic = 0,
    multiTic = 0,
    pendTic = 0,
    pendFlow = new Flow(function () {
      this.wait();
    }),
    flow = new Flow({
      retValue: function () {
        return 1;
      },
      multiple: {
        a: function () {
          multiTic++;
        },
        b: function () {
          multiTic++;
        },
        c: function () {
          multiTic++;
        }
      },
      redirect: {
        _root: 1,
        _in: function () {
          this.go('/add1');
        },
        _on: function () {
          equal(tic, 6, 'Prepends waypoints when invoked outside an _on function.');
        },
        add1: function () {
          tic += 1;
          this.go('/add2');
        },
        add2: {
          _on: function () {
            equal(tic, 1, 'Appends waypoints when invoked in an _on function.');
            tic += 2;
          },
          _out: function () {
            this.go('/add3');
          }
        },
        add3: function () {
          tic += 3;
        }
      },
      pause: {
        _in: function () {
          this.wait();
        }
      },
      fauxPause: {
        _in: function () {
          this.wait(100);
          this.go();
        },
        _on: function () {
          ok(1, 'Cancels prior delays set by proxy.wait().');
        }
      },
      pending: {
        _on: function () {
          pendFlow.go(1);
        },
        stop: function () {
          ok(1, 'Changes route while a flow is pending.');
        }
      },
      nonpending: function () {
        pendTic++;
        pendFlow.go(1);
      }
    });
  equal(flow.go(), false, 'Returns false when passed no arguments and there is no target state.');
  [
    [null, false, 'Returns false when the query is "null".'],
    [undefined, false, 'Returns false when the query is "undefined" (or no query is passed).'],
    [NaN, false, 'Returns false when the query is an out-of-range number.'],
    ['', false, 'Returns false when the query is an invalid string.'],
    [0, true, 'Returns true when the flow traverses a state.'],
    ['//retValue/', true, 'Ignores the value returned by an _on function.'],
    ['//pause/', true, 'Returns true even when navigation is stopped.']
  ].forEach(function (set) {
    equal(flow.go(set[0]), set[1], set[2]);
  });
  equal(flow.go(4, 5, 6, ''), false, 'Returns false when one target state is invalid.');
  equal(flow.go(4, 5, 6), true, 'Returns true when all target states are valid.');
  equal(multiTic, 3, 'Traverses multiple states.');
  flow.go('//redirect/');
  flow.go('//fauxPause/');
  flow.go('//pending/');
  equal(flow.go('//pending/stop/'), false, 'Returns false when the flow is pending (another flow).');
  pendFlow.go();
  equal(flow.go('//nonpending/'), true, 'Unpends parent flows.');
  pendFlow.go();
  equal(pendTic, 1, 'Did not fire the _on function of a pending state!');
});

test('.wait()', 10, function () {
  var tic = -3,
    flow = new Flow({
      _in: function () {
        equal(this.wait(100), true, 'Returns true from a trusted routine with valid arguments.');
      },
      _on: function () {
        this.target(0);
        equal(this.wait(NaN, 100), false, 'Returns false when passed invalid arguments.');
        this.wait(2, 100);
      },
      redir: function () {
        var scope = this;
        ok(1, 'Assumes the first parameter is a query, when passed two arguments.');
        this.wait(function () {
          ok(this === scope, 'Scope of callback is the same as that of a component function.');
          equal(this.wait(3, 100), true, 'Can be called within the _on component function.');
        }, 100);
      },
      perpetual: function () {
        if (tic++) {
          this.wait(3, 100);
        } else {
          equal(tic, 1, 'Reinvokes the _on function when called perpetually.');
          this.target(4);
        }
      },
      done: function () {
        equal(this.wait(), true, 'Returns true from a trusted routine with no arguments.');
      },
      complete: function () {
        ok(1, 'Pauses indefinitely when passed no arguments.');
        start();
      }
    });
  equal(flow.wait(), false, 'Returns false when called from an untrusted routine.');
  equal(flow.wait(100), false, 'Returns false when called from an untrusted routine, and given an argument.');

  flow.target(1);
  setTimeout(function () {
    flow.target(5);
  }, 1000);
  stop();
});


test('.vars()', 12, function () {
  var flow = new Flow(),
    vName = 'foo',
    vValue = 1;
  equal(T.type(flow.vars()), 'array', 'Returns an array when called without arguments.');
  equal(flow.vars().length, 0, 'The array is empty by default.');
  [null, undefined, [], {}, function () {}, NaN].forEach(function (arg) {
    equal(flow.vars(arg), false, 'Returns false when the first argument is not a string.');
  });
  equal(flow.vars(vName), undefined, 'Returns "undefined" when retrieving an unknown variable.');
  equal(flow.vars()[0], vName, 'The array contains the names of active variables.');
  equal(flow.vars(vName, vValue), true, 'Returns true when setting a variable.');
  equal(flow.vars(vName), vValue, 'Returns the value previously set.');
});

test('.args()', 18, function () {
  var val1 = {},
    val2 = {},
    valAry = [val1, val2],
    flow = new Flow({
      none: {
        _in: function () {
          var args = this.args();
          equal(arguments.length, 0, 'No arguments are passed to non _on functions.');
          equal(args.length, 0, 'There are no flow arguments.');
          this.args(0, val2);
        },
        _on: function (arg) {
          equal(arg, val2, 'Sets arguments passed to the _on function.');
          equal(arguments.length, 1, 'No additional arguments are sent.');
        }
      },
      paused: function () {
        this.wait();
      }
    }),
    map = flow.map();
  equal(T.type(flow.args()), 'array', 'Returns an array when passed no parameters.');
  equal(flow.args(1), undefined, 'Returns "undefined" when passed a valid index.');
  [NaN, -1, function () {}, {}, true].forEach(function (arg) {
    equal(flow.args(arg), false, 'Returns false when the first index is "' + arg + '".');
  });
  equal(flow.args(valAry), true, 'Returns true when passed an array.');
  equal(flow.args()[valAry.length - 1], valAry[valAry.length - 1], 'Passing an array replaces the flow arguments.');
  valAry.push(val1);
  ok(flow.args().length !== valAry.length, 'Returns a cloned array.');
  map.none();
  equal(flow.args().length, 0, 'There are no arguments when a flow completes navigating.');
  map.paused(val1);
  equal(flow.args()[0], val1, 'Arguments are available when the flow is paused.');
  equal(flow.args(1, val2), true, 'Returns true when passed a valid index and second argument.');
  flow.args(1, undefined);
  equal(flow.args().length, 1, 'Removes the last argument when setting the last indice to undefined.');
});

test('.map()', 12, function () {
  var rtnVal = {},
    program = {
      a: {
        b: 1,
        c: 1
      },
      undef: function () {
        return undefined;
      },
      delayed: function () {
        this.wait();
      },
      rtnVal: function () {
        return rtnVal;
      },
      sum: function (a, b) {
        return a + b;
      },
      redirect: function () {
        equal(map.rtnVal(), false, 'Returns false when invoked within a component function.');
        return false;
      }
    },
    flow = new Flow(program),
    coreInst = Flow.pkg('core')(flow),
    curIndex = coreInst.tank.currentIndex,
    map = flow.map();
  equal(typeof map, 'function', 'Returns a function by default.');
  equal(map, coreInst.states[1].map, 'The function is the ".map" member of the _program state.');
  ok(map.hasOwnProperty('toString'), 'Have a custom .toString function.');
  ok(map.a && map.a.b && map.a.c, 'Functions match the order and heirarchy of the program.');
  equal(map(), true, 'Returns true when the corresponding state has no _on function');
  equal(map.undef(), true, 'Returns true when the corresponding state has an _on function that returns "undefined"".');
  equal(map.delayed(), false, 'Returns false when a component function halts traversal.');
  equal(map.rtnVal(), rtnVal, 'Returns a value when the corresponding state has an _on function that returns a value.');
  equal(map.sum(2, 2), 4, 'Passes arguments to the _on function.');
  equal(map.redirect(), rtnVal, 'Returns result of the final state when redirected.');
  ok(curIndex !== coreInst.tank.currentIndex, 'Changes the current state of a Flow.');
});

module('Scenario')

test('A locked flow denies external changes via proxy.args().', function () {
  
});

test('proxy.go() does not clear flow arguments.', function () {
  
});

test('proxy.go() resumes paused flows', function () {
  
});

test('proxy.status() is accurate during navigation.', function () {
  
});