var T = {
  type: function (thing) {
    return Object.prototype.toString.call(thing).match(/\s(.+)\]$/)[1].toLowerCase();
  }
};

module('Flow');

test('Dependencies', function () {
  equal(typeof Panzer, 'object', 'The "Panzer" object is present.');
  ok(Panzer.version.replace(/\./g,'') > '0.2.3'.replace(/\./g,''), 'The minimum version of Panzer is loaded.');
  ok(Array.prototype.indexOf, 'Array.prototype.indexOf exists.');
  ok(Array.prototype.every, 'Array.prototype.every exists.');
});

test('Namespace', function () {
  equal(typeof Flow, 'function', 'The "Flow" function is present.');
  equal(typeof Flow.version, 'string', 'Flow.version is a string.');
  equal(typeof Flow.pkg, 'function', 'Flow.pkg() is a function.');
});

module('Core');

test('Package', function () {
  var
    corePkgDef = Flow.pkg('core');
  'actives|events'.split('|').forEach(function (prop) {
    ok(corePkgDef[prop] instanceof Array, 'corePkgDef.' + prop + ' is an array.');
  });
});

test('Instance', function () {
  var coreInst = Flow.pkg('core')(new Flow());
  'allowed|indexOf|vetIndexOf|getDef|go|upOwner'.split('|').forEach(function (mbr) {
    equal(typeof coreInst[mbr], 'function', '<Core-Instance>.' + mbr + ' is a  method.');
  });
  'trust,0|args|calls|route|data|delay|cache|locked,0|nodeIds|pending,0|pendees|targets|phase,0|owner'.split('|').forEach(function (mbrSet) {
      var
        split = mbrSet.split(','),
        mbr = split[0],
        defaultFlag = split[1];
      ok(coreInst.hasOwnProperty(mbr), '<Core-Instance>.' + mbr + ' is a property.');
      if (split.length > 1) {
        equal(coreInst[mbr], +defaultFlag, '<Core-Instance>.' + mbr + ' is ' + defaultFlag + ', by default.');
      }
    });
});

