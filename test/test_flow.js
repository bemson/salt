var T = {
  type: function (thing) {
    return Object.prototype.toString.call(thing).match(/\s(.+)\]$/)[1].toLowerCase();
  }
};

module('Flow');

test('Dependencies', function () {
  equal(typeof Panzer, 'object', 'The "Panzer" object is present.');
  equal(Panzer.version, '0.2.3', 'The correct version of Panzer is loaded.');
  ok(Array.prototype.indexOf, 'Array.prototype.indexOf exists.');
  ok(Array.prototype.every, 'Array.prototype.every exists.');
});

test('Namespace', function () {
  equal(typeof Flow, 'function', 'The "Flow" function is present.');
  equal(typeof Flow.version, 'string', 'Flow.version is a string.');
  equal(typeof Flow.pkg, 'function', 'Flow.pkg() is a function.');
  ok(Flow.pkg().length === 1 && Flow.pkg()[0] === 'core', 'The only package present is named "core".');
});

module('Core');

test('Package', function () {
  var
    corePkgDef;
  equal(Flow.pkg().indexOf('core'), 0, 'The "core" package already exists.');
  corePkgDef = Flow.pkg('core');
  'actives|events'.split('|').forEach(function (prop) {
    ok(corePkgDef[prop] instanceof Array, 'CorePkgDef.' + prop + ' is an array.');
  });
})

test('Instance', function () {
  var coreInst = Flow.pkg('core')(new Flow());
  'indexOf|vetIndexOf|getData|go'.split('|').forEach(function (mbr) {
    equal(typeof coreInst[mbr], 'function', '<Core-Instance>.' + mbr + ' is a  method.');
  });
  'trust,0|args|calls|route|data|delay|cache|locked,0|nodeIds|pending,0|parents|targets|phase,0'.split('|').forEach(function (mbrSet) {
      var
        split = mbrSet.split(','),
        mbr = split[0],
        defaultFlag = split[1];
      ok(typeof coreInst[mbr] !== 'undefined', '<Core-Instance>.' + mbr + ' is a property.');
      if (split.length > 1) {
        equal(coreInst[mbr], defaultFlag, '<Core-Instance>.' + mbr + ' is ' + defaultFlag + ', by default.');
      }
    });
});

test('State', function () {
  var
    states = Flow.pkg('core')(new Flow({foo: 'bar'})).nodes,
    state = states[2];
  'pendable,1|root|restrict|map|data|fncs'.split('|').forEach(function (mbrSet) {
      var
        split = mbrSet.split(','),
        mbr = split[0],
        defaultFlag = split[1];
      ok(state.hasOwnProperty(mbr), '<Core-State>.' + mbr + ' is a property.');
      if (defaultFlag) {
        defaultFlag *= 1;
        equal(state[mbr], defaultFlag, '<Core-State>.' + mbr + ' is "' + (defaultFlag ? 'truthy' : 'falsy') + '", by default.');
      }
    }
  );
  equal(state.root, 1, '<Core-State>.root is 1, by default.');
  equal(state.restrict, -1, '<Core-State>.restrict is -1, by default.');
  equal(state.root, 1, '<Core-State>.root is 1 by default.');
  'scopeData|canTgt'.split('|').forEach(function (mbr) {
    equal(typeof state[mbr], 'function', '<Core-State>.' + mbr + '() is a method.');
  });
  equal(states[0].name, '_flow', 'The first state is named "_flow".');
  equal(states[1].name, '_program', 'The second state is named "_program".');
  ok(states[0].root === states[1].index && states[0].root === 1, 'The "flow" and "program" root is the program state.');
});

test('Proxy', function () {
  var flow = new Flow();
  'map|query|lock|data|args|target|go|wait|status|bless'.split('|').forEach(function (mbr) {
    equal(typeof flow[mbr], 'function', '<Core-Proxy>.' + mbr + '() is a method.');
  });
});

module('Parsing');

test('Invalid Keys', function () {
  var
    corePkgDef = Flow.pkg('core'),
    defCnt = corePkgDef(new Flow()).nodes.length;
  equal(
    corePkgDef(new Flow({'!@#$%^&*().,;:\'"]{}-+~`\\<>': 1})).nodes.length,
    defCnt,
    'Keys without alphanumeric characters are ignored.'
  );
  equal(
    corePkgDef(new Flow({'a|': 1})).nodes.length,
    defCnt,
    'Keys with a pipe character are ignored.'
  );
  equal(
    corePkgDef(new Flow({'a/': 1})).nodes.length,
    defCnt,
    'Keys with a forward-slash character are ignored.'
  );
  equal(
    corePkgDef(new Flow({'@a': 1})).nodes.length,
    defCnt,
    'Keys beginning with an at ("@") character are ignored.'
  );
  equal(
    corePkgDef(new Flow({'[a': 1})).nodes.length,
    defCnt,
    'Keys beginning with a left-square bracker ("[") character are ignored.'
  );
});

