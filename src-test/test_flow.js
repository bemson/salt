var FT = {
  pkgName: 'test',
  type: function (thing) {
    return Object.prototype.toString.call(thing).match(/\s(.+)\]$/)[1].toLowerCase();
  }
};

module('Flow');

test('Dependencies', 6, function () {
  equal(typeof genData, 'function', 'genData is present.');
  equal(typeof Flow, 'function', 'Flow is present.');
  ok(Array.prototype.some, 'Array.prototype.some exists.');
  ok(Array.prototype.filter, 'Array.prototype.filter exists.');
  ok(Array.prototype.forEach, 'Array.prototype.forEach exists.');
  ok(Array.prototype.map, 'Array.prototype.map exists.');
});

test('Instances', 35, function () {
  var flow = new Flow(),
    paramOpts = [null, undefined, 1, 'foo', [], function () {}, {}],
    paramCnt = paramOpts.length,
    type = FT.type;
  raises(Flow, 'Requires the "new" operator.');
  ok(!(flow instanceof Flow), 'The flow instance is not Flow.');
  equal(flow.constructor, Flow, 'The "constructor" member of the flow instance is Flow.');
  ok(flow.hasOwnProperty('toString'), 'Instances have "toString" member.');
  ok(flow.hasOwnProperty('pkgs'), 'Instances have a "pkgs" member.');
  equal(typeof flow.toString, 'function', '"toString" is a function.');
  equal(typeof flow.pkgs, 'object', '"pkgs" is an object.');
  paramOpts.forEach(function (opt, idx) {
    equal(typeof flow.toString(opt), 'string', 'toString() returns a string when passed a "' + type(opt) + '".');
    ok(new Flow(opt), 'Instantiates when program parameter is "' + type(opt) + '".');
    ok(new Flow(opt, paramOpts[paramCnt - (idx + 1)]), 'Instantiates when program parameter is "' + type(opt) + '" and extra parameter is "' + type(paramOpts[paramCnt - (idx + 1)]) + '".');
    ok(new Flow(paramOpts[paramCnt - (idx + 1)], opt), 'Instantiates when program parameter is "' + type(paramOpts[paramCnt - (idx + 1)]) + '" and extra parameter is "' + type(opt) + '".');
  });
});

test('API', 11, function () {
  var flow = new Flow(),
    pkgsList,
    pkg, pkgCnt = 0,
    badParams = [0, 1, [], {}, function(){}],
    type = FT.type;
  equal(typeof Flow.pkg, 'function', 'Flow.pkg() is a static method.');
  badParams.forEach(function (prm) {
    equal(Flow.pkg(prm), false, 'Flow.pkg() returns false when passed a "' + type(prm) + '".');
  });
  pkgsList = Flow.pkg();
  equal(pkgsList.constructor, Array, 'Flow.pkg() returns an array when not passed arguments.');
  equal(pkgsList.length, 0, 'No packages exist by default.');
  ok(flow.hasOwnProperty('pkgs'), 'Instances have a member "pkgs".');
  equal(typeof flow.pkgs, 'object', 'The member "pkgs" is an object.');
  for (pkg in flow.pkgs) {
    if (flow.pkgs.hasOwnProperty(pkg)) {
      pkgCnt++;
    }
  }
  equal(pkgCnt, 0, 'Instances have no packages by default.');
});

module('Package');

test('Members', 15, function () {
  var flowBefore = new Flow(),
    pkgDef = Flow.pkg(FT.pkgName),
    defMbrs = 'init|dataKey|invalidKey|onBegin|onEnd|onTraverse'.split('|'),
    defProtos = 'proxy|state'.split('|'),
    flow = new Flow();
  equal(1, Flow.pkg().length, 'Added the "' + FT.pkgName + '" package.');
  equal(FT.pkgName, Flow.pkg()[0], 'The only package is "' + FT.pkgName + '".');
  equal(pkgDef, Flow.pkg(FT.pkgName), 'A package definition is a singleton.');
  equal(typeof pkgDef, 'function', 'A package definition is a function.');
  ok(flow.pkgs.hasOwnProperty(FT.pkgName), 'The "' + FT.pkgName + '" package is now available to instances.');
  defMbrs.forEach(function (mbr) {
    equal(0, pkgDef[mbr], 'The "' + mbr + '" member of the definition is 0, by default');
  });
  defProtos.forEach(function (mbr) {
    equal(typeof pkgDef[mbr], 'object', 'The "' + mbr + '" member of the definition is an object.');
  });
  equal(pkgDef(flowBefore) instanceof pkgDef, false, 'Package instances are not available from Flow instances created before the package is defined.');
  ok(pkgDef(flow) instanceof pkgDef, 'Package definition functions retrieve package instances from Flow instances.');
});

