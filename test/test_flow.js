var T = {
  type: function (thing) {
    return Object.prototype.toString.call(thing).match(/\s(.+)\]$/)[1].toLowerCase();
  }
};

module('Flow');

test('Dependencies', 3, function () {
  equal(typeof Panzer, 'object', 'The "Panzer" object is present.');
  equal(Panzer.version, '0.2.2', 'The correct version of Panzer is loaded.');
  ok(Array.prototype.indexOf, 'Array.prototype.indexOf exists.');
  ok(Array.prototype.every, 'Array.prototype.every exists.');
  ok(Flow.pkg().filter(function (pkg) {
      return pkg === 'core';
    }).length, 'The "core" package is present.');
});

test('Definition', 8, function () {
  var corePkgDef = Flow.pkg('core');
  'addStatus|events|attributeKey|invalidKey|init|onBegin|onTraverse|onEnd'.split('|').forEach(function (mbr) {
    ok(corePkgDef.hasOwnProperty(mbr), 'The package-definition has a "' + mbr + '" member.');
  });
});

test('Instance', 17, function () {
  var coreInst = Flow.pkg('core')(new Flow());
  'indexOf|vetIndexOf|getData|go'.split('|').forEach(function (mbr) {
    equal(typeof coreInst[mbr], 'function', 'The package-instance method "' + mbr + '" is present.');
  });
  'trust|args|calls|route|data|delay|cache|locked|nodeIds|pending|parents|targets|phase'.split('|').forEach(function (mbr) {
    ok(typeof coreInst[mbr] !== 'undefined', 'The package-instance property "' + mbr + '" is present.');
  });
});

test('State', 9, function () {
  var state = Flow.pkg('core')(new Flow()).nodes[0];
  'pendable|isRoot|rootIndex|restrict|map|data|fncs'.split('|').forEach(function (mbr) {
    ok(state.hasOwnProperty(mbr), 'Has the "' + mbr + '" member-property.');
  });
  equal(typeof state.scopeData, 'function', 'Has the "scopeData" member-function.');
  equal(typeof state.canTgt, 'function', 'Has the "canTgt" member-function.');
});

test('Proxy', 9, function () {
  var flow = new Flow();
  'map|query|lock|data|args|target|go|wait|status'.split('|').forEach(function (mbr) {
    equal(typeof flow[mbr], 'function', 'The proxy method "' + mbr + '" is present.');
  });
});

module('State Components');

test('parsing keys', 3, function () {
  var
    corePkg = Flow.pkg('core'),
    defCnt = corePkg(new Flow()).nodes.length,
    attrs = {
      _junk: {},
      '_': {},
      _in: {}
    },
    stateAttrs = corePkg(new Flow(attrs)).nodes[1].attributes,
    attr,
    hasAllAttrs = false;
  equal(corePkg(new Flow({
      '!@#$%^&*().,;:\'"]{}-+~`\\<>': 1, // no alphanumerics
      'a|': 1, // has pipe
      'a/': 1, // has forward slash
      '_a': 1, // begins with underscore
      '@a': 1, // begins with @
      '[a': 1, // begins with [
      toString: 1 // is the string "toString"
    })).nodes.length, defCnt,
    'A program with invalid keys has the expected number of states.'
  );
  equal(corePkg(new Flow({
      'a_': 1,
      'a@': 1,
      'a[': 1,
      'tostring': 1
    })).nodes.length, defCnt + 4,
    'A program with valid keys has the expected number of states.'
  );
  for (attr in stateAttrs) {
    if (stateAttrs.hasOwnProperty(attr) && (hasAllAttrs = stateAttrs[attr] === attrs[attr])) {
      break;
    }
  }
  ok(hasAllAttrs, 'A state, defined with underscore-prefixed keys, has the expected attributes.');
});

test('_on', 3, function () {
  var corePkg = Flow.pkg('core'),
    fnc = function () {};
  equal(corePkg(new Flow(fnc)).nodes[1].fncs[0], fnc, 'A single function passed to a new Flow is compiled as a function of the state.');
  equal(corePkg(new Flow({_on: fnc})).nodes[1].fncs[0], fnc, 'The _on component was compiled as a function of the state.');
  equal(corePkg(new Flow({_on: 1})).nodes[1].fncs[0], 0, 'The _on component was not compiled when not a function.');
});

test('_in', 2, function () {
  var corePkg = Flow.pkg('core'),
    fnc = function () {};
  equal(corePkg(new Flow({_in: fnc})).nodes[1].fncs[1], fnc, 'The _in component was compiled as a function of the state.');
  equal(corePkg(new Flow({_in: 1})).nodes[1].fncs[1], 0, 'The _in component was not compiled when not a function.');
});

test('_out', 2, function () {
  var corePkg = Flow.pkg('core'),
    fnc = function () {};
  equal(corePkg(new Flow({_out: fnc})).nodes[1].fncs[2], fnc, 'The _out component was compiled as a function of the state.');
  equal(corePkg(new Flow({_out: 1})).nodes[1].fncs[2], 0, 'The _out component was not compiled when not a function.');
});

test('_over', 2, function () {
  var corePkg = Flow.pkg('core'),
    fnc = function () {};
  equal(corePkg(new Flow({_over: fnc})).nodes[1].fncs[3], fnc, 'The _over component was compiled as a function of the state.');
  equal(corePkg(new Flow({_over: 1})).nodes[1].fncs[3], 0, 'The _over component was not compiled when not a function.');
});