test('Valid Keys', function () {
  var
    corePkgDef = Flow.pkg('core'),
    defCnt = corePkgDef(new Flow()).nodes.length,
    stateName = 'f@[',
    validStates = {},
    validAttrs = {
      '_': 1,
      _foo: 1,
      _in: 1
    };
  validStates[stateName] = 1;
  equal(
    corePkgDef(new Flow(validStates)).nodes[2].name,
    stateName,
    'Keys with at least one alphanumeric character become states.'
  );
  deepEqual(
    corePkgDef(new Flow(validAttrs)).nodes[1].attributes,
    validAttrs,
    'Keys beginning with underscores become state attributes.'
  );
});

test('State values', function () {
  var
    fnc = function () {},
    coreInst = Flow.pkg('core')(new Flow(fnc));
  equal(coreInst.nodes[1].value, fnc, 'Paired values are stored in <Core-State>.value.');
  equal(coreInst.nodes[1].fncs[0], fnc, 'Paired functions become the on-behavior of a state.');
});

module('Attribute');

test('_on', function () {
  var corePkgDef = Flow.pkg('core'),
    fnc = function () {};
  equal(corePkgDef(new Flow({_on: fnc})).nodes[1].fncs[0], fnc, 'As a function, the on-behavior is parsed from the _on attribute.');
  equal(corePkgDef(new Flow({_on: 1})).nodes[1].fncs[0], 0, 'As a non-function, the on-behavior is not parsed from the _on attribute.');
});

test('_in', function () {
  var corePkgDef = Flow.pkg('core'),
    fnc = function () {};
  equal(corePkgDef(new Flow({_in: fnc})).nodes[1].fncs[1], fnc, 'As a function, the in-behavior is parsed from the _in attribute.');
  equal(corePkgDef(new Flow({_in: 1})).nodes[1].fncs[1], 0, 'As a non-function, the in-behavior is not parsed from the _in attribute.');
});

test('_out', function () {
  var corePkgDef = Flow.pkg('core'),
    fnc = function () {};
  equal(corePkgDef(new Flow({_out: fnc})).nodes[1].fncs[2], fnc, 'As a function, the out-behavior is parsed from the _out attribute.');
  equal(corePkgDef(new Flow({_out: 1})).nodes[1].fncs[2], 0, 'As a non-function, the out-behavior is not parsed from the _out attribute.');
});

test('_over', function () {
  var corePkgDef = Flow.pkg('core'),
    fnc = function () {};
  equal(corePkgDef(new Flow({_over: fnc})).nodes[1].fncs[3], fnc, 'As a function, the over-behavior is parsed from the _over attribute.');
  equal(corePkgDef(new Flow({_over: 1})).nodes[1].fncs[3], 0, 'As a non-function, the over-behavior is not parsed from the _over attribute.');
});

test('_bover', function () {
  var corePkgDef = Flow.pkg('core'),
    fnc = function () {};
  equal(corePkgDef(new Flow({_bover: fnc})).nodes[1].fncs[4], fnc, 'As a function, the bover-behavior is parsed from the _bover attribute.');
  equal(corePkgDef(new Flow({_bover: 1})).nodes[1].fncs[4], 0, 'As a non-function, the bover-behavior is not parsed from the _bover attribute.');
});

test('_root', function () {
  var
    corePkgDef = Flow.pkg('core'),
    states = corePkgDef(new Flow({
      _root: 0,
      a2: {},
      b3: {
        _root: 1,
        c4: {}
      },
      d5: {
        _root: 0
      }
    })).nodes;
  ok(!states[2].attributes.hasOwnProperty('_root') && states[2].root === 1, 'When omitted, <Core-State>.root points to the program\'s root state index, by default.');
  ok(states[5].attributes.hasOwnProperty('_root') && states[5].root === 1, 'Setting a falsy value is the same as omission.');
  equal(states[3].root, 3, "A rooted state references it's own index.");
  equal(states[4].root, 3, 'Descendents of a rooted state point to the first rooted ancestor state\'s index.');
  ok(states[1].attributes.hasOwnProperty('_root') && !states[1].attributes._root && states[1].root === 1, 'The program state ignores the _root attribute.');
});