test('Proxy', 8, function () {
  var pkgName = FT.pkgName,
    pkgDef = Flow.pkg(pkgName),
    flow = new Flow(),
    pkgInst = pkgDef();
  ok(flow.pkgs.hasOwnProperty(pkgName), 'The flow instance has a proxy package-instance of the same name in the "pkgs" member.');
  equal(typeof flow.targetMethod, 'undefined', 'A target method does not exist in the flow instance.');
  equal(typeof flow.pkgs[pkgName].targetMethod, 'undefined', 'A target method does not exist in the "pkgs" member of the flow instance.');
  pkgDef.proxy.targetMethod = function () {};
  equal(typeof flow.targetMethod, 'function', 'The "proxy" member of the package-definition is the flow-instance prototype.');
  equal(typeof flow.pkgs[pkgName].targetMethod, 'function', 'A target method exist in the "pkgs" member of the flow instance.');
  equal(typeof flow.pkgs[pkgName].targetMethod, 'function', 'Added proxy methods are also available via the package-proxy (of the same name) in the "pkgs" member of the flow instance.');
  delete pkgDef.proxy.targetMethod;
  equal(typeof flow.targetMethod, 'undefined', 'Proxy methods can be deleted from the package-definition.');
  equal(typeof flow.pkgs[pkgName].targetMethod, 'undefined', 'Deleted proxy methods are also removed from the package-proxy (of the same name) in the "pkgs" member of the flow instance.');
});

test('Instance', function () {
  var flow = new Flow(),
    pkgDef = Flow.pkg(FT.pkgName),
    pkgInst = pkgDef(flow),
    mbr, mbrCnt = 0;
  ok(flow === pkgInst.proxy, 'The .proxy member is the public proxy');
  equal(typeof pkgInst.proxy, 'object', 'The .proxy member is an object');
  equal(typeof pkgInst.tank, 'object', 'The .tank member is an object.');
  equal(pkgInst.states.constructor, Array, 'The .states member is an Array.');
  ok(pkgInst.states.length > 1, 'There is more than one state in an instance.');
  ok(pkgInst.inState, 'The .inState member exists');
  equal(typeof pkgInst.inState, 'function', 'The inState member is a function.');
  for (mbr in pkgInst) {
    if (pkgInst.hasOwnProperty(mbr)) {
      mbrCnt++;
    }
  }
  equal(mbrCnt, 3, 'All expected non-inherited members are present.');
  equal(typeof pkgInst.targetMethod, 'undefined', 'Instances do not have a target method.');
  pkgDef.prototype.targetMethod = function () {};
  equal(typeof pkgInst.targetMethod, 'function', 'The "prototype" member of the package-definition is the instance prototype.');
  delete pkgDef.prototype.targetMethod;
  equal(typeof pkgInst.targetMethod, 'undefined', 'Instance methods can be deleted from the package-definition.');
});