test('_bover', 2, function () {
  var corePkg = Flow.pkg('core'),
    fnc = function () {};
  equal(corePkg(new Flow({_bover: fnc})).nodes[1].fncs[4], fnc, 'The _bover component was compiled as a function of the state.');
  equal(corePkg(new Flow({_bover: 1})).nodes[1].fncs[4], 0, 'The _bover component was not compiled when not a function.');
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
    })).nodes;
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
    })).nodes;
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
    })).nodes;
  '|||1|1|1'.split('|').forEach(function (restricted, stateIdx) {
      equal(states[stateIdx].restrict, restricted, 'The state at index ' + stateIdx + ', has the expected "restricted" flag.');
  });
});

test('_data', 30, function () {
  var obj = {},
    rand = Math.random(),
    stateData = [
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
      [ // /failedData/c
      ],
      [ // /failedData/d
      ],
      [ // /failedData/e
      ],
      [ // /failedData/f
      ],
      [ // /failedData/g
      ]
    ];
    Flow.pkg('core')(new Flow({
      _data: 1,
      a: {
        _data: ['a', ['b', {c: obj, d: rand}]],
        b: {
          _data: 'a',
          c: {
            _data: {a:obj}
          }
        },
        d: {
          _data: 0
        }
      },
      failedData: {
        _data: undefined,
        b: {
          _data: null
        },
        c: {
          _data: /s/
        },
        d: {
          _data: []
        },
        e: {
          _data: {}
        }
      }
    })).nodes.forEach(function (state, stateIdx) {
      state.data.forEach(function (dataSet, varIdx) {
        var varCfg = stateData[stateIdx][varIdx];
        equal(dataSet.name, varCfg.name, 'The variable ' + varIdx + ' of state ' + state.path + ', has the expected "name" value.');
        equal(dataSet.value, varCfg.value, 'The variable ' + varIdx + ' of state ' + state.path + ', has the expected "value" value.');
        equal(dataSet.use, varCfg.use, 'The variable ' + varIdx + ' of state ' + state.path + ', has the expected "use" value.');
      });
      if (!state.data.length) {
        ok(1, 'A _data component of "' + state.attributes._data + '" does not compile into variable configurations.');
      }
  });
});

module('Package');

test('.getData()', 15, function () {
  var corePkg = Flow.pkg('core'),
    pkgInst = corePkg(new Flow()),
    data,
    value = {},
    name = 'foo',
    name2 = 'bar',
    dto;
  function getData() {
    data = [];
    for (var varName in pkgInst.data) {
      if (pkgInst.data.hasOwnProperty(varName)) {
        data.push(varName);
      }
    }
  }

  getData();
  ok(!data.length, 'There are no active variables by default.');
  [null, undefined].forEach(function (arg) {
    equal(pkgInst.getData(arg), false, 'Passing "' + arg + '" returns false.');
  });
  dto = pkgInst.getData(name);
  equal(typeof dto, 'object', 'Passing a name argument returns an object.');
  getData();
  equal(data.length, 1, 'One variable tracking object exists.');
  ok(pkgInst.data.hasOwnProperty(name), 'The dto name is a key in the "data" member of the package-instance.');
  equal(dto.name, name, 'The dto\'s "name" member is the expected string.');
  equal(T.type(dto.values), 'array', 'The dto\'s "values" member is an array.');
  equal(dto.values.length, 0, 'The "values" array is empty.');
  equal(pkgInst.getData(name), dto, 'A dto is a singleton, representing a variable of the state.');
  pkgInst.getData(name, value);
  equal(dto.values.length, 0, 'Passing a values argument to an existing dto does not add values.');
  dto = pkgInst.getData(name2, value);
  equal(typeof dto, 'object', 'Passing two arguments returns a dto.');
  getData();
  equal(data.length, 2, 'Two dto\'s exist.');
  equal(dto.values.length, 1, 'The second dto has an initial value.');
  equal(dto.values[0], value, 'The second dto has the expected initial value.');
});