test('_pendable', function () {
  var
    corePkgDef = Flow.pkg('core'),
    states = corePkgDef(new Flow({
      a2: {},
      b3: {
        _pendable: 0,
        c4: {
          _pendable: 1
        }
      },
      d5: {
        _pendable: 1
      }
    })).nodes;
  ok(!states[2].attributes.hasOwnProperty('_pendable') && states[2].pendable, 'When omitted, <Core-State>.pendable is truthy, by default.');
  ok(states[5].attributes._pendable && states[5].pendable, 'Setting a truthy value is the same as omission.');
  ok(states[3].attributes.hasOwnProperty('_pendable') && !states[3].pendable, 'When falsy, <Core-State>.pendable is falsy.');
  ok(states[4].attributes._pendable && !states[3].pendable && !states[4].pendable, 'Descendants of non-pending states ignore the _pendable attribute, and are also non-pending.');
});

test('_restrict', function () {
  var
    flow = new Flow({
      a2: {},
      b3: {
        _restrict: 1,
        c4: {},
        d5: {
          _restrict: 0
        }
      },
      e6: {
        _restrict: 0
      }
    }),
    states = Flow.pkg('core')(flow).nodes;
  ok(!states[2].attributes.hasOwnProperty('_restrict') && !~states[2].restrict, 'When omitted, <Core-State>.restrict is -1, by default.');
  ok(states[6].attributes.hasOwnProperty('_restrict') && !~states[5].restrict, 'Setting a falsy value is the same as omission.');
  ok(states[3].attributes._restrict && states[3].restrict === 3, 'When truthy, <Core-State>.restrict is the node index.');
  ok(!states[4].attributes.hasOwnProperty('_restrict') && states[4].restrict === 3, 'When ommited, ancestor state restrictions are adopted.');
  ok(states[5].attributes.hasOwnProperty('_restrict') && !states[5].attributes._restrict && !~states[5].restrict, 'When falsy, ancestor state restrictions are ignored.');
  flow.target('//b3/');
  equal(flow.target(0), false, 'A restricted state can not navigate outside it\'s own branch of the program tree.');
  flow.target('//c4/');
  equal(flow.target('//b3/'), false, 'Descendents of restricted states can not navigate outside to the first ancestor with a truthy _restrict flag.');
  equal(flow.target(0), false, 'Descendents of restricted states can not navigate outside the first ancestor with a truthy _restrict flag.');
  equal(flow.target('//b3/d5/'), true, 'Descendents of restricted states may navigate to any descendent of the restricted state.');
  equal(flow.target(0), true, 'Descendents of restricted states that are not restricted may navigate anywhere in the program.');
});

test('_data', function () {
  var
    corePkgDef = Flow.pkg('core'),
    states = corePkgDef(new Flow({
      _data: 'foo',
      a: {
        _data: ['foo','bar']
      },
      b: {
        _data: {foo:{a:1,b:{c:1}}, bar: 1}
      },
      c: {
        _data: ['foo',['bar'], {baz:1}]
      },
      d: {
        _data: 1
      }
    })).nodes;
  'string,foo|array of strings,foo,bar|object,foo,bar|mixed array,foo,bar,baz|number,1'.split('|').forEach(function (keySet, idx) {
    var
      keys = keySet.split(','),
      type = keys.splice(0, 1)[0],
      state = states[idx + 1];
    ok(
      state.data.length === keys.length && state.data.every(function (data, dataIdx) {
        return data.hasOwnProperty('name') && data.hasOwnProperty('use') && data.hasOwnProperty('value') && data.name === keys[dataIdx];
      }),
      'When set to a ' + type + ' the expected data configuration objects are compiled.'
    );
  });
  equal(
    corePkgDef(new Flow({_data:null})).nodes[1].data.length,
    0,
    'When set to null, no data configuration objects are compiled.'
  );
  equal(
    corePkgDef(new Flow({_data:undefined})).nodes[1].data.length,
    0,
    'When set to undefined, no data configuration objects are compiled.'
  );
});

module('Core-Package');

test('.actives', 8, function () {
  var
    corePkgDef = Flow.pkg('core'),
    flow = new Flow({
      _in: function () {
        this.wait();
        equal(corePkgDef.actives.length, 1, 'Populated when a flow is navigating.');
      },
      _on: function () {
        var
          nestedFlow = new Flow(function () {
            this.wait();
            equal(corePkgDef.actives.length, 2, 'Increments by one for each nested flow.');
            ok(
              corePkgDef.actives.every(function (f) {
                return f instanceof Flow;
              }),
              'Active items are flow instances.'
            );
            ok(corePkgDef.actives[0] === nestedFlow, 'Is a stack - the first item is the currently navigating flow instance.');
          });
        nestedFlow.target(1);
        equal(corePkgDef.actives.length, 1, 'Updated whenever a flow stops navigating.');
      }
    });
  equal(corePkgDef.actives.length, 0, 'Empty by default.');
  flow.target(1);
  ok(!corePkgDef.actives.length && flow.status().paused, 'Empty when all flows stop navigating, even if a flow is paused.');
  flow.target(1);
  ok(!corePkgDef.actives.length && flow.status().pending, 'Empty when all flows stop navigating, even if a flow is pending.');
});