test('State', function () {
  var
    states = Flow.pkg('core')(new Flow({foo: 'bar'})).nodes,
    state = states[2];
  'pendable,1|root|restrict|cb|data|fncs|upOwn,0'.split('|').forEach(function (mbrSet) {
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
  'scopeData|canTgt|within'.split('|').forEach(function (mbr) {
    equal(typeof state[mbr], 'function', '<Core-State>.' + mbr + '() is a method.');
  });
  equal(states[0].name, '_flow', 'The first state is named "_flow".');
  equal(states[1].name, '_program', 'The second state is named "_program".');
  ok(states[0].root === states[1].index && states[0].root === 1, 'The "flow" and "program" root is the program state.');
});

test('Proxy', function () {
  var flow = new Flow();
  'cb|query|lock|data|args|target|go|wait|status|bless|owner'.split('|').forEach(function (mbr) {
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
    corePkgDef(new Flow(validAttrs)).nodes[1].tags,
    validAttrs,
    'Keys beginning with underscores become state tags.'
  );
});

test('State values', function () {
  var
    fnc = function () {},
    coreInst = Flow.pkg('core')(new Flow(fnc));
  equal(coreInst.nodes[1].value, fnc, 'Paired values are stored in <Core-State>.value.');
  equal(coreInst.nodes[1].fncs[0], fnc, 'Paired functions become the on-behavior of a state.');
});

module('Tag');

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
  ok(!states[2].tags.hasOwnProperty('_root') && states[2].root === 1, 'When omitted, <Core-State>.root points to the program\'s root state index, by default.');
  ok(states[5].tags.hasOwnProperty('_root') && states[5].root === 1, 'Setting a falsy value is the same as omission.');
  equal(states[3].root, 3, "A rooted state references it's own index.");
  equal(states[4].root, 3, 'Descendents of a rooted state point to the first rooted ancestor state\'s index.');
  ok(states[1].tags.hasOwnProperty('_root') && !states[1].tags._root && states[1].root === 1, 'The program state ignores the _root attribute.');
});

test('_lock', 4, function () {
  var
    flow = new Flow({
      basics: {
        _lock: 1,
        _in: function () {
          ok(this.args().length && !this.args(0) && this.lock(), 'A flow is locked when entering a state attributed with "_lock".');
        },
        _on: function () {
          this.go('//calls/');
        },
        _out: function () {
          ok(!this.lock(), 'A flow is unlocked after existing an auto-lock state.');
        }
      },
      calls: {
        _lock: 1,
        _on: function () {
          this.go('//nesting/');
        },
        _out: function () {
          this.lock(1);
        }
      },
      verify: {
        _over: function () {
          ok(this.lock(), 'Flow honors locks set while invoking the _out callback of an auto-locked state.');
          this.lock(0);
        }
      },
      nesting : {
        _lock: 1,
        _on: function () {
          this.go('child', 0);
        },
        child: {
          _lock: 1,
          _out: function () {
            ok(this.lock(), 'Flow remains locked when traversing from an auto-locked child state to an auto-lock parent state.');
          }
        }
      }
    });
  flow.target('//basics/', flow.lock());
});

test('_owner', function () {
  var
    corePkgDef = Flow.pkg('core')
    , value = {}
    , child
    , parent
    , grand
    , updateStatePhases = []
    , internalUpdate = new Flow({
      _in: function () {
        (new Flow({
          _owner: '//detour/'
        })).cb()();
      },
      originalTarget: 'never hits this state',
      detour: function () {
        if (arguments.length) {
          defaultOwnerUpdateAction.apply(this, arguments);
        }
        return value;
      }
    })
    , pendByUpdater = new Flow({
      _on: function () {
        child = new Flow({
          _owner: '//monitor'
        });
      },
      monitor: function (f) {
        this.wait();
        defaultOwnerUpdateAction.apply(this, arguments);
      }
    })
    , doubleInternalUpdate = new Flow({
      _on: function () {
        (new Flow({ // nested flow A
          a: {
            _owner: '//monitorA'
            , _on: function () {
              (new Flow({ // nested flow B
                b: {
                  _owner: '//monitorB/'
                }
              })).cb().b();
            }
          }
          , monitorB: defaultOwnerUpdateAction
        })).cb().a();
      },
      monitorA: defaultOwnerUpdateAction
    })
    , doubleUpdatePends = new Flow({

    })
    , ownPrograms = [
      // 0 - simple, single gate
      {
        _owner: '//updates'
      }
      // 1 - single gate with callbacks
      , {
        _owner: '//updates',
        _in: function () {
          updateStatePhases.push('foo');
        },
        _on: function () {
          updateStatePhases.push('bar');
        },
        _out: function () {
          updateStatePhases.push('zog');
        }
      }
      // 2 - one update state and a child state
      , {
        relay: {
          _owner: '//updates/',
          sub: 1
        }
      }
      // 3 - one update with redirecting child state
      , {
        relay: {
          _owner: '//updates/',
          redirect: function () {
            this.go(1);
          }
        }
      }
      // 4 - a pending flow
      , {
        _owner: '//updates',
        _in: function () {
            // pend this flow
            this.tmpPender = new Flow(function () {
              this.wait(0);
            });
            this.tmpPender.go(1);
        }
      }
      // 5 - halt at _in
      , {
        _owner: '//updates/',
        _in: function () {
          this.wait();
        }
      }
      // 6 - halt at _on
      , {
        _owner: '//updates/',
        _on: function () {
          this.wait();
        }
      }
      // 7 - halt at _out
      , {
        _owner: '//updates/',
        _out: function () {
          this.wait();
        }
      }
      // 8 - delay at _in
      , {
        _owner: '//updates/',
        _in: function () {
          this.wait(0);
        }
      }
      // 9 - delay at _on
      , {
        _owner: '//updates/',
        _on: function () {
          this.wait(0);
        }
      }
      // 10 - delay at _out
      , {
        _owner: '//updates/'
        , _out: function () {
          this.wait(0);
        }
      }
      // 11 - triple delayed callbacks
      , {
        _owner: '//updates/'
        , _in: function () {
          this.wait(function () {
            this.wait(function () {
              this.wait(0);
            }, 0);
          },0);
        }
        , _on: function () {
          deepEqual(updateStatePhases, ['_program@in'], 'The owning flow is updated after all _in phase delays expire.');

          this.wait(function () {
            this.wait(function () {
              this.wait(0);
            }, 0);
          },0);
        }
        , _out: function () {
          deepEqual(updateStatePhases, ['_program@in'], 'The owning flow is not updated on navigation waypoints.');

          this.wait(function () {
            this.wait(function () {
              this.wait(0);
            },0);
          },0);
        }
      }

      // 12 - pended callbacks
      , {
        _owner: '//updates'
        , _in: function () {
            // pend this flow
            this.tmpPender = new Flow(function () {
              this.wait();
            });
            this.tmpPender.go(1);
        }
        , _on: function () {
            // pend this flow
            this.tmpPender = new Flow(function () {
              this.wait();
            });
            this.tmpPender.go(1);
        }
        , _out: function () {
            // pend this flow
            this.tmpPender = new Flow(function () {
              this.wait();
            });
            this.tmpPender.go(1);
        }
      }

      // 13 - pended and double delayed callbacks
      , {
        _owner: '//updates'
        , _in: function () {
            // pend this flow
            this.tmpPender = new Flow(function () {
              this.wait(function () {
                this.wait(0);
              }, 0);
            });
            this.tmpPender.go(1);
        }
        , _on: function () {
            deepEqual(updateStatePhases, ['_program@in'], 'The owning flow is updated after the child flow is unpended and all _in phase delays expire.');
            // pend this flow
            this.tmpPender = new Flow(function () {
              this.wait(function () {
                this.wait(0);
              }, 0);
            });
            this.tmpPender.go(1);
        }
        , _out: function () {
            // pend this flow
            this.tmpPender = new Flow(function () {
              this.wait(function () {
                this.wait(50);
              }, 0);
            });
            this.tmpPender.go(1);
        }
      }

      // 14 - delay that pends
      , {
        _owner: '//updates'
        , _in: function () {
          this.wait(function () {
            this.tmpPender = new Flow(function () {
              this.wait();
            });
            this.tmpPender.go(1);
          }, 0);
        }
      }
    ],
    own = (new Flow({
      _on: function (idx) {
        updateStatePhases = [];
        child = new Flow(ownPrograms[idx]);
      },
      updates: defaultOwnerUpdateAction
    })).cb()
  ;

  function defaultOwnerUpdateAction(childFlow, childStatus) {
    updateStatePhases.push(childStatus.state + '@' + childStatus.phase);
  }

  (new Flow({
    _on: function () {
      child = new Flow({
        bar: 1,
        foo: {
          _owner: '//monitor',
          _on: function () {
            this.go('../bar');
          }
        }
      });
      child.cb().foo();
    },
    monitor: function (childFlow, childStatus) {
      var status = childFlow.status();
      equal(arguments.length, 2, 'The state receiving updates is passed two arguments.');
      ok(child === childFlow, 'The first argument is the child flow that has updated the owning flow.');
      equal(childFlow.status().trust, false, 'The child flow has an untrusted status when the update executes.');
      ok('trust|loops|depth|paused|pending|pendable|targets|route|path|index|phase|state'.split('|')
        .every(function (statKey) {
          return childStatus.hasOwnProperty(statKey);
        }),
        'The second argument has the same base structure as that return by core-proxy.status().'
      );
      ok(status.path != childStatus.path, 'The status is of the child flow at the moment the update triggered.');
      equal(childStatus.trust, false, 'The child status is untrusted when the update is triggered.');
      ok(status.index < childStatus.index, 'The child flow can have a different status values than the one passed to the owning flow\'s update state.');
    }
  })).cb()()

  equal(internalUpdate.target('//originalTarget'), internalUpdate.target('//detour'), 'Child flows update their owner with a target call.');

  deepEqual(updateStatePhases, ['_program@on'], 'If an owning flow\'s callback controls a child flow, the owning flow will only process the last child update.');

  updateStatePhases = [];
  pendByUpdater.go(1);
  child.go(1);
  // child at _in (pended)
  ok(pendByUpdater.status().paused && child.status().pending && child.status().phase == 'in' , 'The _in phase of a child flow can be pended during an update from the owning flow.');
  deepEqual(updateStatePhases, ['_program@in'], 'Pending a child flow via the update of an owning flow does not prevent the update from executing.');
  pendByUpdater.go();
  // child at _on (pended)
  deepEqual(updateStatePhases, ['_program@in', '_program@on'], 'When resuming a child flow, pended by an update of the owning flow, the _in phase does not update twice.');
  ok(pendByUpdater.status().paused && child.status().pending && child.status().phase == 'on', 'The _on phase of a child flow can be pended during an update from the owning flow.');
  pendByUpdater.go();
  // child at _on (free)
  deepEqual(updateStatePhases, ['_program@in', '_program@on'], 'When resuming a child flow, pended by an update of the owning flow, the _on phase does not update twice.');
  child.go(0);
  // child at _out (pended)
  ok(pendByUpdater.status().paused && child.status().pending && child.status().phase == 'out' , 'The _out phase of a child flow can be pended during an update from the owning flow.');
  pendByUpdater.go();
  // child outside of the update state (free)
  deepEqual(updateStatePhases, ['_program@in', '_program@on', '_program@out'], 'When resuming a child flow, pended by an update of the owning flow, the _out phase does not update twice.');
  ok(!pendByUpdater.status().paused && !child.status().pending && child.status().index != 1, 'An owning flow that pends a child flow, has no impact once the child flow has exited the state triggering updates');


  updateStatePhases = [];
  doubleInternalUpdate.go(1);
  deepEqual(updateStatePhases, ['b@on', 'a@out'], 'Updates are fired in the correct order.');

  own(0);
    child.go(1);
    equal(updateStatePhases[0], '_program@in', 'The owning flow is updated when an _update state is entered.');
    equal(updateStatePhases[1], '_program@on', 'The owning flow is updated when navigation ends within an _update state.');
    child.go(0);
    equal(updateStatePhases[2], '_program@out', 'The owning flow is updated when an _update state is exits an _update state.');

  own(1);
    child.go(1);
    child.go(0);
    deepEqual(updateStatePhases, ['foo', '_program@in', 'bar', '_program@on', 'zog', '_program@out'], 'The owning flow is updated after the child callback executes.');

  own(2);
    child.go(1);
    equal(updateStatePhases.length, 0, 'Only updates the owning when inside an _update state.');
    child.go('//relay/sub/');
    deepEqual(updateStatePhases, ['relay@in', 'sub@on'], 'Updates the owning when navigation stops on a descendent of an _update state.');

  own(3);
    child.go('//relay/redirect/');
    deepEqual(updateStatePhases, ['relay@in', 'relay@out'], 'Does not update an owning flow of waypoints in the child\'s navigation.');

  own(4);
    child.go(1);
    equal(updateStatePhases.length, 0, 'The owning flow is not updated when an _update state is pending.');
    child.tmpPender.go();
    deepEqual(updateStatePhases, ['_program@in', '_program@on'], 'The owning flow is updated when the child flow is unpended.')

  own(5);
    child.go(1);
    equal(updateStatePhases.length, 0, 'The owning flow is not updated when an _update state halts at the _in phase.');
    child.go();
    deepEqual(updateStatePhases, ['_program@in', '_program@on'], 'The owning flow is updated when the halted child completes the _in phase.');

  own(6);
    child.go(1);
    deepEqual(updateStatePhases, ['_program@in'], 'The owning flow is not updated when an _update state halts at the _on phase.');
    child.go();
    deepEqual(updateStatePhases, ['_program@in', '_program@on'], 'The owning flow is updated when the halted child completes the _on phase.');

  own(7);
    child.go(1, 0);
    deepEqual(updateStatePhases, ['_program@in'], 'The owning flow is not updated when an _update state halts at the _out phase.');
    child.go();
    deepEqual(updateStatePhases, ['_program@in', '_program@out'], 'The owning flow is updated when the halted child completes the _out phase.');

  stop();

  own(8);
    child.go(1);
    equal(updateStatePhases.length, 0, 'The owning flow is not updated when an _update state delays the _in phase.');
    setTimeout(function () {
      deepEqual(updateStatePhases, ['_program@in', '_program@on'], 'The owning flow is updated when the delayed child completes the _in phase.');

      own(9);
        child.go(1);
        deepEqual(updateStatePhases, ['_program@in'], 'The owning flow is not updated when an _update state delays the _on phase.');
        setTimeout(function () {
          deepEqual(updateStatePhases, ['_program@in', '_program@on'], 'The owning flow is updated when the delayed child completes the _on phase.');

          own(10);
            child.go(1, 0);
            deepEqual(updateStatePhases, ['_program@in'], 'The owning flow is not updated when an _update state delays the _out phase.');
            setTimeout(function () {
              deepEqual(updateStatePhases, ['_program@in', '_program@out'], 'The owning flow is updated when the delayed child completes the _out phase.');

              own(11);

              child.go(1, 0);
              equals(updateStatePhases.length, 0 , 'The owning flow does not update while the child flow\'s _in phase is paused.');

              setTimeout(function () {
                deepEqual(updateStatePhases, ['_program@in', '_program@out'], 'The owning flow is not updated until a child flow completes all delayed phases.');

                own(12);

                child.go(1);
                equals(updateStatePhases.length, 0 , 'The owning flow does not update while the child flow\'s _in phase pending.');
                child.tmpPender.go();
                deepEqual(updateStatePhases, ['_program@in'], 'The child flow does not update the owning flow when pended.');
                child.tmpPender.go();

                setTimeout(function () {
                  deepEqual(updateStatePhases, ['_program@in', '_program@on'], 'The owning flow does not update while the child flow\'s _out phase is pending.')

                  own(13);

                  child.go(1, 0);
                  equals(updateStatePhases.length, 0 , 'The owning flow does not update while the child flow\'s _in phase pending and paused.');

                  setTimeout(function () {
                    deepEqual(
                      child.status().pending &&
                      child.tmpPender.status().paused &&
                      updateStatePhases
                      , ['_program@in']
                      , 'The child flow does not update the owning flow when pended and paused.'
                    );

                    setTimeout(function () {
                      deepEqual(updateStatePhases, ['_program@in', '_program@out'], 'The owning flow does not update while the child flow\'s _out phase is pending and paused.')

                      own(14);

                      child.go(1);

                      setTimeout(function () {
                        ok(child.status().pending && !updateStatePhases.length, 'The owning flow does not update when the child flow is pending, even after a delay');

                        child.tmpPender.go();
                        ok(!child.status().pending && !child.tmpPender.status().paused, 'child is unpended - pender is unpaused');
                        deepEqual(updateStatePhases, ['_program@in', '_program@on'], 'The owning flow updates when unpended.');

                        // resume testing
                        start();
                      }, 10);
                    }, 100);
                  }, 10);
                }, 0);
              }, 100);
            }, 40);
        }, 40);
    }, 40);
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
  ok(!states[2].tags.hasOwnProperty('_pendable') && states[2].pendable, 'When omitted, <Core-State>.pendable is truthy, by default.');
  ok(states[5].tags._pendable && states[5].pendable, 'Setting a truthy value is the same as omission.');
  ok(states[3].tags.hasOwnProperty('_pendable') && !states[3].pendable, 'When falsy, <Core-State>.pendable is falsy.');
  ok(states[4].tags._pendable && !states[3].pendable && !states[4].pendable, 'Descendants of non-pending states ignore the _pendable attribute, and are also non-pending.');
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
  ok(!states[2].tags.hasOwnProperty('_restrict') && !~states[2].restrict, 'When omitted, <Core-State>.restrict is -1, by default.');
  ok(states[6].tags.hasOwnProperty('_restrict') && !~states[5].restrict, 'Setting a falsy value is the same as omission.');
  ok(states[3].tags._restrict && states[3].restrict === 3, 'When truthy, <Core-State>.restrict is the node index.');
  ok(!states[4].tags.hasOwnProperty('_restrict') && states[4].restrict === 3, 'When ommited, ancestor state restrictions are adopted.');
  ok(states[5].tags.hasOwnProperty('_restrict') && !states[5].tags._restrict && !~states[5].restrict, 'When falsy, ancestor state restrictions are ignored.');
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
      state.data.length === keys.length && state.data.every(function (data, defIdx) {
        return data.hasOwnProperty('name') && data.hasOwnProperty('use') && data.hasOwnProperty('value') && data.name === keys[defIdx];
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

test('_store', function () {
  var
    prgm = {jits: 1},
    prgmValue = 1,
    tick = 0,
    corePkgDef = Flow.pkg('core'),
    flow = new Flow({
      _on: function () {
        this.walk(true);
      },
      capture: {
        forced: {
          _on: function () {
            tick = 0;
          },
          configured: {
            _store: {
              capture: false
            },
            _on: function () {
              createFlows();
              if (this.store().length == 12) {
                tick++;
              }
            }
          },
          shorthand: {
            _store: {},
            _on: function () {
              createFlows();
              if (this.store().length == 12) {
                tick++;
              }
            }
          },
          empty: {
            _store: 0,
            _on: function () {
              createFlows();
              equal(this.store().length, 0, 'Instances are not collected when the _store tag is falsy.');
            }
          },
          result: function () {
            equal(tick, 2, 'The capture option is ignored for the first truthy/object _store tag of a branch.');
          }
        },
        configuration: {
          programs: {
            _on: function () {
              tick = 0;
            },
            object: {
              _store: {
                programs: prgm
              },
              _on: function () {
                createFlows();
                if (this.store().length === 2) {
                  tick++;
                }
              }
            },
            value: {
              _store: {
                programs: prgmValue
              },
              _on: function () {
                createFlows();
                if (this.store().length === 2) {
                  tick++;
                }
              }
            },
            array: {
              _store: {
                programs: [prgmValue, prgm]
              },
              _on: function () {
                createFlows();
                equal(this.store().length + tick, 6, 'The `programs` option captures flows compiled from the paired value or array of values.');
              }
            }
          },
          paths: {
            _on: function () {
              tick = 0;
            },
            partial: {
              _store: {
                paths: 'ar'
              },
              _on: function () {
                createFlows();
                if (this.store().length === 2) {
                  tick++;
                }
              }
            },
            array: {
              _store: {
                paths: ['ar', 'e/']
              },
              _on: function () {
                createFlows();
                equal(this.store().length + tick, 5, 'The `path` option captures flows with paths containing the paired string or array of strings.');
              }
            }
          },
          states: {
            _on: function () {
              tick = 0;
            },
            name: {
              _store: {
                states: 'unique'
              },
              _on: function () {
                createFlows();
                if (this.store().length === 1) {
                  tick++;
                }
              }
            },
            index: {
              _store: {
                states: 3
              },
              _on: function () {
                createFlows();
                if (this.store().length === 4) {
                  tick++;
                }
              }
            },
            array: {
              _store: {
                states: ['tar','bat']
              },
              _on: function () {
                createFlows();
                if (this.store().length === 2) {
                  tick++;
                }
              }
            },
            mix: {
              _store: {
                states: ['tar', 'bat', 3]
              },
              _on: function () {
                createFlows();
                equal(this.store().length + tick, 9, 'The `states` option captures flows with state names or indexes.');
              }
            }
          },
          limit: {
            _on: function () {
              tick = 0;
            },
            number: {
              _store: {
                limit: 5
              },
              _on: function () {
                createFlows();
                equal(this.store().length, 5, 'The `limit` option sets the max number of store items');
              }
            },
            zero: {
              _store: {
                limit: 0
              },
              _on: function () {
                createFlows();
                equal(this.store().length, 12, 'A zero `limit` does not limit the number of store items.');
              }
            }
          }
        },
        shortform: {
          truthy: {
            _store: 1,
            _on: function () {
              createFlows();
              equal(this.store().length, 12, 'When the first tag is truthy, all flows are captured.');
            }
          },
          slashString: {
            _store: 'e/',
            _on: function () {
              createFlows();
              equal(this.store().length, 2, 'When the first tag is a string containing a forward-slash, it act as `paths` criteria.');
            }
          },
          stateString: {
            _store: 'bat',
            _on: function () {
              createFlows();
              equal(this.store().length, 1, 'When the first tag is a string with no forward-slashes, it act as `states` criteria.')
            }
          },
          array: {
            objects: {
              _store: [prgm],
              _on: function () {
                createFlows();
                equal(this.store().length, 2, 'When the first tag is an array, objects act as `programs` criteria.');
              }
            },
            numbers: {
              _store: [3],
              _on: function () {
                createFlows();
                equal(this.store().length, 4, 'When the first tag is an array, numbers act as `states` (index) criteria.');
              }
            }
          }
        }
      },
      filter: {
        _store: 1,
        _on: function () {
          createFlows();
        },
        configuration: {
          empty: {
            _store: {},
            _on: function () {
              equal(this.store().length, 12, 'An empty configuration filters zero store items.');
            }
          },
          programs: {
            _on: function () {
              tick = 0;
            },
            single: {
              _store: {
                programs: prgm
              },
              _on: function () {
                if (this.store().length == 2) {
                  tick++;
                }
              }
            },
            array: {
              _store: {
                programs: [prgm]
              },
              _on: function () {
                if (this.store().length == 2) {
                  tick++;
                }
              }
            },
            result: function () {
              equal(tick, 2, 'The `programs` option filters flows compiled from the paired value or array of values.');
            }
          },
          paths: {
            _on: function () {
              tick = 0;
            },
            single: {
              _store: {
                paths: 'ar'
              },
              _on: function () {
                if (this.store().length == 3) {
                  tick++;
                }
              }
            },
            array: {
              _store: {
                paths: ['ar']
              },
              _on: function () {
                if (this.store().length == 3) {
                  tick++;
                }
              }
            },
            result: function () {
              equal(tick, 2, 'The `paths` option filters flows where the current path contains the paired string value (or array of values).');
            }
          },
          states: {
            _on: function () {
              tick = 0;
            },
            name: {
              _store: {
                states: 'unique'
              },
              _on: function () {
                if (this.store().length == 1) {
                  tick++;
                }
              }
            },
            index: {
              _store: {
                states: 0
              },
              _on: function () {
                if (this.store().length == 4) {
                  tick++;
                }
              }
            },
            array: {
              _store: {
                states: ['unique', 0]
              },
              _on: function () {
                if (this.store().length == 5) {
                  tick++;
                }
              }
            },
            result: function () {
              equal(tick, 3, 'The `states` option filters flows where the current state name or index matches the paired value (or array of values).');
            }
          },
          limit: {
            _store: {
              limit: 3
            },
            _on: function () {
              equal(this.store().length, 12, 'The `limit` option has no effect on filter criteria.');
            }
          }
        },
        shortform: {
          _on: function () {
            tick = 0;
          },
          truthy: {
            _store: 1,
            _on: function () {
              equal(this.store().length, 12, 'For nested tags, a truthy value filters zero store items.');
            }
          },
          slashString: {
            _store: '/b',
            _on: function () {
              equal(this.store().length, 1, 'For nested tags, strings containing forward-slashes, filter items where the current path contains the paired value.');
            }
          },
          stateString: {
            _store: 'unique',
            _on: function () {
              equal(this.store().length, 1, 'For nested tags, strinsg without forward-slashes, filter items where the current state matches the paired value.')
            }
          },
          array: {
            objects: {
              _store: [prgm],
              _on: function () {
                equal(this.store().length, 2, 'For nested tags, objects of a paired array are treated like `programs` filter criteria.');
              }
            },
            numbers: {
              _store: [0],
              _on: function () {
                equal(this.store().length, 4, 'For nested tags, numbers of a paired array are treated like `states` (index) filter criteria.');
              }
            }
          }
        },
        nested: {
          _store: 'r/',
          filter: {
            _store: '/t',
            _on: function () {
              equal(this.store().length, 1, 'Each nested tags filters the items filtered by the ancestor tag.');
            }
          }
        }
      },
      done: function () {
        equal(corePkgDef(this).stores.length + this.store().length, 0, 'Outside of the tag, store items are dereferenced.');
      }
    })
  ;
  flow.go(1);

  function createFlows() {
    // on state 2
    (new Flow({unique:1})).go(2);
    (new Flow({bar:1})).go(2);
    new Flow({bat:1});
    (new Flow({tar:1})).go(2);
    // on state 3
    (new Flow({zoo:{red:1}})).go(3);
    new Flow({cat:{blue:1}});
    (new Flow({tart:{job:1}})).go(3);
    (new Flow({red:{pop:1}})).go(3);
    // on state 0
    new Flow(prgm);
    new Flow(prgm);
    // on state 1
    (new Flow(prgmValue)).go(1);
    (new Flow(prgmValue)).go(1);
  }
});

test('_import', function () {
  var
    corePkgDef = Flow.pkg('core'),
    value = {},
    tick = 0,
    prgm = {
      a: {
        _lock: 1,
        c: function () {
          tick++;
          return value;
        }
      },
      b: 1
    },
    importPath = '//a/',
    compiledPath = '//b/c/',
    flow = new Flow(prgm),
    pkgInst = corePkgDef(flow),
    shortFlow, longFlow, tagFlow
  ;

  prgm.b = {
    _import: importPath
  };
  longFlow = new Flow(prgm);
  equal(longFlow.query(compiledPath), compiledPath, 'Assigning an absolute state-query, includes the targeted branch as part of compiled program.');

  prgm.b = importPath;
  shortFlow = new Flow(prgm);
  equal(shortFlow.query(compiledPath), compiledPath, 'Directly pairing a program-state with a query has the same effect.');

  prgm.b = {
    _import: importPath,
    _lock: 0,
    _pendable: 0
  };
  tagFlow = new Flow(prgm);
  ok(
    tagFlow.target(compiledPath) === longFlow.target(compiledPath) &&
      tick === 2,
    'The imported branch shares the same structure as the original.'
  );

  ok(
    tagFlow.lock() === false &&
      longFlow.lock() === true,
    'Attributes of an importing state override attributes of the imported state.'
  );

  equal(
    tagFlow.status().pendable,
    false,
    'Attributes from the importing state are compiled as if present in the imported state.'
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

test('.owner', function () {
  var
    corePkgDef = Flow.pkg('core'),
    child,
    createFromExternalBlessedFunction,
    createOwnableChildFlow = function () {
      child = corePkgDef(new Flow({_owner: 1}));
    },
    createChildFlow = function () {
      child = corePkgDef(new Flow());
    },
    owner = new Flow({
      _on: function () {
        createOwnableChildFlow();
        strictEqual(child.owner, corePkgDef(this), 'A flow has an owner when it is created within the callback of another flow.');
        createChildFlow();
        ok(!child.owner, 'A flow can not have an owner if no state has a valid _update attribute.');
        child = 0;
        createFromExternalBlessedFunction = this.bless(function () {
          createOwnableChildFlow();
          ok(!child.owner, 'A flow has no owner when called externally, even via blessed functions.');
          owner.go('delayCallback');
        });
      },
      delayCallback: {
        _in: function () {
          this.wait(createOwnableChildFlow, 0);
        },
        _on: function () {
          strictEqual(child.owner, corePkgDef(this), 'A flow has an owner when instantiated via a .wait() callback.');
          this.go('../delay');
        }
      },
      delay: {
        _in: function () {
          this.wait(0);
        },
        _on: function () {
          createOwnableChildFlow();
          strictEqual(child.owner, corePkgDef(this), 'A flow has an owner when instantiated after a delay.');
          start();
        }
      }
    });
  createOwnableChildFlow();
  ok(!child.owner, 'Flows created outside of another flow have no owner.');
  child = 0;
  owner.target(1);
  createFromExternalBlessedFunction();
  stop();
});

test('.allowed()', function () {
  var
    hostKeyRef = {},
    flow = new Flow(0, {cedeHosts:[hostKeyRef]}),
    flowPkg = Flow.pkg('core')(flow),
    isFlowAccesible = function () {
      return flowPkg.allowed();
    },
    badHost = new Flow(isFlowAccesible),
    goodHost = new Flow(isFlowAccesible, {hostKey: hostKeyRef}),
    goodBadHost = new Flow(function () {
      return badHost.target(1);
    },  {hostKey: hostKeyRef}),
    badGoodHost = new Flow(function () {
      return goodHost.target(1);
    })
  ;
  equal(flowPkg.allowed.length, 0, 'Expects zero parameters.');
  equal(flowPkg.allowed(), false, 'Returns a falsy value by default.');
  flowPkg.trust = 1;
  ok(flowPkg.trust && flowPkg.allowed(), 'Returns a truthy value when <core-instance>.trust is truthy.');
  flowPkg.trust = 0;
  ok(!flowPkg.trust && !badHost.target(1), 'Returns a falsy value when invoked from the callback of an unknown host flow.');
  ok(!flowPkg.trust && goodHost.target(1), 'Returns a truthy value when invoked from the callback of a known host flow.');
  ok(!flowPkg.trust && !goodBadHost.target(1) && badGoodHost.target(1), 'Only the first host flow is considered when determining the return value.');
});

test('.getDef()', function () {
  var corePkgDef = Flow.pkg('core'),
    pkgInst = corePkgDef(new Flow()),
    keyName = 'foo',
    instDefs = pkgInst.data,
    defTrackingObject;
  [[null,'"null"'], [undefined,'"undefined"'],['','an empty string'],['!@#$%^&*()','a non-alphanumeric string']].forEach(
    function (argSet) {
      equal(pkgInst.getDef(argSet[0]), false, 'Passing ' + argSet[1] + ' returns false.');
    }
  );
  ok(
    !instDefs.hasOwnProperty(keyName)
    && (defTrackingObject = pkgInst.getDef(keyName))
    && instDefs.hasOwnProperty(keyName),
    'Creates and returns a data tracking object in <Core-Instance>.data with the given alphanumeric string.'
  );
  deepEqual(pkgInst.getDef(keyName), defTrackingObject, 'Passing an existing key returns the same data tracking object.');
  ok(defTrackingObject.hasOwnProperty('name'), '<DTO>.name is a string.');
  equal(T.type(defTrackingObject.values), 'array', '<DTO>.values is an array.');
  equal(pkgInst.getDef('bar', keyName).values[0], keyName, 'The second argument becomes the first entry in the data tracking object\'s values array.');
  pkgInst.getDef(keyName, 1);
  equal(defTrackingObject.values.length, 0, 'Passing a second argument for an existing data tracking object does nothing.');
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
  function customFunction() {}
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
    'Adds data tracking objects for each data configuration declared by a state\'s _data attribute.'
  );
  states[2].scopeData();
  equal(dtos.foo.values.length, 2, 'Scoping a state with an existing data configuration, increments the .values array of the corresponding tracking object.');
  equal(dtos.foo.values[0], value2, 'The first item of a data tracking object matches the last value scoped.');
  states[3].scopeData();
  equal(dtos.bar.values[0], dtos.bar.values[1], 'Scoping a data configuration with no value, duplicates the last value scoped.');
  states[4].scopeData();
  equal(dtos.bar.values.length, 2, 'Scoping a state that does not have defined variable configurations for existing data tracking objects, does not increment their .values array.');
});

test('.within()', function () {
  var
    flow = new Flow({ // 1
      child: {}       // 2
    }),
    pkg = Flow.pkg('core')(flow),
    states = pkg.nodes;
  equal(states[2].within.length, 1, 'state.within() expects one argument.');
  equal(typeof states[0].within(), 'boolean', 'Returns a boolean.');
  ok(states[2].within(1), 'Accepts a numeric argument.');
  ok(states[2].within(states[1]), 'Accepts a state object as an argument.');
  equal(states[1].within(1), false, 'Returns false when a state is checked against itself.');
  pkg.proxy.go(1);
  ok(states[2].within(1) && states[2].within(), 'When called with no arguments, state.within() looks inside the current state.');
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
  var flow = new Flow({
    parent: {
      _root: 1,
      youngest: 1,
      startingpoint: {
        firstchild: 1,
        lastchild: 1
      },
      next: 1,
      oldest: 1
    }
  });
  flow.go('//parent/startingpoint/');
  [
    '.,//parent/startingpoint/',
    '..,//parent/',
    '@firstchild,//parent/startingpoint/firstchild/',
    '@flow,..//',
    '@lastchild,//parent/startingpoint/lastchild/',
    '@next,//parent/next/',
    '@oldest,//parent/oldest/',
    '@parent,//parent/',
    '@program,//',
    '@root,//parent/',
    '@self,//parent/startingpoint/',
    '@youngest,//parent/youngest/'
  ].forEach(function (set) {
    var
      parts = set.split(',')
    ;
    equal(flow.query(parts[0]), parts[1], 'The query token "' + parts[0] + '" matches correctly.');
  });
  // todo - test against grouped token combinations "[]"
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
  tic = 0;
  equal(
    (new Flow({
      _on: function () {
        this.go(2, 'goal');
        this.go(2);
        this.go(2, 'child', 2, 'child', 2);
      },
      child: function () {
        tic++;
      },
      goal: function () {
        return tic;
      }
    })).target(1),
    1,
    'From within a program, targeting the same state multiple times is applied once.'
  );
});

test('.walk()', function () {
  var
    corePkgDef = Flow.pkg('core'),
    tick = 0,
    flow = new Flow({
      _on: function () {
        this.walk();
        equal(this.status().targets.length, corePkgDef(this).nodes[1].children.length, 'Equivalent to calling go for every child of the current state.');
        this.lock(1);
      },
      a: function () {
        tick++;
      },
      b: '//a/',
      c: '//a/',
      d: '//a/',
      e: '//a/',
      f: '//a/',
      g: {
        _on: function () {
          equal(tick, 6, 'Directs a flow to child states.');
          this.walk();
        },
        a: function () {
          tick = 0;
        }
      },
      nests: function () {
        equal(tick, 0, 'Nested calls execute before the parent call completes.');
      },
      multiple: {
        _on: function () {
          var
            initialTargetCount = this.status().targets.length
          ;
          this.walk();
          this.walk();
          this.walk();
          this.walk();
          equal(this.status().targets.length - initialTargetCount, 2, 'From a state callback, multiple calls are applied once.');
        },
        a: 1,
        b: 1
      },
      deep: {
        _on: function () {
          tick = 0;
          this.walk(true);
        },
        a: {
          b: {
            c: function () {
              tick++;
            }
          }
        },
        d: function () {
          equal(tick, 1, 'Passing `true` walks an entire branch.');
        }
      },
      direct: {
        _root: 1,
        _on: function () {
          tick = 0;
          this.walk('/jump/to/state');
        },
        jump: {
          _on: function () {
            tick++;
          },
          to: {
            _on: function () {
              tick++;
            },
            state: {
              _on: function () {
                var
                  targetCount = this.status().targets.length;
                ok(1, 'The walk target is traversed.');
                this.walk();
                equal(targetCount, this.status().targets.length, 'Ignores calls to walk children already being walked.');
                tick++;
              },
              a: function () {
                tick++;
              },
              b: '//direct/jump/to/state/a/',
              c: '//direct/jump/to/state/a/',
              d: '//direct/jump/to/state/a/',
              end: function () {
                equal(tick, 5, 'Passing a state-query, walks the target state and children.');
                this.walk('/jump/to/branch', true);
              }
            },
            branch: {
              _on: function () {
                var
                  targetCount = this.status().targets.length;
                tick = 0;
                this.walk(true);
                equal(targetCount, this.status().targets.length, 'Ignores calls to walk descendents already being walked.');
              },
              a: {
                _on: function () {
                  tick++;
                },
                a: {
                  _on: function () {
                    tick++;
                  },
                  end: function () {
                    equal(tick, 2, 'Passing a state-query, walks the target state and descendents.');
                    this.go('/jump/to/self');
                  }
                }
              }
            },
            self: {
              _in: function () {
                tick = 0;
              },
              _on: function () {
                if (!this.status().loops) {
                  this.walk('.');
                }
                tick++;
              },
              child: 1,
              child2: function () {
                equal(tick, 1, 'If targeting the current state via a query, the current state is not repeated.');
              }
            }
          }
        }
      }
    })
  ;

  flow.go(1);
  strictEqual(flow.walk(), false, 'Respects locked flows like any other traversal method.');
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
        ok(
          [NaN, -1, null, {}, [], undefined, function () {}].every(function (param) {
            return scope.wait(param) === false;
          }),
          'Returns false when passed a single argument that is not a positive integer.'
        );
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
      _in: function () {
        var
          that = this
        ;
        ok(
          ![null, undefined, NaN, '', /baz/, 1, {}, []].some(function (arg) {
            return that.bless(arg);
          }),
          'Returns false when called without a function.'
        );
        blessedQuery = this.bless(rawQuery);
        equal(typeof blessedQuery, 'function', 'Returns a function when passed a function.');
        equal(this.bless(function () {return this;})(), window, 'Blessed functions execute in the global scope.');
        this.lock(1);
      },
      _on: onBehavior,
      restricted: {
        _restrict: 1,
        _in: function () {
          this.lock(0);
        },
        _on: onBehavior
      }
    }),
    blessedQuery
  ;

  function onBehavior() {
    return value;
  }

  function rawQuery(qry) {
    return flow.target(qry);
  }

  equal(flow.bless.length, 1, 'The bless function expects one parameter.');
  equal(flow.bless(rawQuery), false, 'Returns false when called from an untrusted routine.');
  flow.target(1);
  ok(
    flow.lock()
    && rawQuery('restricted') === false
    && blessedQuery('restricted') === value,
    'A blessed function can direct a locked flow.'
  );
  ok(
    !flow.lock()
    && rawQuery(1) === false
    && blessedQuery(1) === value,
    'A blessed function ignores traversal restrictions.'
  );
});

test('.data()', function () {
  var flow = new Flow(),
    name = 'foo',
    value = 1,
    batch = {
      bar: 'baz',
      zog: 'pop'
    };
  ok(
    ['.', '', 0, 1, undefined, function () {}, null, NaN].every(function (arg) {
      return flow.data(arg) === false;
    }),
    'Returns false when the first argument is not a valid string or an empty/invalid object.'
  );
  equal(flow.data(name), undefined, 'The value of undeclared variables is "undefined".');
  deepEqual(flow.data(), [name], 'Returns an array of declared variables, when called without arguments.');
  equal(flow.data(name, value), true, 'Returns true when setting a variable.');
  equal(flow.data(name), value, 'Returns the last set value of a variable.');
  equal(flow.data(batch), true, 'Returns true when given an object with one or more key/value pairs.');
  equal(flow.data('bar'), 'baz', 'Passing an object allows batch addition of defined variable keys and values.');
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
    cb = flow.cb();
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
  cb.none();
  equal(flow.args().length, 0, 'There are no arguments when a flow completes navigating.');
  cb.paused(val1);
  equal(flow.args()[0], val1, 'Arguments are available when the flow is paused.');
  equal(flow.args(1, val2), true, 'Returns true when passed a valid index and second argument.');
  flow.args(1, undefined);
  equal(flow.args().length, 1, 'Removes the last argument when setting the last indice to undefined.');
});

test('.owner()', function () {
  var
    childOnCallbackPassThru = function (cb) {
      cb.call(this);
    }
    , ownedFlow
    , unownedFlow
    , parentFlow = new Flow(function () {
      unownedFlow = new Flow(childOnCallbackPassThru)
      ownedFlow = new Flow({
        _owner: 1
        , _on: childOnCallbackPassThru
      });
    })
    , orphanFlow = new Flow({
      _owner: 1
      , _on: childOnCallbackPassThru
    })
  ;
  parentFlow.go(1);
  equal(parentFlow.owner.length, 0, 'Expects zero paraneters');
  strictEqual(unownedFlow.owner(), false, 'Return false when called in an untrusted environment for an unowned flow.');
  strictEqual(ownedFlow.owner(), true, 'Return true when called in an untrusted environment for an owned flow.');
  unownedFlow.target(1, function () {
    strictEqual(this.owner(), false, 'Returns false when called internally and the flow has no owner.');
  });
  ownedFlow.target(1, function () {
    ok(this.owner() instanceof Flow, 'Returns the owning flow when called internally and the flow has an owner.');
  });
  ok(
    Flow.pkg('core')(unownedFlow).nodes.every(function (state) {
      return !state.upOwn;
    })
    &&
    Flow.pkg('core')(ownedFlow).nodes.some(function (state) {
      return state.upOwn;
    })
    ,
    'Flow programs with an _owner attribute can be owned.'
  );
  orphanFlow.target(1, function () {
    strictEqual(this.owner(), false, 'Flows initialized via another flow callback can be owned.');
  });
});

test('.cb()', function () {
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
        equal(cb.rtnVal(), true, 'Returns true when invoked within a component function.');
        return false;
      }
    },
    flow = new Flow(program),
    coreInst = Flow.pkg('core')(flow),
    initialIndex = coreInst.tank.currentIndex,
    cb;
  equal(flow.cb.length, 1, 'Accepts at least one parameter.');
  cb = flow.cb();
  equal(typeof cb, 'function', 'Returns a function, when called with no arguments.');
  ok(cb.hasOwnProperty('toString'), 'The returned function has a custom .toString function.');
  ok(
    coreInst.nodes.every(function (node) {
      flow.go(node.index);
      return flow.cb() === cb;
    }),
    'Returns the same function when called with no arguments, regardless of the current state.'
  );
  equal(cb, coreInst.nodes[1].cb, 'The returned function is the ".cb" member of the _program state.');
  ok(cb.a && cb.a.b && cb.a.c, 'The returned function has member functions which match the order and heirarchy of the flow\'s program.');
  ok(
    coreInst.nodes.slice(2, -1).every(function (node) {
      flow.go(node.index);
      return flow.cb(true) !== cb && flow.cb(true) === node.cb;
    }),
    'Returns a function matching the `.cb` member of the current state, when passed `true`.'
  );
  ok(
    cb() === true && // returns true when there is no _on callback
    cb.undef() === true && // returns true when the _on callback returns undefined
    cb.delayed() === false && // returns false when a state halts traversal
    cb.rtnVal() === rtnVal && // returns the value returned by the _on callback
    cb.redirect() === rtnVal && // returns result of final state, when redirected
    flow.go(initialIndex) && cb.redirect() && initialIndex !== coreInst.tank.currentIndex, // changes the current state
    'The returned callback-functions behave like curried calls of flow.target().'
  );
  ok(
    [false, '', -1, -.01, {}, [], /s/, function () {}].every(function (param) {
      return flow.cb(param) === false;
    }) &&
    [true, 1, 0, 'foo', flow.cb()].every(function (param) {
      return typeof flow.cb(param) === 'function';
    }),
    'Returns `false` when passed anything besides a state-query or `true`.'
  );
  equal(
    flow.cb('foo').hasOwnProperty('toString'),
    false,
    'Functions from state-queries do not have a local .toString() method.'
  );
  flow.go('/delayed');
  ok(
    flow.cb(0) === coreInst.nodes[0].cb,
    'If a state query matches a state\'s path or index exactly, the corresponding node\'s `.cb` function is returned.'
  );
  cb = flow.cb('@next');
  strictEqual(
    cb(),
    flow.target('//rtnVal/'),
    'Functions non-absolute queries are invoked relative to the flow\'s current state.'
  );
});

test('.status()', function () {
  var status = (new Flow({})).status();
  'trust|loops|depth|paused|pending|pendable|targets|route|path|index|phase|state'
    .split('|')
    .forEach(
      function (mbr) {
        ok(status.hasOwnProperty(mbr), 'The status object contains a "' + mbr + '" member.');
      }
    );
});

test('.store()', function () {
  var
    ary,
    prgm = {},
    testAry = [1, 0, null, {}, function () {}, /h/, undefined, '', 'foo', true, false, [], [{}, 1, 0, 'foo', /h/]],
    flowAry = [new Flow(), new Flow()],
    flow = new Flow({
      _store: 1,
      _in: function () {
        var
          children = [],
          inst,
          ary
        ;
        var kid1 = new Flow({
          a: 1
        });
        kid1.go('//a/');
        children.push(kid1);
        var kid2 = new Flow({
          b: 1
        });
        kid2.go(1);
        children.push(kid2);
        children.push((inst = new Flow(prgm)));
        ary = this.store();
        ok(
          ary.every(function (inst, idx) {
            return inst === children[idx];
          }),
          'Internal calls return an array of instances captured while executing a state-callback.'
        );
        ok(
          ary !== this.store(),
          'Each internal call returns a new array.'
        );
        ok(
          this.store('a')[0] === kid1,
          'Internal calls may filter instances with one or more (or an array of) filter parameters.'
        );
        ok(
          this.store()[0] === kid1,
          'The first stored instance is the earliest flow initialized.'
        );
        ok(
          this.store().slice(-1)[0] === inst,
          'The last stored instance is the most recently initialized flow.'
        );
      },
      sub: {
        _store: 'a'
      },
      nested: {
        _store: 0,
        _on: function () {
          var
            self = this,
            storeLength = this.store().length,
            inst = new Flow()
          ;
          strictEqual(this.store(inst), true, 'Internal calls may add flow instances to the store (manually).');
          ok(this.store(inst) === true && storeLength + 1 == this.store().length, 'Existing items are not added to the store (but still return `true`).');
          ok(~this.store().indexOf(inst) && this.store(inst, true) && !this.store().length, 'Internal calls can remove store item by reference.');
          strictEqual(this.store(inst, true), true, 'Attempting to remove a missing item does nothing (but still returns `true`).');
          ok(
            this.store([new Flow(), new Flow()]) === true &&
              this.store(new Flow(), new Flow()) === true,
            'Returns `true` when adding or removing items.'
          );
          ok(
            this.store([inst], 0, new Flow(), true, false, function () {}) === true &&
              ~this.store().indexOf(inst),
            'When the first parameter is an array, the second parameter becomes truthy and remaining parameters are ignored.'
          );
          ok(
            this.store(this.store(), true) &&
              !this.store().length,
            'Passing core-proxy.store() as the first parameter, then `true`, cleans all store items.'
          );
        }
      }
    })
  ;
  equal(flow.store.length, 0, 'Expects zero parameters.');
  equal(typeof flow.store(), 'number', 'External calls get the number of items in the current store, not references.');
  equal(flow.store(), 0, 'The store is empty when the flow is initilized.');
  ok(
    !(
      flow.store(new Flow()) ||
      flow.store(new Flow(), true) ||
      flow.store(new Flow(), false) ||
      flow.store([new Flow(), new Flow()]) ||
      flow.store([new Flow(), new Flow()], true) ||
      flow.store([new Flow(), new Flow()], false)
    ),
    'External calls may not add or remove stored items.'
  );
  flow.go('//');
  ok(
    flow.store('foo', true) === false &&
    flow.store(testAry, true) === false,
    'External calls can not filter on the master item store.'
  );
  equal(flow.store(), 3, 'External calls receive the number of items added/removed by a program.');
  equal(flow.store('a'), 1, 'External calls may filter the current store of items, by state name.');
  equal(flow.store('//'), 3, 'External calls may filter items by path string.');
  equal(flow.store(prgm), 1, 'External calls may filter items by program object.');
  flow.go('//sub/');
  equal(flow.store(), 1, 'External calls filter on items already filtered by a state\'s _store configuration.');
  flow.go('//nested/');
});

module('&lt;Proxy&gt;.status()');

test('.trust', function () {
  var flow = new Flow({
      _on: function () {
        equal(this.status().trust, true, 'true when called internally.');
      },
      wait: function () {
        this.wait(function () {
          equal(this.status().trust, true, 'true when called internally from a delayed function.');
          start();
        },10);
      }
    });
  equal(flow.status().trust, false, 'false when called externally.');
  flow.target(1);
  flow.target('//wait/');
  equal(flow.status().trust, false, 'false when called externally and the flow is idle.');
  (new Flow(function () {
    var hostedFlow = new Flow(0, {cedeHosts:[1]});
    equal(hostedFlow.status().trust, false, 'false when called externally by an authorized host flow.');
  }, {hostKey:1})).go(1);
  stop();
});

test('.permit', function () {
  var flow = new Flow({
      _on: function () {
        equal(this.status().permit, true, 'true when called internally.');
      },
      wait: function () {
        this.wait(function () {
          equal(this.status().permit, true, 'true when called internally from a delayed function.');
          start();
        },10);
      }
    });
  equal(flow.status().permit, false, 'false when called externally.');
  flow.target(1);
  flow.target('//wait/');
  equal(flow.status().permit, false, 'false when called externally and the flow is idle.');
  (new Flow(function () {
    var hostedFlow = new Flow(0, {cedeHosts:[1]});
    equal(hostedFlow.status().permit, true, 'true when called externally by an authorized host flow.');
  }, {hostKey:1})).go(1);
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
    })).cb(),
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
      };
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

/*
TODO: add test for pendable attribute and child overrides
*/

test('.pending', function () {
  var pend = (new Flow({
      _on: function () {
        this.wait();
      },
      reset: 1
    })).cb(),
    nestedPender = (new Flow({
      _on: function () {
        pend();
      },
      reset: 1
    })).cb(),
    doublePender = (new Flow({
      _on: function () {
        pend();
        this.wait();
      },
      reset: 1
    })).cb(),
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
    })).cb(),
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
    })).cb(),
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
  var
    corePkgDef = Flow.pkg('core')
    , oldOnName = corePkgDef.events[0]
    , newOnName = 'foo'
    , simple = new Flow({
      _in: function () {
        testPhase('in', this);
        this.target(0);
        this.go('b');
      },
      a: {
        _over: testPhase('over'),
        _bover: testPhase('bover')
      },
      b: testPhase('on'),
      _out: testPhase('out')
    })
    , delay = new Flow(function () {
      this.wait();
    })
    , pend = new Flow({
      _in: function () {
        (new Flow(function () {
          this.wait();
        })).cb()();
      }
    })
  ;

  function testPhase(phase, flow) {
    if (arguments.length == 1) {
      return function () {
        testPhase(phase, this);
      }
    }
    equal(flow.status().phase, phase, 'status.phase is "' + phase + '" as expected.');
  }

  equal((new Flow()).status().phase, 'on', 'The initial phase is "on".');
  simple.target(1);
  equal(simple.status().phase, 'on', 'The phase is "on" when the flow has stopped.');
  delay.target(1);
  equal(delay.status().phase, 'on', 'The phase remains the same when the flow is paused.');

  corePkgDef.events[0] = newOnName;
  equal(delay.status().phase, newOnName, 'The phase name reflects the values from the array, core-package-definition.events.');
  corePkgDef.events[0] = oldOnName;

  pend.go(1);
  equal(pend.status().phase, 'in', 'Is not empty when a flow is pended.');
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
      equal(async.query('//done/'), '//done/', 'Can navigate to descendants of the restricted async action.');
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
      ok(!async.lock() && async.target(0), 'Can navigate an unlocked flow.');
      equal(async.go(1), true, 'Started a locked async action.');
      ok(!async.target(0), 'Cannot navigate a locked flow.');
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
    equal(this.args(0, 'bacon'), true, 'proxy.args() can set arguments internally.');
    equal(this.go(0), true, 'proxy.go() works internally.');
    equal(this.target(0, 'foo'), true, 'proxy.target() works internally.');
    equal(this.args(0), 'foo', 'Using proxy.target() internally does change arguments.');
    equal(this.data('hello', 'chicken'), true, 'proxy.data() works internally.');
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
  equal(flow.lock(), true, 'Externally, after pausing navigation, proxy.lock() returns true.');
  equal(flow.args(0), 'foo', 'proxy.args() can get arguments externally.');
  equal(flow.args(0, 'bar'), false, 'proxy.args() will not set arguments externally.');
  equal(flow.data('hello'), 'chicken', 'proxy.data() can get variables externally.');
  equal(flow.data('hello', 'world'), true, 'proxy.data() can set variables externally.');
  equal(flow.go(0), false, 'pkg.go() does not work externally.');
  equal(flow.target(0, 'bar'), false, 'pkg.target() does not work externally.');
  equal(flow.args(0), 'foo', 'Using pkg.target() externally does not change arguments.');
  stop();
});

// TODO: test that .go() and .target() clear timeouts set by .wait()

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
    eventHandlerCallBack = eventHandlerFlow.cb();
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
  })).cb();
  equal(fibonacci(10), 89,'The "fibonacci" flow works as expected.');
  fibonacci(1000);
});

test('Prevent consecutive execution for the same state.', function () {
  var tic = 0,
    doImportantThing = (new Flow({
      _in: function () {
        tic++;
      }
    })).cb();
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
    app = appFlow.cb();
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
    })).cb(),
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