test('.go()', 10, function () {
  var flow = new Flow(),
    pkg = Flow.pkg('core')(flow),
    tank = pkg.tank;
  equal(tank.currentIndex, 0, 'The flow is currently on state 0.');
  equal(pkg.go.length, 0, 'pkg.go() expects no arguments.');
  equal(pkg.go(), 0, 'pkg.go() returns 0 when there are no indice in the pkg.targets array.');
  pkg.targets = [0];
  equal(pkg.go(), 1, 'The flow starts on the 0 state.');
  equal(tank.currentIndex, 0, 'The flow is now "on" the 0 state.');
  pkg.targets = [tank.currentIndex];
  equal(pkg.go(), 1, 'pkg.go() returns 1 when the pkg.targets index is the current state.');
  pkg.targets = [0, 1];
  equal(pkg.go(), 3, 'pkg.go() returns the number of steps (per state) traversed in order to navigate the pkg.target states.');
  equal(tank.currentIndex, 1, 'The flow is now at state 1.');
  pkg.pause = 1;
  pkg.go();
  equal(pkg.pause, 0, 'pkg.go() sets pkg.pause to 0, irregardless of pkg.targets.');
  pkg.pending = 1;
  pkg.targets = [0];
  equal(pkg.go(), 0, 'pkg.go() returns 0 when pkg.pending is truthy.');
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
    states = coreInst.nodes,
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

test('.vetIndexOf()', 3, function () {
  var coreDef = Flow.pkg('core'),
    coreInst = coreDef(new Flow(
      {
        _restrict: 1,
        node: {
          _restrict: 1
        }
      }
    ));
  equal(coreInst.vetIndexOf(2, coreInst.nodes[1]), 2, 'Returns the expected index when targeting a descendant of a restricted state.');
  equal(coreInst.vetIndexOf(2, coreInst.nodes[2]), -1, 'Returns -1 when targeting the restricted state.');
  equal(coreInst.vetIndexOf(1, coreInst.nodes[2]), -1, 'Returns -1 when targeting a state outside the path of the restricted state.');
});

module('State');

test('.scopeData()', 5, function () {
  var corePkg = Flow.pkg('core'),
    value = 'bar',
    coreInst = corePkg(new Flow({
      _data: [
        {
          foo: value
        }
      ]
    })),
    state = coreInst.nodes[1],
    dto = coreInst.getData('foo', 1);
  equal(state.scopeData(), undefined, 'Returns "undefined".');
  equal(dto.values.length, 2, 'Adds an index to the values array of the dto of a state.');
  equal(dto.values[0], value, 'Prepends a value to the values array of the dto.');
  state.scopeData(1);
  equal(dto.values.length, 1, 'Passing a truthy value removes an index from the dto values.');
  state.scopeData(1);
  ok(!coreInst.data.hasOwnProperty('foo'), 'When the dto has no more values, descoping removes the dto from the package-instance.');
});

test('.canTgt()', 16, function () {
  var
    pkg = Flow.pkg('core')(
      new Flow({ // 1
        a: { // 2
          a: 1 // 3
        },
        restrict: { // 4
          _restrict: 1,
          a: 1 // 5
        }
      })
    ),
    states = pkg.nodes;
  equal(states[0].canTgt.length, 1, 'state.canTgt() expects one argument.');
  equal(typeof states[0].canTgt(states[1]), 'boolean', 'Returns a boolean, when passed a state object.');
  equal(states[0].canTgt(states[1]), true, 'state.canTgt() permits targeting child states.');
  equal(states[0].canTgt(states[states.length - 1]), true, 'state.canTgt() permits targeting descendent states.');
  equal(states[3].canTgt(states[2]), true, 'state.canTgt() permits targeting the parent state.');
  equal(states[3].canTgt(states[0]), true, 'state.canTgt() permits targeting ancestor states.');
  equal(states[4].restrict, true, 'There is a restricted state.');
  equal(states[4].canTgt(states[5]), true, 'Restricted states can target descendant states.');
  equal(states[4].canTgt(states[3]), false, 'Restricted states can not target ancestor states.');
  equal(states[4].canTgt(states[4]), false, 'Restricted states can not target themselves.');
  raises(function () {
    states[4].canTgt();
  }, 'state.canTgt() throws an error on restricted states, when called with no arguments.');
  ['foo', 1, {}, [], function () {}].forEach(function (param) {
    raises(function () {
      states[4].canTgt(param);
    }, 'state.canTgt() throws an error on resricted states, when passed a "' + typeof param + '".');
  });
});

module('Proxy');

test('.lock()', 16, function  () {
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
          equal(this.target(1), true, 'Returns true when redirecting with valid paremeters.');
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
      pause: function () {
        this.wait();
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

test('.wait()', 20, function () {
  var tic = 0,
    tgtTics = 9,
    flow = new Flow({
      _in: function () {
        var scope = this;
        equal(this.wait(), true, 'Returns true when called internally, with no arguments.');
        equal(this.wait(0), true, 'Returns true when passed an integer greater-than-or-equal-to zero.');
        equal(this.wait(.1), true, 'Returns true when passed a decimal greater-than-or-equal-to zero.');
        equal(this.wait(2, 0), true, 'Returns true when passed a state index and valid integer.');
        equal(this.wait('//', 0), true, 'Returns true when passed a state query and valid integer.');
        equal(this.wait(function () {ok(1, 'THIS CALLBACK SHOULD NOT FIRE.')}, 0), true, 'Returns true when passed a function and valid integer.');
        [NaN, -1, null, {}, [], undefined, function () {}].forEach(function (param) {
          equal(scope.wait(param), false, 'Returns false when passed a single "' + param + '" (' + T.type(param) + ').');
        });
        this.wait();
        equal(this.status().paused, true, 'The flow is paused after a successful proxy.wait() call.');
        this.go();
        equal(this.status().paused, false, 'The flow is not paused after calling proxy.go() or proxy.target().');
      },
      _on: function () {
        this.target('delay');
      },
      delay: function () {
        var scope = this;
        this.wait(function () {
          ok(this === scope, 'Scope of proxy.wait()-callback is the flow proxy.');
          equal(this.wait('//perpetual/', 0), true, 'proxy.wait() can be called from within a proxy.wait()-callback.');
        }, 0);
      },
      perpetual: {
        _in: function () {
          this.wait(function () {
            if (tic++ < tgtTics) {
              this.wait(arguments.callee, 0);
            }
          }, 0);
        },
        _on: function () {
          equal(tic, tgtTics + 1, 'proxy.wait() can perpetually delay a flow from navigating towards a target state.');
          this.target('//endtests/');
        }
      },
      endtests: function () {
        start();
      }
    });
  equal(flow.wait(), false, 'Returns false when called externally.');
  flow.target(1);
  equal(flow.status().paused, true, 'proxy.wait() interrupts the execution flow, the same as window.setTimeout().');
  stop();
});

test('.bless()', function  () {
  var
    value = {},
    flow = new Flow({
      _on: function () {
        ok(
          ![null, undefined, NaN, '', 1, {}, []].some(function (arg) {
            return flow.bless(arg);
          }),
          'Returns false when called without a function.'
        );
        equal(typeof flow.bless(function () {}), 'function', 'Returns a function when passed a function.');
        blessedFnc = flow.bless(unblessedFnc);
        this.lock(1);
      },
      foo: function () {
        return value;
      }
    }),
    unblessedFnc = function () {
      return flow.target('//foo/');
    },
    blessedFnc;
  ok(!flow.bless(function () {}), 'Returns false when called from an untrusted routine.');
  ok(
    !flow.lock()
    && flow.target(1)
    && flow.lock()
    && unblessedFnc() == false
    && blessedFnc() === value,
    'A blessed untrusted function can direct a locked flow.'
  );
});

test('.data()', function () {
  var flow = new Flow(),
    vName = 'foo',
    vValue = 1;
  equal(T.type(flow.data()), 'array', 'Returns an array when called without arguments.');
  equal(flow.data().length, 0, 'The array is empty by default.');
  [null, undefined, [], {}, function () {}, NaN].forEach(function (arg) {
    equal(flow.data(arg), false, 'Returns false when the first argument is not a string.');
  });
  equal(flow.data(vName), undefined, 'Returns "undefined" when retrieving an unknown variable.');
  equal(flow.data()[0], vName, 'The array contains the names of active variables.');
  equal(flow.data(vName, vValue), true, 'Returns true when setting a variable.');
  equal(flow.data(vName), vValue, 'Returns the value previously set.');
});

test('.args()', 19, function () {
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
  ok(flow.args() !== flow.args(), 'The array returned is unique.');
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
        equal(map.rtnVal(), true, 'Returns true when invoked within a component function.');
        return false;
      }
    },
    flow = new Flow(program),
    coreInst = Flow.pkg('core')(flow),
    curIndex = coreInst.tank.currentIndex,
    map = flow.map();
  equal(typeof map, 'function', 'Returns a function by default.');
  equal(map, coreInst.nodes[1].map, 'The function is the ".map" member of the _program state.');
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

test('status()', 12, function () {
  var status = (new Flow({})).status();
  'trust|loops|depth|paused|pending|pendable|targets|route|path|index|phase|state'
    .split('|')
    .forEach(
      function (mbr) {
        ok(status.hasOwnProperty(mbr), 'The status object contains a "' + mbr + '" member.');
      }
    );
});

module('pkg.status()');

test('PackageDefinition.addStatus Framework', 21, function () {
  var corePkgDef = Flow.pkg('core'),
    oldAddStatus = corePkgDef.addStatus,
    flow = new Flow(),
    params = [0, 1, NaN, undefined, null, {}, [], 'foo'];
  corePkgDef.addStatus = function (existingObject) {
    ok(this === corePkgDef(flow), 'Scope of PkgDef.addStatus() is the package instance.');
    equal(typeof existingObject, 'object', 'An existing object is passed to PkgDef.addStatus().');
    existingObject.foo = 'bar';
  };
  deepEqual(flow.status(), {foo:'bar'}, 'Editing keys of the addStatus argument, impacts the status object.');
  [[1,2,3], {0:1, 1:2, 2:3}].forEach(function (val) {
    corePkgDef.addStatus = function () {
      return val;
    };
    deepEqual(flow.status(), {0:1, 1:2, 2:3}, 'When PkgDef.addStatus() returns a ' + T.type(val) + ', it\'s members are added to the status object.');
  });
  params.forEach(function (val) {
    corePkgDef.addStatus = val;
    deepEqual(flow.status(),{},'Setting PkgDef.addStatus to "' + val + '" (' + T.type(val) + ') does not impact the status object.');
  });
  params.forEach(function (val) {
    corePkgDef.addStatus = function () {
      return val;
    };
    deepEqual(flow.status(),{},'When PkgDef.addStatus is a function that returns (an empty) "' + val + '" (' + T.type(val) + ') it does not impact the status object.');
  });
  corePkgDef.addStatus = oldAddStatus;
});

test('.trust', 6, function () {
  var flow = new Flow({
      _on: function () {
        equal(this.status().trust, true, 'status.trust is true when called internally.');
      },
      wait: function () {
        this.wait(function () {
          equal(this.status().paused, false, 'The flow is no longer paused.');
          equal(this.status().trust, true, 'status.trust is true when called internally from a delayed function.');
          start();
        },10);
        equal(this.status().paused, true, 'The flow is paused.');
      }
    });
  equal(flow.status().trust, false, 'status.trust is false when called externally.');
  flow.target(1);
  flow.target('//wait/');
  equal(flow.status().trust, false, 'status.trust is false when called externally and the flow is idle.');
  stop();
});

test('.loops', 6, function () {
  var tic = 0,
    tgtLoops = 3,
    pend = (new Flow({
      _on: function () {
        this.wait();
      },
      reset: 1
    })).map(),
    flow = new Flow({
      _on: function () {
        var loops = this.status().loops;
        tic++;
        if (loops === tgtLoops) {
          equal(tic - 1, loops, 'status.loops reflects one less-than the number of times a program function executes, during a single traversal.');
          this.wait();
          equal(this.status().paused, true, 'The flow is now paused.');
        } else {
          this.target(1);
        }
      },
      pend: function () {
        if (this.status().loops) {
          pend();
          equal(this.status().pending, true, 'The flow is now pending.');
        } else {
          this.go(2);
        }
      }
    });
  equal(flow.status().loops, 0, 'status.loops is 0 when the flow is idle.');
  flow.target(1);
  equal(flow.status().loops, tgtLoops, 'status.loops is preserved when the flow is paused.');
  flow.target('//pend/');
  equal(flow.status().loops, 1, 'status.loops is preserved when the flow is pending.');
});

test('.depth', 7, function () {
  var depthTest = function (depth) {
      return function () {
        equal(this.status().depth, depth, 'The depth is accurate.');
      }
    },
    flow = new Flow({
      _in: depthTest(1),
      _out: depthTest(1),
      deep: {
        _in: depthTest(2),
        deeper: {
          _in: depthTest(3),
          deepest: depthTest(4)
        }
      }
    });
  equal(flow.status().depth, 0, 'status.depth starts at 0.');
  flow.target('//deep/deeper/deepest/');
  equal(flow.status().depth, 4, 'status.depth is the same whether called internally or externally.');
  flow.target(0);
});

test('.paused', 6, function () {
  var flow = new Flow({
      pause: function () {
        this.wait();
        equal(this.status().paused, true, 'status.paused is true after calling pkg.wait().');
      },
      delay: {
        _in: function () {
          equal(this.status().paused, false, 'status.paused is false at the start of any program function.');
          this.wait(function () {
            equal(this.status().paused, false, 'status.paused is false before executing delayed functions, via pkg.wait().');
          }, 10);
        },
        _on: function () {
          start();
        }
      }
    });
  equal(flow.status().paused, false, 'status.paused is false by default.');
  flow.target('//pause/');
  equal(flow.status().paused, true, 'status.paused returns the same boolean, whether called internally or externally.');
  flow.target('//delay/');
  equal(flow.status().paused, true, 'status.paused is true after a flow is delayed.');
  stop();
});

test('.pending', 10, function () {
  var pend = (new Flow({
      _on: function () {
        this.wait();
      },
      reset: 1
    })).map(),
    nestedPender = (new Flow({
      _on: function () {
        pend();
      },
      reset: 1
    })).map(),
    doublePender = (new Flow({
      _on: function () {
        pend();
        this.wait();
      },
      reset: 1
    })).map(),
    flow = new Flow({
      _on: function () {
        pend();
        equal(flow.status().pending, true, 'status.pending is true when a child flow is paused.');
      },
      nestedPending: function () {
        equal(flow.status().pending, false, 'status.pending is false at the start of any program function.');
        nestedPender();
      },
      doublePending: function () {
        doublePender();
      }
    });
  equal(flow.status().pending, false, 'status.pending is false by default.');
  flow.target(1);
  equal(flow.status().pending, true, 'status.pending returns the same boolean, whether called internally or externally.');
  pend.reset();
  equal(flow.status().pending, false, 'status.pending is false when the paused child flow is resumed.');
  flow.target('//nestedPending/');
  equal(flow.status().pending, true, 'status.pending is true when a descendant flow is paused.');
  pend.reset();
  equal(flow.status().pending, false, 'status.pending is false when a descendent flow is resumed.');
  flow.target('//doublePending/');
  equal(flow.status().pending, true, 'status.pending is true when a descendant flow is paused.');
  doublePender.reset();
  equal(flow.status().pending, true, 'status.pending is true while any descendent flows are paused.');
  pend.reset();
  equal(flow.status().pending, false, 'status.pending is false when all descendant flows are resumed.');
});

test('.pendable', 5, function () {
  var flow = new Flow({
    a: {
      _pendable: 0,
      b: {
        _pendable: 1
      }
    },
    c: 2
  });
  equal(flow.status().pendable, true, 'status.pendable is true for the _flow state.');
  flow.go(1);
  equal(flow.status().pendable, true, 'status.pendable is true by default.');
  flow.go(2);
  equal(flow.status().pendable, false, 'status.pendable reflects the _pendable component.');
  flow.go(3);
  equal(flow.status().pendable, false, 'status.pendable is false when an ancestor state\'s _pendable component is set to a falsy value.');
  flow.go(4);
  equal(flow.status().pendable, true, 'status.pendable reflects the current state.');
});

test('.targets', 17, function () {
  var pend = (new Flow({
      _on: function () {
        this.wait();
      },
      reset: 1
    })).map(),
    flow = new Flow({
      _in: function () {
        ok(this.status().targets.length, 'status.targets is not empty for the _in component function.');
      },
      _out: function () {
        ok(this.status().targets.length, 'status.targets is not empty for the _out component function.');
      },
      over: {
        _over: function () {
          ok(this.status().targets.length, 'status.targets is not empty for the _over component function.');
        }
      },
      bover: {
        _bover: function () {
          ok(this.status().targets.length, 'status.targets is not empty for the _bover component function.');
        }
      },
      traverse: {
        _on: function () {
          this.target('end');
          deepEqual(this.status().targets, ['//traverse/end/'], 'status.targets reflects single state added via pkg.target().');
          this.go('one','two');
          deepEqual(this.status().targets, ['//traverse/one/', '//traverse/two/','//traverse/end/'], 'status.targets reflects states added via pkg.go().');
        },
        one: function () {
          deepEqual(this.status().targets, ['//traverse/two/','//traverse/end/'], 'status.targets accurately reflects the states awaiting traversal.');
        },
        two: function () {
          deepEqual(this.status().targets, ['//traverse/end/'], 'status.targets reflects the states awaiting traversal.');
        },
        end: {
          _in: function () {
            deepEqual(this.status().targets, ['//traverse/end/'], 'status.targets preserves a target until it\'s _on component is traversed.');
          },
          _on: function () {
            ok(!this.status().targets.length, 'status.targets is empty on the _on component of the destination state.');
          }
        }
      },
      pause: {
        _in: function () {
          this.wait();
        }
      },
      pend: {
        _in: function () {
          pend();
        }
      }
    });
  ok(!flow.status().targets.length, 'status.targets is empty by default.');
  ok(flow.status().targets !== flow.status().targets, 'status.targets is a new array everytime.');
  flow.target('//traverse');
  flow.target('//pause/');
  equal(flow.status().paused, true, 'The flow is paused.');
  deepEqual(flow.status().targets, ['//pause/'], 'status.targets is preserved when the flow is paused.');
  flow.target('//pend/');
  equal(flow.status().pending, true, 'The flow is pending.');
  deepEqual(flow.status().targets, ['//pend/'], 'status.targets is preserved when the flow is pending.');
  pend.reset();
  flow.target(0);
  ok(!flow.status().targets.length, 'status.targets is empty when the flow is idle.');
});

test('.route', 20, function () {
  var pend = (new Flow({
      _on: function () {
        this.wait();
      },
      reset: 1
    })).map(),
    flow = new Flow({
      _in: function () {
        var stat = this.status();
        deepEqual(stat.route, ['//'], 'status.route reflects states traversed to reach this state.');
        equal(stat.route.slice(-1)[0], stat.path, 'The last state in status.route is the state containing the _over component function.');
      },
      _out: function () {
          var stat = this.status();
          equal(stat.route.slice(-1)[0], stat.path, 'The last state in status.route is the state containing the _out component function.');
      },
      over: {
        _over: function () {
          var stat = this.status();
          equal(stat.route.slice(-1)[0], stat.path, 'The last state in status.route is the state containing the _over component function.');
        }
      },
      bover: {
        _bover: function () {
          var stat = this.status();
          equal(stat.route.slice(-1)[0], stat.path, 'The last state in status.route is the state containing the _bover component function.');
        }
      },
      hidden: 1,
      hop: {
        _over: function () {
          this.go('//hop/skip/','//hop/');
        },
        skip: 1
      },
      traverse: {
        _on: function () {
          var stat = this.status();
          deepEqual(stat.route, ['//', '//over/', '//bover/', '//hidden/', '//hop/', '//hop/skip/', '//hop/', '//traverse/'], 'status.route references all states, whether they have component functions or are traversed twice.');
          equal(stat.route.slice(-1)[0], stat.path, 'The last state in status.route is the state containing the _on component function.');
        },
        start: function () {
          var stat = this.status();
          ok(stat.route.length, 'status.route is always populated when called internally.');
          deepEqual(stat.route, ['//traverse/start/'], 'status.route always begins with the current state.');
          this.go('../one', '../two', '../end');
        },
        one: function () {
          deepEqual(this.status().route, ['//traverse/start/','//traverse/one/'], 'status.route accurately reflects the states traversed.');
        },
        two: function () {
          deepEqual(this.status().route, ['//traverse/start/','//traverse/one/', '//traverse/two/'], 'status.route accurately reflects the states traversed.');
        },
        end: function () {
          deepEqual(this.status().route, ['//traverse/start/','//traverse/one/', '//traverse/two/', '//traverse/end/'], 'status.route accurately reflects the states traversed.');
        }
      },
      pause: {
        _in: function () {
          this.wait();
        }
      },
      pend: {
        _in: function () {
          pend();
        }
      }
    });
  ok(!flow.status().route.length, 'status.route is empty by default.');
  ok(flow.status().route !== flow.status().route, 'status.route is a new array everytime.');
  flow.target('//traverse/');
  flow.target('//traverse/start/');
  flow.target('//pause/');
  equal(flow.status().paused, true, 'The flow is paused.');
  equal(flow.status().route[0], '//traverse/end/', 'status.route captures states exited, when navigating towards a target.');
  deepEqual(flow.status().route, ['//traverse/end/', '//traverse/two/', '//traverse/one/', '//traverse/start/', '//traverse/', '//pause/'], 'status.targets is preserved when the flow is paused.');
  flow.target('//pend/');
  equal(flow.status().pending, true, 'The flow is pending.');
  deepEqual(flow.status().route, ['//traverse/end/', '//traverse/two/', '//traverse/one/', '//traverse/start/', '//traverse/', '//pause/', '//pend/'], 'status.targets is preserved when the flow is pending.');
  pend.reset();
  flow.target(0);
  ok(!flow.status().route.length, 'status.routeis empty when the flow is idle.');
});

test('.path', 5, function () {
  var flow = new Flow({
    a: {
      b: 1
    },
    c: 2
  });
  equal(flow.status().path, '..//', 'status.path is "..//" by default.');
  flow.go(1);
  equal(flow.status().path, '//', 'status.path is "//" when on the program state.');
  flow.go(2);
  equal(flow.status().path, '//a/', 'status.path reflects the current state.');
  flow.go(3);
  equal(flow.status().path, '//a/b/', 'status.path reflects the current state.');
  flow.go(4);
  equal(flow.status().path, '//c/', 'status.path reflects the current state.');
});

test('.index', 5, function () {
  var flow = new Flow({
    a: {
      b: 1
    },
    c: 2
  });
  equal(flow.status().index, 0, 'status.index is 0 by default.');
  flow.go(1);
  equal(flow.status().index, 1, 'status.index is 1 for the program state.');
  flow.go(2);
  equal(flow.status().index, 2, 'status.index reflects the current state.');
  flow.go(3);
  equal(flow.status().index, 3, 'status.index reflects the current state.');
  flow.go(4);
  equal(flow.status().index, 4, 'status.index reflects the current state.');
});

test('.phase', 13, function () {
  var corePkgDef = Flow.pkg('core'),
    oldOnName = corePkgDef.events[0],
    newOnName = 'foo',
    pend = (new Flow({
      _on: function () {
        this.wait();
      },
      reset: 1
    })).map(),
    testPhase = function (phase) {
      return function () {
        equal(this.status().phase, phase, 'status.phase is "' + phase + '" as expected.');
      };
    },
    flow = new Flow({
      _in: testPhase('in'),
      _out: testPhase('out'),
      pend: function () {
        pend();
      },
      over: {
        _over: testPhase('over')
      },
      bover: {
        _bover: testPhase('bover')
      },
      hold: function () {
        equal(flow.status().phase, 'on', 'status.phase is "on" as expected.');
        this.wait();
      }
    });
  equal(flow.status().phase, '', 'status.phase is an empty string by default.');
  flow.target('//hold/');
  ok(flow.status().phase, 'status.phase is available when the flow is paused.');
  corePkgDef.events[0] = newOnName;
  equal(flow.status().phase, newOnName, 'status.phase reflects the indice from the PkgDef.events array.');
  corePkgDef.events[0] = oldOnName;
  flow.target('//pend/');
  equal(flow.status().paused, false, 'The flow is no longer paused.');
  equal(flow.status().pending, true, 'The flow is pending.');
  equal(flow.status().phase, 'on', 'status.phase is available hwen the flow is pending.');
  pend.reset();
  equal(flow.status().pending, false, 'The flow is no longer pending.');
  flow.target(0);
  ok(!flow.status().phase, 'status.phase is an empty string when idle.');
});

test('.state', 5, function () {
  var flow = new Flow({
    a: {
      b: 1
    },
    c: 2
  });
  equal(flow.status().state, '_flow', 'status.state is "_flow" by default.');
  flow.go(1);
  equal(flow.status().state, '_root', 'status.state is "_root" when on the program state.');
  flow.go(2);
  equal(flow.status().state, 'a', 'status.state reflects the current state.');
  flow.go(3);
  equal(flow.status().state, 'b', 'status.state reflects the current state.');
  flow.go(4);
  equal(flow.status().state, 'c', 'status.state reflects the current state.');
});

module('Scenario');

test('Control executions during asynchrounous actions.', 8, function () {
  var scenario = new Flow({
    restrict: function () {
      var async = new Flow({
          _restrict: 1,
          _on: function () {
            this.target('//done/');
            this.wait(0);
          },
          done: function () {
            ok(1, 'The restricted async action has completed.');
          }
        });
      equal(async.go(1), true, 'Started a restricted async action.');
      ok(!async.query(0, 1), 'Cannot re-execute the restricted async action nor ancestor states.');
      deepEqual(async.query('//done/'), ['//done/'], 'Can navigate to descendants of the restricted async action.');
    },
    lock: function () {
      var async = new Flow({
        _on: function () {
          this.lock(1);
          equal(this.lock(), true, 'The async flow is now locked.');
          this.target('//done/');
          this.wait(0);
        },
        done: function () {
          ok(1, 'The locked async flow has completed.');
        }
      });
      equal(async.go(1), true, 'Started a locked async action.');
      ok(!async.query(0, 1, '//done/'), 'Cannot navigate to any state of the locked flow.');
    },
    done: function () {
      start();
    }
  });
  scenario.go('//restrict', '//lock', '//done');
  stop();
});

test('Traversal method behavior on a locked flow.', 16, function () {
  var flow = new Flow(function () {
    this.lock(1);
    equal(this.lock(), true, 'The flow is now locked.');
    equal(this.args(0, 'bacon'), true, 'pkg.args() can set arguments internally.');
    equal(this.go(0), true, 'pkg.go() works internally.');
    equal(this.target(0, 'foo'), true, 'pkg.target() works internally.');
    equal(this.args(0), 'foo', 'Using pkg.target() internally does change arguments.');
    equal(this.data('hello', 'chicken'), true, 'pkg.data() works internally.');
    this.wait(function () {
        this.lock(0);
        equal(this.lock(), false, 'The flow is now unlocked.');
        start();
      },
      10
    );
    equal(this.status().paused, true, 'The locked flow is now paused.');
  });
  flow.target(1);
  equal(flow.lock(), true, 'Externally, after pausing navigation, pkg.lock() returns true.');
  equal(flow.args(0), 'foo', 'pkg.args() can get arguments externally.');
  equal(flow.args(0, 'bar'), false, 'pkg.args() will not set arguments externally.');
  equal(flow.data('hello'), 'chicken', 'pkg.data() can get variables externally.');
  equal(flow.data('hello', 'world'), true, 'pkg.data() can set variables externally.');
  equal(flow.go(0), false, 'pkg.go() does not work externally.');
  equal(flow.target(0, 'bar'), false, 'pkg.target() does not work externally.');
  equal(flow.args(0), 'foo', 'Using pkg.target() externally does not change arguments.');
  stop();
});

test('Buffered execution, after numerous calls.', 2, function () {
  var i = 0, callCnt = 100,
    arbitraryEventData = {},
    eventHandlerFlow = new Flow({
      _data: {bufferCount: 0},
      _on: function (evtData) {
        this.data('bufferCount', this.data('bufferCount') + 1);
        this.go('//handleEvent/');
        this.wait(0);
      },
      handleEvent: function (eventData) {
        equal(this.data('bufferCount'), callCnt, 'The flow was called ' + callCnt + ' times, and the target behavior executed once.');
        strictEqual(eventData, arbitraryEventData, 'The execution recieved the original arguments.');
        start();
      }
    }),
    eventHandlerCallBack = eventHandlerFlow.map();
  for (; i < callCnt; i++) {
    eventHandlerCallBack(arbitraryEventData);
  }
  stop();
});

test('Flow arguments are passed to the _on function of the last/destination state.', 7, function () {
  var argValue = {},
    plannedRoute = new Flow({
      waypoint: function () {
        ok(this.status().targets.length, 'Traversing a state with more targets to go.');
        ok(!arguments.length, 'No arguments passed to this waypoint state.');
      },
      destination: function (arg) {
        strictEqual(arg, argValue, 'Arguments passed to the destination state.');
      }
    }),
    dynamicStateFnc = function (arg) {
      var status = this.status();
      strictEqual(arg, argValue, 'Arguments pushed to "' + status.path + '" after visiting ' + (status.route.length - 1) + ' states, the current last/destination state.');
      this.go('@next');
    },
    dynamicRoute = new Flow({
      a: dynamicStateFnc,
      b: dynamicStateFnc,
      c: dynamicStateFnc
    });

  plannedRoute.args(0, argValue);
  strictEqual(plannedRoute.args(0), argValue, 'Arguments have been preloaded.');
  plannedRoute.go('//waypoint/', '//destination/');
  dynamicRoute.target(1);
  dynamicRoute.args(0, argValue);
  dynamicRoute.target('//a/', argValue);
});

test('Calculate the fibonacci number of 1000 without causing a stack-overflow.', 1, function () {
  var fibonacci = (new Flow(function (number, previousNumber, currentNumber) {
    if (arguments.length === 1) {
      previousNumber = 0;
      currentNumber = 1;
    }
    if (number--) {
      this.target('//', number, currentNumber, previousNumber + currentNumber);
    } else {
      return currentNumber;
    }
  })).map();
  equal(fibonacci(10), 89,'The "fibonacci" flow works as expected.');
  fibonacci(1000);
});

test('Prevent consecutive execution for the same state.', 1, function () {
  var tic = 0,
    doImportantThing = (new Flow({
      _in: function () {
        tic++;
      }
    })).map();
  doImportantThing();
  doImportantThing();
  equal(tic, 1, 'Function executed once!');
});

test('Reversing the flow\'s direction during an _over and _bover step does not trigger the other step.', 10, function () {
  var tic = 0,
    pause = 0,
    overBounce = new Flow({
      hump: {
        _over: function () {
          tic++;
          this.target(1);
          if (pause) {
            this.wait();
          }
        },
        _bover: function () {
          tic++;
        }
      },
      point: 1
    }),
    boverBounce = new Flow({
      hump: {
        _bover: function () {
          tic++;
          this.target('//point/');
          if (pause) {
            this.wait();
          }
        },
        _over: function () {
          tic++;
        }
      },
      point: 1
    });
  overBounce.target('//point/');
  equal(tic, 1, 'Bouncing the flow from the _over step does not trigger the _bover step.');
  pause = 1;
  overBounce.target('//point/');
  equal(overBounce.status().paused, true, 'The flow is paused...');
  equal(overBounce.status().phase, 'over', '...at the _over step.');
  overBounce.go();
  equal(overBounce.status().paused, false, 'The flow was resumed.');
  equal(tic, 2, 'Bouncing the flow from the _over step, after pausing, does not trigger the _bover step.');
  boverBounce.target('//point/');
  pause = tic = 0;
  boverBounce.target(0);
  equal(tic, 1, 'Bouncing the flow from the _bover step does not trigger the _over step.');
  pause = 1;
  boverBounce.target(0);
  equal(boverBounce.status().paused, true, 'The flow is paused...');
  equal(boverBounce.status().phase, 'bover', '...at the _bover step.');
  boverBounce.go();
  equal(boverBounce.status().paused, false, 'The flow was resumed.');
  equal(tic, 2, 'Bouncing the flow from the _bover step, after pausing, does not trigger the _over step.');
});

test('Automatic execution of prerequisite functions.', 1, function () {
  var prereqs = 0,
    modelPrereq = {
      _over: function () {
        this.go('@self');
      },
      _on: function () {
        prereqs++;
      }
    },
    appFlow = new Flow({
      bootstrap: modelPrereq,
      preload: modelPrereq,
      initialize: modelPrereq,
      register: modelPrereq,
      start: function () {
        equal(prereqs, 4, 'Earlier states self-executed using the _over component.');
      }
    }),
    app = appFlow.map();
  app.start();
});

test('Alter arguments before executing a function.', function () {
  var echo = function (arg) {
      return arg;
    },
    invertEcho = (new Flow({
      _in: function () {
        this.args(0, this.args(0).split('').reverse().join(''));
      },
      _on: echo
    })).map(),
    input = 'hello',
    invertEchoOutput = input.split('').reverse().join('');
  equal(echo(input), input, 'The raw function works as expected.');
  equal(invertEcho(input), invertEchoOutput, 'The flow alters the original arguments as expected.');
});

test('Execute a function sequence.', 1, function () {
  var strings = [],
    phrase = 'hello foo bar',
    modelFnc = function () {
      strings.push(this.status().state);
      this.wait(Math.random() * 100);
    },
    sequence = new Flow({
      bar: modelFnc,
      hello: modelFnc,
      foo: modelFnc,
      done: function () {
        equal(strings.join(' '), phrase, 'The randomly delayed functions executed in their given sequence.');
        start();
      }
    });
  sequence.go('//hello/', '//foo/', '//bar/', '//done/');
  stop();
});