test('.events', 3, function () {
  var
    corePkgDef = Flow.pkg('core'),
    value = {},
    retValue = function () {
      return value;
    },
    flowCompiledWithOn = new Flow(retValue);
  console.log(corePkgDef.events);
  deepEqual(corePkgDef.events, 'on|in|out|over|bover'.split('|'), 'Has the default event names.');
  corePkgDef.events[0] = 'foo';
  ok(
    (new Flow({_foo: retValue})).target(1) === value
    && (new Flow(retValue)).target(1) === value,
    'Flow instances are compiled according to the current event names.'
  );
  equal(flowCompiledWithOn.target(1), value, 'Event name changes do not impact existing flows.');
  // restore .events
  corePkgDef.events[0] = 'on';
});

module('Core-Instance');

test('.getData()', function () {
  var corePkgDef = Flow.pkg('core'),
    pkgInst = corePkgDef(new Flow()),
    keyName = 'foo',
    instData = pkgInst.data,
    dataTrackingObject;
  [[null,'"null"'], [undefined,'"undefined"'],['','an empty string'],['!@#$%^&*()','a non-alphanumeric string']].forEach(
    function (argSet) {
      equal(pkgInst.getData(argSet[0]), false, 'Passing ' + argSet[1] + ' returns false.');
    }
  );
  ok(
    !instData.hasOwnProperty(keyName)
    && (dataTrackingObject = pkgInst.getData(keyName))
    && instData.hasOwnProperty(keyName),
    'Creates and returns a data tracking object in <Core-Instance>.data with the given alphanumeric string.'
  );
  deepEqual(pkgInst.getData(keyName), dataTrackingObject, 'Passing an existing key returns the same data tracking object.');
  ok(dataTrackingObject.hasOwnProperty('name'), '<DTO>.name is a string.');
  equal(T.type(dataTrackingObject.values), 'array', '<DTO>.values is an array.');
  equal(pkgInst.getData('bar', keyName).values[0], keyName, 'The second argument becomes the first entry in the data tracking object\'s values array.');
  pkgInst.getData(keyName, 1);
  equal(dataTrackingObject.values.length, 0, 'Passing a second argument for an existing data tracking object does nothing.');
});

test('.go()', function () {
  var
    pkgInst = Flow.pkg('core')(new Flow({
      a: {
        _in: function () {
          this.wait();
        }
      }
    })),
    tank = pkgInst.tank,
    initialIndex = tank.currentIndex,
    stepCount;

  equal(pkgInst.go.length, 0, 'Expects no arguments.');
  ok(!isNaN(pkgInst.go()), 'Returns an integer.');
  pkgInst.pause = 1;
  ok(pkgInst.pause && !pkgInst.go() && !pkgInst.pause, 'Unpauses a flow.');
  ok(!pkgInst.targets.length && !pkgInst.go() && tank.currentIndex === initialIndex,'The current state index is not changed when <Core-Instance>.targets is empty.');
  pkgInst.targets.push(1);
  ok(pkgInst.targets.length && (stepCount = pkgInst.go()) && tank.currentIndex !== initialIndex, 'Changes the current state index when <Core-Instance>.targets has indice.');
  equal(stepCount, 2, 'Returns the number of traversal events fired while navigating to the target index(es).');
  equal(pkgInst.targets.length, 0, '<Core-Instance>.targets is empty upon completion.');
  pkgInst.targets.push(tank.currentIndex);
  equal(pkgInst.go(), 1, 'Triggers one traversal event when the target index matches the current index.');
  pkgInst.pending = 1;
  pkgInst.targets.push(0);
  equal(pkgInst.go(), 0, 'Returns 0 when <Core-Instance>.pending is truthy.');
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
  equal(coreInst.vetIndexOf(2, coreInst.nodes[1]), 2, 'Returns the expected index when targeting a descendant of a restricted state.');
  equal(coreInst.vetIndexOf(2, coreInst.nodes[2]), -1, 'Returns -1 when targeting the restricted state.');
  equal(coreInst.vetIndexOf(1, coreInst.nodes[2]), -1, 'Returns -1 when targeting a state outside the path of the restricted state.');
});

module('Core-State');