test('State', function () {
  var randomValue = Math.random(),
    program = {
      a: {
        ab: {
          abc: randomValue
        }
      },
      c: [
        'a'
      ],
      b: 1
    },
    pkgDef = Flow.pkg(FT.pkgName),
    pkgInst = pkgDef(new Flow(program)),
    states = pkgInst.states,
    statePaths = '..//|//|//a/|//a/ab/|//a/ab/abc/|//c/|//c/0/|//b/'.split('|'),
    stateSets = [
      [
        0,
        '_flow',
        'firstChildIndex|lastChildIndex|index|depth'.split('|'),
        'parentIndex|previousIndex|nextIndex'.split('|') // undefined
      ],
      [
        1,
        '_root',
        'firstChildIndex|parentIndex|lastChildIndex|index|depth'.split('|'),
        'previousIndex|nextIndex'.split('|') // undefined
      ],
      [
        5,
        'c',
        'firstChildIndex|lastChildIndex|index|depth|previousIndex|nextIndex'.split('|'),
        []
      ]
    ];
  equal(statePaths.length, states.length, 'The expected number of states are present.');
  equal(typeof states[0].name, 'string', 'The "name" member is a string.');
  equal(typeof states[0].data, 'object', 'The "data" member is an object.');
  equal(typeof states[0].location, 'string', 'The "location" member is a string.');
  equal(FT.type(states[0].children), 'array', 'The "children" member is an Array.');
  equal(states[4].value, randomValue, 'The fourth state is the expected value.');
  states.forEach(function (state, idx) {
    equal(state.location, statePaths[idx], 'The state at index ' + idx + ' has the correct location.');
  });
  stateSets.forEach(function (set) {
    var idx = set[0],
      name = set[1],
      nums = set[2],
      undf = set[3],
      state = states[idx];
    equal(state.name, name, 'The state at index ' + idx + ' has the expected name.');
    nums.forEach(function (mbr) {
      equal(typeof state[mbr], 'number', 'The "' + mbr + '" member is numeric for the state at index ' + idx + '.');
    });
    undf.forEach(function (mbr) {
      ok(state.hasOwnProperty(mbr), 'The "' + mbr + '" member is local to the state at index ' + idx + '.');
      equal(state[mbr], undefined, 'The "' + mbr + '" member is undefined for the state at index ' + idx + '.');
    });
  });
  equal(states[0].children.length, 1, 'The first state has one child.');
  equal(typeof states[1].childIndex, 'number', 'The second state has the numeric member "childIndex".');
  equal(typeof states[0].targetMethod, 'undefined', 'A target method does not exist in the state.');
  pkgDef.state.targetMethod = function () {};
  equal(typeof states[0].targetMethod, 'function', 'The "state" member of the package-definition is the state prototype.');
  delete pkgDef.state.targetMethod;
  equal(typeof states[0].targetMethod, 'undefined', 'State methods can be deleted from the package-definition.');
});

test('Tank-API', function () {
  var pkgInst = Flow.pkg(FT.pkgName)(new Flow()),
    tank = pkgInst.tank,
    fncs = ['go', 'stop', 'post'],
    props = ['id', 'currentIndex', 'targetIndex'],
    fnc = function () {},
    params = [NaN, 1, 'foo', [], {}, null, undefined, fnc],
    postIdx,
    stopRtn = true,
    type = FT.type;
  fncs.forEach(function (fnc,idx) {
    equal(typeof tank[fnc], 'function', 'tank.' + fnc + ' is a function.');
    equal(typeof tank[props[idx]], 'number', 'tank.' + props[idx] + ' member is numeric.');
  });
  equal(tank.currentIndex, 0, 'tank.currentIndex is initially 0.');
  equal(tank.targetIndex, -1, 'tank.targetIndex is initially -1.');
  // .go()
  ok(!params.some(function (param) {
      return typeof tank.go(param) !== 'number'
    }) && typeof tank.go() === 'number',
    'tank.go() returns a number.'
  );
  equal(tank.currentIndex, 1, 'tank.currentIndex changes after passing a valid state index to tank.go().');
  // .stop()
  ok(!params.some(function (param) {
      return typeof tank.stop(param) !== 'number'
    }) && typeof tank.stop() === 'number',
    'tank.stop() returns a number.'
  );
  equal(tank.stop(), 0, 'tank.stop returns 0 when the flow is idle.');
  // .post()
  equal(typeof (postIdx = tank.post(fnc)), 'number', 'tank.post() returns a number when passed a function.');
  strictEqual(tank.post(postIdx), true, 'tank.post() returns true when given a valid post-function index.');
  strictEqual(tank.post(postIdx), false, 'tank.post() returns false when given an expired post-function index.');
  params.pop();
  ok(!params.some(function (param) {
      return typeof tank.post(param) !== 'boolean'
    }) && typeof tank.post() === 'boolean',
    'tank.stop() returns a boolean for non-function arguments and expired post-function indice.'
  );
});

module('Custom');