test('.scopeData()', function () {
  var corePkgDef = Flow.pkg('core'),
    value = 'bar',
    value2 = 'woz',
    coreInst = corePkgDef(new Flow({
      _data: {
        foo: value,
        bar: value
      },
      a: {
        _data: {foo: value2}
      },
      b: {
        _data: 'bar'
      },
      c: {}
    })),
    dtos = coreInst.data,
    states = coreInst.nodes;
  equal(states[1].scopeData(), undefined, 'Returns "undefined".');
  ok(
    states[1].data.every(function (dco) {return dtos.hasOwnProperty(dco.name);}),
    'Adds data tracking objects for each data configuration declared by a state\'s data attribute.'
  );
  states[2].scopeData();
  equal(dtos.foo.values.length, 2, 'Scoping a state with an existing data configuration, increments the .values array of the corresponding tracking object.');
  equal(dtos.foo.values[0], value2, 'The first item of a data tracking object matches the last value scoped.');
  states[3].scopeData();
  equal(dtos.bar.values[0], dtos.bar.values[1], 'Scoping a data configuration with no value, duplicates the last value scoped.');
  states[4].scopeData();
  equal(dtos.bar.values.length, 2, 'Scoping a state that does not have data configurations for existing data tracking objects, does not increment their .values array.');
});

test('.canTgt()', function () {
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
  ok(states[4].restrict, 'There is a restricted state.');
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

module('Core-Proxy');

test('.lock()', function  () {
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

test('.target()', function () {
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

test('.go()', function () {
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

test('.wait()', function () {
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
        var
          scope = {};
        function noscope() {
          return this;
        }
        ok(
          ![null, undefined, NaN, '', 1, {}, []].some(function (arg) {
            return flow.bless(arg);
          }),
          'Returns false when called without a function.'
        );
        equal(typeof flow.bless(function () {}), 'function', 'Returns a function when passed a function.');
        blessedFnc = flow.bless(unblessedFnc);
        ok(scope === flow.bless(noscope).call(scope), 'Blessed functions preserve the given execution scope.');
        this.lock(1);
      },
      foo: function () {
        return value;
      }
    }),
    restrictedFlow = new Flow({
      _restrict: 1,
      _in: function () {
        blessFnc = this.bless(function () {
          return restrictedFlow.target(1);
        });
      },
      _on: function () {
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
    && blessedFnc() === value
    && flow.lock(),
    'A blessed untrusted function can direct a locked flow.'
  );
  ok(
    restrictedFlow.target(1) === value
    && restrictedFlow.target(1) === false
    && blessedFnc() === value,
    'A blessed untrusted function ignores navigation restrictions.'
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

test('.args()', function () {
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

test('.map()', function () {
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

test('status()', function () {
  var status = (new Flow({})).status();
  'trust|loops|depth|paused|pending|pendable|targets|route|path|index|phase|state'
    .split('|')
    .forEach(
      function (mbr) {
        ok(status.hasOwnProperty(mbr), 'The status object contains a "' + mbr + '" member.');
      }
    );
});

module('&lt;Proxy&gt;.status()');

test('.trust', function () {
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

test('.loops', function () {
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

test('.depth', function () {
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

test('.paused', function () {
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

test('.pending', function () {
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

test('.pendable', function () {
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

test('.targets', function () {
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

test('.route', function () {
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

test('.path', function () {
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

test('.index', function () {
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

test('.phase', function () {
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

test('.state', function () {
  var flow = new Flow({
    a: {
      b: 1
    },
    c: 2
  });
  equal(flow.status().state, '_flow', 'status.state is "_flow" by default.');
  flow.go(1);
  equal(flow.status().state, '_program', 'status.state is "_program" when on the program state.');
  flow.go(2);
  equal(flow.status().state, 'a', 'status.state reflects the current state.');
  flow.go(3);
  equal(flow.status().state, 'b', 'status.state reflects the current state.');
  flow.go(4);
  equal(flow.status().state, 'c', 'status.state reflects the current state.');
});

module('Scenario');

test('Control executions during asynchrounous actions.', function () {
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

test('Traversal method behavior on a locked flow.', function () {
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

test('Buffered execution, after numerous calls.', function () {
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

test('Flow arguments are passed to the _on function of the last/destination state.', function () {
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

test('Calculate the fibonacci number of 1000 without causing a stack-overflow.', function () {
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

test('Prevent consecutive execution for the same state.', function () {
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

test('Reversing the flow\'s direction during an _over and _bover step does not trigger the other step.', function () {
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

test('Automatic execution of prerequisite functions.', function () {
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

test('Execute a function sequence.', function () {
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