test('.init', function () {
  var pkgDef = Flow.pkg(FT.pkgName),
    obj = {
      a: 1,
      b: 2,
      c: {foo:3}
    },
    pkgInst = pkgDef(new Flow()),
    hasAllProps = 0,
    checkProps = function (thing) {
      for (var i in obj) {
        if (obj.hasOwnProperty(i)) {
          if (hasAllProps = (thing[i] === obj[i])) {
            continue;
          }
          break;
        }
      }
    };
  checkProps(pkgInst);
  ok(!hasAllProps, 'Package-instances have no properties by default.');
  pkgDef.init = 1;
  ok(pkgDef.init, 'The .init property is truthy.');
  ok(typeof pkgDef.init !== 'function', 'The .init property is not a function.');
  checkProps(pkgInst);
  ok(!hasAllProps, 'The .init property does nothing when truthy and not a function.');
  pkgDef.init = function () {
    ok(this instanceof pkgDef, 'Scope of .init function is the package-definition.');
    for (var i in  obj) {
      if (obj.hasOwnProperty(i)) {
        this[i] = obj[i];
      }
    }
  };
  equal(typeof pkgDef.init, 'function', 'The .init property is a function.');
  checkProps(pkgDef(new Flow()));
  equal(hasAllProps, true, 'The .init property has added the expected members to the package-instance.');
  pkgDef.init = function (cfg) {
    equal(arguments.callee.length, 1, 'This .init function expects one argument.');
    equal(arguments.length, 1, 'One argument is passed.');
    equal(typeof cfg, 'object', 'This function receives an object.');
  };
  ok(1, 'Passing one parameter to a new Flow.');
  new Flow(1);
  pkgDef.init = function (cfg) {
    equal(arguments.callee.length, 1, 'This .init function expects one argument.');
    ok(arguments.length, 'One argument was passed to this function.');
    checkProps(cfg);
    ok(hasAllProps, 'The expected (extra) argument was passed to the .init function.');
  };
  ok(1, 'Passing two parameters to a new Flow.');
  new Flow(1, obj);
  ok(1, 'Passing more than two parameters to a new Flow.');
  new Flow(1, obj, 2, 3, 4);
  pkgDef.init = 0;
  ok(!pkgDef.init, 'The .init property was reset.');
});

test('.dataKey', function () {
  var program = {
      '0': 0,
      one: 1,
      two: {
        three_3: 3,
        _four: 4
      }
    },
    pkgDef = Flow.pkg(FT.pkgName),
    pkgInst,
    defStateCnt = pkgDef(new Flow(program)).states.length,
    badDataKeys = [0, 1, 'foo', [], {}],
    checkAllDataKeys = function (inst) {
      var keys = '0|one|two'.split('|'),
        hasAll = 0,
        i = 0, j = keys.length;
      equal(inst.states.length, 2, '2 states exist when the .dataKey member flags everything.');
      for (; i < j; i++) {
        hasAll = inst.states[1].data.hasOwnProperty(keys[i]);
        if (!hasAll) {
          break;
        }
      }
      ok(hasAll, 'The _program state has all expected data keys when the .dataKey member flags nothing.');
    },
    runCnt = 0,
    type = FT.type;
  badDataKeys.forEach(function (key) {
    pkgDef.dataKey = key;
    equal(pkgDef(new Flow(program)).states.length, defStateCnt, 'The .dataKey member is ignored when a "' + type(key) + '".');
  });
  pkgDef.dataKey = function (name, value) {
    runCnt += 1;
    equal(this, window, 'The scope of the .dataKey function is the window.');
    equal(arguments.length, 2, 'The .dataKey function is passed two arguments.');
    equal(typeof name, 'string', 'The first parameter (name) is a string.');
  };
  equal(typeof pkgDef.dataKey, 'function', 'The .dataKey member is a function.');
  badDataKeys.forEach(function (key) {
    new Flow(key);
    equal(runCnt, 0, 'The .dataKey function is not called when the program parameter is a "' + type(key) + '" (i.e., has no members.)');
  });
  new Flow([1]);
  equal(runCnt, 1, 'The .dataKey function executes when the program parameter has non-inherited members.');
  pkgDef.dataKey = function () {};
  equal(pkgDef(new Flow(program)).states.length, defStateCnt, 'All states exist when the .dataKey function flags nothing.');
  pkgDef.dataKey = function () {return 1;};
  checkAllDataKeys(pkgDef(new Flow(program)));
  pkgDef.dataKey = /^$/;
  equal(pkgDef.dataKey.constructor, RegExp, 'The .dataKey member is a regular expression.');
  equal(pkgDef(new Flow(program)).states.length, defStateCnt, 'All states exist when the .dataKey expression flags nothing.');
  pkgDef.dataKey = /\d/;
  pkgInst = pkgDef(new Flow(program));
  equal(pkgInst.states.length, defStateCnt - 2, 'The expected number of states exist when the .dataKey expression flags keys with numbers.');
  ok(pkgInst.states[1].data.hasOwnProperty('0'), 'The numeric key "0" is a data attribute of the _root state.');
  ok(pkgInst.states[3].data.hasOwnProperty('three_3'), 'The numeric key "three_3" is a data attribute of the fourth state.');
  pkgDef.dataKey = /_/;
  pkgInst = pkgDef(new Flow(program));
  equal(pkgInst.states.length, defStateCnt - 2, 'The expected number of states exist when the .dataKey expression falgs keys with underscores.');
  ok(pkgInst.states[4].data.hasOwnProperty('three_3'), 'The "three_3" is a data attribute.');
  ok(pkgInst.states[4].data.hasOwnProperty('_four'), 'The "_four" is a data attribute.');
  pkgDef.dataKey = /./;
  checkAllDataKeys(pkgDef(new Flow(program)));
  pkgDef.dataKey = 0;
  equal(pkgDef.dataKey, 0, 'The .dataKey member is reset.');
});

test('.invalidKey', function () {
  var program = {
      '0': 0,
      one: 1,
      two: {
        three_3: 3,
        _four: 4
      }
    },
    pkgDef = Flow.pkg(FT.pkgName),
    pkgInst,
    defStateCnt = pkgDef(new Flow(program)).states.length,
    badInvKeys = [0, 1, 'foo', [], {}],
    runCnt = 0,
    type = FT.type;
  badInvKeys.forEach(function (key) {
    pkgDef.invalidKey = key;
    equal(pkgDef(new Flow(program)).states.length, defStateCnt, 'The .invalidKey member is ignored when a "' + type(key) + '".');
  });
  pkgDef.invalidKey = function (name, value) {
    equal(this, window, 'The scope of the .invalidKey function is the window.');
    equal(arguments.length, 2, 'The .invalidKey function is passed two arguments.');
    equal(typeof name, 'string', 'The first parameter (name) is a string.');
    runCnt++;
  };
  equal(typeof pkgDef.invalidKey, 'function', 'The .invalidKey member is a function.');
  badInvKeys.forEach(function (key) {
    new Flow(key);
    equal(runCnt, 0, 'The .invalidKey function is not called when the program parameter is a "' + type(key) + '" (i.e., has no members.)');
  });
  new Flow([1]);
  equal(runCnt, 1, 'The .invalidKey function executes when the program parameter has non-inherited members.');
  pkgDef.invalidKey = function () {};
  equal(pkgDef(new Flow(program)).states.length, defStateCnt, 'All states exist when the .invalidKey function flags nothing.');
  pkgDef.invalidKey = function () {return 1;};
  equal(pkgDef(new Flow(program)).states.length, 2, '2 states exist when the .invalidKey function flags everything.');
  pkgDef.invalidKey = /^$/;
  equal(pkgDef.invalidKey.constructor, RegExp, 'The .invalidKey member is a regular expression.');
  equal(pkgDef(new Flow(program)).states.length, defStateCnt, 'The expected number of states exist when the .invalidKey expression flags everything.');
  pkgDef.invalidKey = /\d/;
  pkgInst = pkgDef(new Flow(program));
  equal(pkgInst.states.length, defStateCnt - 2, 'The expected number of states exist when the .invalidKey expression flags keys with numbers.');
  equal(pkgInst.states[2].name, 'one', 'The first child of the program state is "one".');
  pkgDef.invalidKey = /_/;
  pkgInst = pkgDef(new Flow(program));
  equal(pkgInst.states.length, defStateCnt - 2, 'The expected number of states exist when the .invalidKey expression flags keys with underscores.');
  equal(pkgInst.states[4].name, 'two', 'The last state is "two".');
  pkgDef.invalidKey = /./;
  equal(pkgDef(new Flow(program)).states.length, 2, '2 states exist when the .invalidKey expression flags everything.');
  pkgDef.invalidKey = 0;
  equal(pkgDef.invalidKey, 0, 'The .invalidKey member is reset.');
});

test('.onBegin', 5, function () {
  var pkgDef = Flow.pkg(FT.pkgName),
    pkgInst = pkgDef(new Flow());
  pkgDef.onBegin = function (evt) {
    equal(arguments.length, 1, 'One argument given.');
    equal(evt, 'begin', 'The first argument is the event name.');
    ok(this === pkgInst, 'Scope is the package-instance.');
    equal(this.tank.currentIndex, this.tank.targetIndex, '.onBegin fires when already on the target index.');
  };
  pkgInst.tank.go(0);
  pkgDef.onBegin = 0;
  equal(pkgDef.onBegin, 0, 'The .onBegin member is reset.');
});

test('.onTraverse', 12, function () {
  var pkgDef = Flow.pkg(FT.pkgName),
    pkgInst = pkgDef(new Flow()),
    run = 0;
  pkgDef.onTraverse = function (evt, stateIdx) {
    ok(this === pkgInst, 'Scope is the package-instance.');
    equal(arguments.length, 2, 'Receives two arguments.');
    equal(evt, 'traverse', 'The first argument is the event name.');
    equal(typeof stateIdx, 'number', 'The second argument is a number.');
    if (run++) {
      equal(this.tank.targetIndex, -1, 'On the final traversal, the .targetIndex is -1.');
    } else {
      ok(this.tank.targetIndex !== -1, 'The .targetIndex is not -1.');
      equal(this.tank.currentIndex, this.tank.targetIndex, '.onTraverse fires when already on the target index.');
    }
  };
  pkgInst.tank.go(0);
  pkgDef.onTraverse = 0;
  equal(pkgDef.onTraverse, 0, 'The .onTraverse member is reset.');
});

test('.onEnd', 6, function () {
  var pkgDef = Flow.pkg(FT.pkgName),
    pkgInst = pkgDef(new Flow()),
    tank = pkgInst.tank,
    curIdx = tank.currentIndex;
  pkgDef.onEnd = function (evt) {
    equal(arguments.length, 1, 'One argument given.');
    equal(evt, 'end', 'The first argument is the event name.');
    ok(this === pkgInst, 'Scope is the package-instance.');
    equal(this.tank.currentIndex, curIdx, '.onEnd fires when already on the target index.');
  };
  equal(curIdx, 0, 'Starting on the _flow state.');
  pkgInst.tank.go(curIdx);
  pkgDef.onEnd = 0;
  equal(pkgDef.onEnd, 0, 'The .onEnd member is reset.');
});

test('postBacks', 9, function () {
  var pkgDef = Flow.pkg(FT.pkgName),
    flow = new Flow(),
    pkgInst = pkgDef(flow),
    evtOrder = {
      begin: 0,
      traverse: 1,
      end: 2
    },
    evtIdx = 0,
    getCB = function (evtName) {
      return function () {
        equal(evtIdx++, evtOrder[evtName], 'The "' + evtName + '" event fired in the correct order.');
      }
    },
    postIdx,
    postRan = 0;
  // go to 0 first (to ensure one traversal)
  pkgInst.tank.go(0);
  pkgDef.onBegin = pkgDef.onTraverse = pkgDef.onEnd = function (evtName) {
    this.tank.post(getCB(evtName));
  };
  pkgInst.tank.go(0);
  // in-loop removal
  pkgDef.onTraverse = 0;
  pkgDef.onBegin = function () {
    postIdx = this.tank.post(function () {
        postRan++;
      });
    equal(typeof postIdx, 'number', '.onBegin has set a post-back.');
  };
  pkgDef.onEnd = function () {
    ok(this.tank.post(postIdx), '.onEnd removed the post-back set by onBegin.');
  };
  pkgInst.tank.go(0);
  ok(!postRan, 'The post-back was successfully removed.');
  pkgDef.onBegin = pkgDef.onTraverse = pkgDef.onEnd = 0;
  ok(!pkgDef.onBegin, '.onBegin is reset.');
  ok(!pkgDef.onTraverse, '.onTraverse is reset.');
  ok(!pkgDef.onEnd, '.onEnd is reset.');
});

module('Scenario');

test('Newer packages override same-name proxy methods.', function () {
  var firstPkgDef = Flow.pkg(FT.pkgName),
    secondPkgDef = Flow.pkg('override'),
    value = 'hello world!';
    flow = new Flow(value);
  firstPkgDef.proxy.greet = function () {
    return firstPkgDef(this).states[1].value;
  };
  secondPkgDef.proxy.greet = function () {
    return this.pkgs[FT.pkgName].greet();
  };
  strictEqual(flow.greet, secondPkgDef.proxy.greet, 'The last defined package overrides methods defined by earlier packages.');
  equal(flow.greet(), value, 'Newer packages can invoke older package methods.');
});