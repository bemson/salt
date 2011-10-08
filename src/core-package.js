/*!
 * Flow Package: Core v0.X / Bemi Faison (c) 2011 / MIT
 * 
 * Depends on the Flow platform
 * http://github.com/bemson/Flow/tree/nextgen
 */
!function (window, Object, Array, Math, Flow, undefined) {
  // init vars
  var core = Flow.pkg('core'), // define core package
    /*
    this generator handles any nesting and combination of _var component values...
    ...strings
      > _var: 'foo'
    ...objects
      > _var: {foo: 'bar'}
    ...arrays of strings, arrays and objects
      > _var: ['f', 'o', 'b']
      > _var: [['f'], ['o'], ['b]]
      > _var: [{foo: 'bar'}, {hello: 'world'}]
      > _var: [['g',{foo: 'bar'}], 'alpha', {accts: 9}] // mixed
    */
    generateVariableConfigurationObjects = new genData(function (name, value, parent, dataset, flags, shared) { // generator to extract variable pairs from a _var component
      // init vars
      var data = this, // alias self
        keep = 1, // flag when this data will be a variable configuration
        obj = { // variable configuration object
          name: data.name, // name of variable
          value: data.value, // initial variable value
          use: 1 // flag to use this value (true by default)
        };
      // omit everything
      flags.omit = 1;
      // flag when this is an object
      data.O = typeof value === 'object';
      // flag when this is an Array
      data.A = value instanceof Array;
      // if there is a parent...
      if (parent) {
        // if the parent is an array...
        if (parent.A) {
          // if this is an object...
          if (data.O) {
            // exclude from resulting array
            keep = 0;
          }
        } else { // otherwise, when the parent is not an array (assume the parent is an object)...
          // don't scan the children of this object (because it's the value of this _vars config, not a new one)
          flags.scan = 0;
        }
      } else { // otherwise, when there is no parent...
        // if there is no keys in shared...
        if (!shared.keys) {
          // init shared.keys
          shared.keys = {};
        }
        // if the first item is an object...
        if (data.O) {
          // exclude from the result
          keep = 0;
        }
      }
      // if keeping this data...
      if (keep) {
        // if there is no parent, or the parent is an array...
        if (!parent || parent.A) {
          // use the value as the name
          obj.name = value;
          // set the value to undefined
          obj.value = undefined;
          // flag that this data has no value
          obj.use = 0;
        }
        // if the (resolved) name is valid...
        if (isVariableNameValid(obj.name)) {
          // convert name to string
          obj.name += '';
          // if this key name exists...
          if (shared.keys.hasOwnProperty(obj.name)) {
            // remove existing variable configuration
            dataset.splice(shared.keys[obj.name], 1);
          }
          // add to dataset and capture index
          shared.keys[obj.name] = dataset.push(obj) - 1;
        }
      }
    }),
    generateTokens = new genData(function (name, value, parent, dataset, flags) { // return tokens found in the given string
      // init vars
      var data = this, // alias self
        slash = '/'; // shorthand forward-slash character
      // init set property (default is false, or "not a set")
      data.set = 0;
      // capture parent
      data.parent = parent;
      // init done property
      data.done = 0;
      // if this is a string...
      if (typeof value === 'string') {
        // if slashes exist...
        if (~value.indexOf(slash)) {
          // split into slashes
          data.value = value.split(slash);
        } else if (value.charAt(0) === '[') { // or, when a match-set...
          // remove brackets and split by the match-set delimiter
          data.value = value.slice(1,-1).split('|');
          // flag that this is a set
          data.set = 1;
        }
      }
      // if the value is (still) a string...
      if (typeof data.value === 'string') {
        // if the parent exists and is a set...
        if (parent && parent.set) {
          // identify this as part of that set
          data.set = 1;
          // identify this as the last option in the set
          parent.last = data;
        }
        // set "first" property, based on whether items already exist in the dataset
        data.first = !dataset.length;
      } else { // otherwise, when not a string...
        // exclude from dataset
        flags.omit = 1;
      }
    }),
    activeFlows = []; // collection of active flows

  if (!activeFlows.every) {
    Array.prototype.every = function(fun /*, thisp */) {
      "use strict";

      if (this === void 0 || this === null)
        throw new TypeError();

      var t = Object(this);
      var len = t.length >>> 0;
      if (typeof fun !== "function")
        throw new TypeError();

      var thisp = arguments[1];
      for (var i = 0; i < len; i++) {
        if (!fun.call(thisp, t[i], i, t))
          return false;
      }

      return true;
    };
  }

  // returns true when the argument is a valid variable name
  function isVariableNameValid(name) {
    return name != null && /\w/.test(name);
  }

  // custom typeOf adds 'array' to native typeof output
  function typeOf(obj) {
    // init vars
    var type = typeof obj; // get native type string
    // return string, check for array when an object
    return type === 'object' && ~((new Object()).toString.call(obj).indexOf('y')) ? 'array' : type;
  }


  // define traversal event names
  core.events = [
    'on',
    'in',
    'out',
    'over',
    'bover'
  ];

  // customize data parsing
  core.dataKey = /^_/; // pattern for identifying data keys
  core.invalidKey = /^\W+$|^toString$|^[@\[]|[\/\|]/; // pattern for identifying invalid keys

  // initialize the package instance with custom properties
  // only argument is the object passed after the program when calling "new Flow(program, extraArg)"
  core.init = function () {
    // init vars
    var pkg = this; // alias self
    // collection of arguments for traversal functions
    pkg.args = [];
    // collection of state calls made while traversing
    pkg.calls = [];
    // collection of states encountered while traversing
    pkg.route = [];
    // collection of variables
    pkg.vars = {};
    // init delay object
    pkg.delay = {};
    // collection of cached values
    pkg.cache = {
      indexOf: {} // token query cache
    };
    // flag when api calls are trusted
    pkg.trust = 0;
    // flag when a component function is being executed
    pkg.inFnc = 0;
    // init locked flag
    pkg.locked = 0;
    // init index of state paths
    pkg.stateIds = {};
    // the number of child flows fired by this flow's program functions
    pkg.pending = 0;
    // collect parent flow references
    pkg.parentFlows = [];
    // collection of targeted states
    pkg.targets = [];
    // identify the initial state for this flow, 0 by default
    pkg.phase = 0;
    // initialize each state
    pkg.states.forEach(function (state, idx) {
      // init vars
      var parent = idx && pkg.states[state.parentIndex]; // capture parent when available
      // index this path with this index position
      pkg.stateIds[state.location] = idx;
      // add reference to the package-instance containing this state
      state.pkg = pkg;
      // set pendable flag, (true by default, and otherwise inherited when the parent is not pendable)
      state.pendable = (parent && !parent.pendable) ? 0 : (state.data.hasOwnProperty('_pendable') ? !!state.data._pendable : 1);
      // set isRoot flag, based on index or "_root" component
      state.isRoot = idx < 2 ? 1 : !!state.data._root;
      // set rootIndex to self or the parent's root, based on isRoot flag
      state.rootIndex = state.isRoot ? state.index : parent.rootIndex;
      // set restrict flag, based on the truthiness of the "_restrict" component or the parent's restricted flag
      state.restrict = !!(state.data._restrict || (parent && parent.restrict));
      // define map function - a curried call to .target()
      state.map = function () {
        // init vars
        var args = [].slice.call(arguments), // capture any arguments
          scope = pkg.proxy.pkgs.core; // alias this package-proxy
        // prepend the target index
        args.unshift(idx);
        // invoke target explicitly, pass along arguments
        return scope.target.apply(scope, args);
      };
      // add variable configurations for this state
      state.vars = generateVariableConfigurationObjects(state.data._vars);
      // if this state's index is not 0...
      if (state.index) {
        // append to parent's map function
        parent.map[state.name] = state.map;
      }
      // set custom toString for passing proxy reference
      state.map.toString = function () {
        // return this state's location
        return state.location;
      };
      // define array to hold traversal functions for each traversal name...
      state.fncs = core.events.map(function (name) {
        name = '_' + name;
        //  set traversal function to 0 or the corresponding data key (when a function)
        return typeof state.data[name] === 'function' ? state.data[name] : 0;
      });
      // if there is no _on[0] function and this state's value is a function...
      if (!state.fncs[0] && typeof state.value === 'function') {
        // use as the _on[0] traversal function
        state.fncs[0] = state.value;
      }
    });
  };

  // define prototype of any package instances
  core.prototype = {
    // return index of the state resolved from a state reference
    /*
    qry - (string|function.toString()|number|object.index) which points to a state
    state - object - the state to begin any dynamic referencing
    */
    indexOf: function (qry, state) {
      // init vars
      var pkg = this, // alias self
        states = pkg.states, // alias for minification and performance
        stateIds = pkg.stateIds, // alias for minification and performance
        qryLeaf, // the untokenized portion of a tokenized query
        qryState, // the state to query from, when parsing tokens
        isAbsQry, // flags when the query begins with a @program or @flow token
        tokens, // collection of individual tokens (extracted from the query)
        token, // the token being parsed
        idx = -1; // the index to return for the resolved state (default is -1, indicates when the state could not be found)
      // use the current state, when state is omitted
      state = state || pkg.states[pkg.tank.currentIndex];
      // based on the type of qry...
      switch (typeof qry) {
        case 'object':
          // if not the null object...
          if (qry !== null) {
            // assume the object is a state, and retrieve it's index property value
            qry = qry.index;
          }
        case 'number':
          // if the index is valid...
          if (states[qry]) {
            // set idx to this number
            idx = qry;
          }
        break;

        case 'function':
          // get toString version of this function
          qry = qry + '';
        case 'string':
          // if the string is empty...
          if (qry == '') {
            break;
          }
          // if qry is the _flow or _root id...
          if (qry === '..//' || qry === '//') {
            // set idx to 0 or 1, based on qry
            idx = qry === '//' ? 1 : 0;
          } else { // otherwise, when the string is not the _flow or _root ids...
            // extract tokens from the query
            tokens = qry.match(/^(?:(?:\.{1,2}|[@\[][^\/]+)\/?)+/);
            /*
            THIS RXP is allowing this to pass thru...
              [@program][a] -> no "][" pattern should be allowed
            */
            // if there are tokens...
            if (tokens) {
              // if there is no generic or specific cache for this query...
              if (!pkg.cache.indexOf.hasOwnProperty(qry + state.index) && !pkg.cache.indexOf.hasOwnProperty(qry)) {
                // get remaining query (without token)
                qryLeaf = qry.substr(tokens[0].length);
                // flag when this is an absolute query
                isAbsQry = 0;
                // parse tokens
                tokens = generateTokens(tokens[0]);
                // set idx to the current state's index (for the initial loop)
                idx = state.index;
                // while there are tokens and the found idx is valid...
                while ((qryState = states[idx]) && tokens.length) {
                  // remove this token for processing
                  token = tokens.shift();
                  // if this token is not part of a set, or it's set has not been satisfied...
                  if (!token.set || !token.parent.done) {
                    // based on the token value...
                    switch (token.value) {
                      case '@child':
                        idx = qryState.firstChildIndex;
                      break;

                      case '@next':
                        idx = qryState.nextIndex;
                      break;

                      case '@parent':
                      case '..':
                        idx = qryState.parentIndex;
                      break;

                      case '@previous':
                        idx = qryState.previousIndex;
                      break;

                      case '@root': // root relative the to the current state
                        idx = qryState.rootIndex;
                      break;

                      case '@program': // program root
                      case '@flow': // parent to program root
                        // if this is the first token to be processed...
                        if (token.first) {
                          // flag that this is an absolute query
                          isAbsQry = 1;
                        }
                        // set the index to either absolute indice
                        idx = (~token.value.indexOf('f')) ? 0 : 1;
                      break;

                      case '@oldest':
                      case '@youngest':
                        // set index to first or last child, based on whether there is a parent
                        idx = (states[qryState.parentIndex]) ? (states[qryState.parentIndex][~token.value.indexOf('y') ? 'firstChildIndex' : 'lastChildIndex']) : -1;
                      break;

                      case '@self':
                      case '.':
                        idx = qryState.index;
                      break;

                      default:
                        // if the token is not empty..
                        if (token.value) {
                          // fail parsing due to unrecognized token
                          idx = -1;
                        }
                    }
                    // if part of a set and the idx is valid...
                    if (token.set) {
                      // if the idx is valid...
                      if (idx > -1) {
                        // flag that we're done searching this set
                        token.parent.done = 1;
                      } else if (token.parent.last !== token) { // or, when invalid and this is not the last set option...
                        // reset idx to the current state's index
                        idx = qryState.index;
                      }
                    }
                  }
                }
                // set index to the resolved state index or -1, append and validate with qryEnd, if present
                idx = (qryState && (!qryLeaf || (qryState = states[stateIds[qryState.location + qryLeaf.replace(/([^\/])$/,'$1/')]]))) ? qryState.index : -1;
                // cache the query result (original query, plus nothing or the state index)
                pkg.cache.indexOf[qry + (isAbsQry ? '' : state.index)] = idx;
              }
              // return the value of the cached query id, use generic cache-id if the specific one is not present
              idx = pkg.cache.indexOf.hasOwnProperty(qry + state.index) ? pkg.cache.indexOf[qry + state.index] : pkg.cache.indexOf[qry];
            } else { // otherwise, when there are no tokens...
              // if the first character is not a forward slash...
              if (qry.charAt(0) !== '/') {
                // prepend current location
                qry = state.location + qry;
              } else if (qry.charAt(1) !== '/') { // or, when the second character is not a forward slash...
                // prepend the current state's root
                qry = states[state.rootIndex].location + qry.substr(1);
              }
              // if the last character is not a forward slash...
              if (qry.slice(-1) !== '/') {
                // append the final forward slash
                qry += '/';
              }
              // set idx to a string match or -1
              idx = stateIds.hasOwnProperty(qry) ? stateIds[qry] : -1;
            }
          }
        // break; - not needed, since it's the last option
      }
      // return resolved index
      return idx;
    },
    //  return index of the resolved state reference, or -1 when it's invalid or unavailable from the given/current state
    vetIndexOf: function (qry, state) {
      // init vars
      var pkg = this, // alias self
        targetIdx = pkg.indexOf(qry, state); // get the index of the target state
      // use the current state, when state is omitted
      state = state || pkg.states[pkg.tank.currentIndex];
      // return the target index or -1, based on whether the target is valid, given the trust status of the package or the restrictions of the current state
      return (~targetIdx && (pkg.trust || state.canTgt(pkg.states[targetIdx]))) ? targetIdx : -1;
    },
    // add a variable-tracking-object to this package
    getVar: function (name, value) {
      // init vars
      var pkg = this; // alias self
      // return false when name is invalid or an existing or new variable tracking object
      return isVariableNameValid(name) && (pkg.vars.hasOwnProperty(name) ? pkg.vars[name] : (pkg.vars[name] = {
        name: name,
        values: arguments.length > 1 ? [value] : []
      }));
    },
    // proceed towards the latest/current target
    go: function (tgt) {
      // init vars
      var pkg = this; // alias self
      // if a tgt is given...
      if (tgt > -1) {
        // reset the targets array
        pkg.targets = [tgt];
      }
      // unpause this flow
      pkg.pause = 0;
      // exit when pending, untrusted and locked, or direct tank to the first target and return the number of traversals completed
      return pkg.pending || (pkg.locked && !pkg.trust) ? 0 : pkg.tank.go(pkg.targets[0]);
    }
  };

  // do something when the tank starts moving
  core.onBegin = function (evtName) {
    // init vars
    var pkg = this, // alias this package
      delayFnc = pkg.delay.callback, // capture the callback function (if any)
      parentFlow = activeFlows[0];
    // if there is a parent flow and it's current state is pendable...
    if (parentFlow && parentFlow.states[parentFlow.tank.currentIndex].pendable) {
      // increment the number of child flows for the parent flow
      parentFlow.pending++;
      // if this parent is unique...
      if (!~pkg.parentFlows.indexOf(parentFlow)) {
        // capture for later
        pkg.parentFlows.unshift(parentFlow);
      }
    }
    // add this flow to the activeFlows list
    activeFlows.unshift(pkg);
    // clear the delay timer
    window.clearTimeout(pkg.delay.timer);
    // clear callback
    pkg.delay.callback = 0;
    // if there was a delayed callback...
    if (delayFnc) {
      // trust api calls
      pkg.trust = 1;
      // execute the delayed function in scope of the proxy
      delayFnc.call(pkg.proxy);
      // untrust api calls
      pkg.trust = 0;
    }
  };

  // do something when the tank traverses a state
  core.onTraverse = function (evtName, phase) {
    // init vars
    var pkg = this, // the package instance
      state = pkg.states[pkg.tank.currentIndex]; // the state being traversed (prototyped, read-only value)
    // trust api calls
    pkg.trust = 1;
    // if there is an out state...
    if (pkg.outState) {
      // descope variables in the outstate
      pkg.outState.scopeVars(1);
      // clear the outstate
      pkg.outState = 0;
    }
    // based on the motion id...
    switch (phase) {
      case 1: // in
        // scope variables for this state
        state.scopeVars();
      break;

      case 2: // out
        // set the outState to the current state
        pkg.outState = state;
      break;
    }
    // capture this phase
    pkg.phase = phase;
    // if the current index is not the same as the last one in the route...
    if (state.index !== pkg.route.slice(-1)[0]) {
      // add index to the route
      pkg.route.push(state.index);
    }
    // if there is a function for this phase...
    if (state.fncs[phase]) {
      // note that we are calling this program function
      pkg.calls.push(state.index + '.' + phase);
      // flag that we're inside a component function
      pkg.inFnc = 1;
      // execute function, in scope of the proxy - pass arguments when traversing _on[0] on the destination state
      pkg.result = state.fncs[phase].apply(pkg.proxy, (phase || pkg.targets.length - 1) ? [] : pkg.args);
      // flag that we're outside a component function
      pkg.inFnc = 0;
    }
    // if we are pending...
    if (pkg.pending) {
      // stop navigating
      pkg.tank.stop();
    }
    // untrust api calls
    pkg.trust = 0;
  };

  // do something when the tank stops
  core.onEnd = function (evtName) {
    // init vars
    var pkg = this, // alias self
      blocked = pkg.pause || pkg.pending; // flag when this flow can not move forward
    // if stopped outside the on[0] phase...
    if (pkg.phase) {
      // (just) remove from activeFlows
      activeFlows.shift();
    } else { // otherwise, when stopped on a state...
      // if the tank no longer has a target...
      if (!~pkg.tank.targetIndex) {
        // remove this target state (even if paused, so it isn't repeated when resumed)
        pkg.targets.shift();
      }
      // if not paused and not pending and there are more targets...
      if (!blocked && pkg.targets.length) {
        // go to the next target
        pkg.tank.go(pkg.targets[0]);
      } else { // or, when paused or pending or there are no more targets...
        // remove from activeFlows (since we're about to exit)
        activeFlows.shift();
        // if not blocked (neither paused nor pending)...
        if (!blocked) {
          // clear call arguments
          pkg.args = [];
          // clear calls array
          pkg.calls = [];
          // clear route
          pkg.route = [];
          // if there are parent flows...
          if (pkg.parentFlows.length) {
            // remove a child from each parent
            pkg.parentFlows.forEach(function (parentFlow) {
              // remove child from parent (now)
              pkg.parentFlows.pending--;
            });
            // queue post-loop callback
            pkg.tank.post(function () {
              // copy the parents
              var parents = [].concat(pkg.parentFlows);
              // clear parents
              pkg.parentFlows = [];
              // tell each parent flow...
              parents.forEach(function (parentFlow) {
                // if there are no child flows left...
                if (!--parentFlow.pending) {
                  // if not in "on" phase...
                  if (parentFlow.phase) {
                    // tell the parent to resume (towards it's target)
                    parentFlow.go();
                  } else { // otherwise, when pended during the parent's "on" phase...
                    // tell the parent's tank to complete this cycle
                    parentFlow.tank.go();
                  }
                }
              });
            });
          }
        }
      }
    }
  };

  // add method to determine if another state can be targeted from this state
  core.state.canTgt = function (targetState) {
    // init vars
    var state = this; // alias self
    // return true if this state has no restrictions, or when the target is not this state and within it's path
    return !state.restrict || (state !== targetState && !targetState.location.indexOf(state.location));
  };

  // add method to de/scope variables
  core.state.scopeVars = function (descope) {
    // init vars
    var state = this, // alias self (for closure)
      pkg = state.pkg; // alias the package containing this state
    // with each variable in the given state
    state.vars.forEach(function (varCfg) {
      // init vars
      var vto = pkg.getVar(varCfg.name); // the variable tracking object with this name
      // if descoping variables...
      if (descope) {
        // remove current value from values
        vto.values.shift();
        // if no other values exist...
        if (!vto.values.length) {
          // remove the variable tracking object
          delete pkg.vars[varCfg.name];
        }
      } else { // otherwise, when scoping a variable tracking object...
        // add new or copied value, based on the config
        vto.values.unshift(varCfg.use ? varCfg.value : vto.values[0]);
      }
    });
  };

  // add method to return map of this flow's states
  core.proxy.map = function () {
    // return pre-made function-list
    return core(this).states[1].map;
  };

  // add method to 
  core.proxy.query = function (state) {
    // init vars
    var pkg = core(this), // get package instance
      states = []; // state indice resolved by query
    // return false, a string or array of strings, based on whether a single state reference fails
    return (
      // at least one parameter
      state
      // and
      &&
      // all parameters resolve to states
      [].slice.call(arguments).every(function (stateRef) {
        // init vars
        var idx = pkg.vetIndexOf(stateRef), // resolve index of this reference
          result = 0; // default result
        // if this index if not -1...
        if (~idx) {
          // capture the absolute path for this state
          states.push(pkg.states[idx].location);
          // flag that this element passed
          result = 1;
        }
        // return the result
        return result;
      })
    ) ? (states.length > 0 ? states : states[0]) : false;
  };

  // access and edit the locked status of a flow
  core.proxy.lock = function (set) {
    // init vars
    var pkg = core(this), // alias self
      result = false; // call status
    // if arguments were passed...
    if (arguments.length) {
      // if allowed to change the lock status...
      if (pkg.trust) {
        // set new lock state
        pkg.locked = !!set;
        // flag success in changing the locked property of this flow
        result = true;
      }
    } else {
      // return current locked status
      result = !!pkg.locked;
    }
    // return call status
    return result;
  };

  // access and edit scoped variables for a state
  core.proxy.vars = function (name, value) {
    // init vars
    var pkg = core(this), // get package
      argCnt = arguments.length, // get number of arguments passed
      v, // loop vars
      rtn = false; // value to return (default is false)
    // if passed arguments...
    if (argCnt) {
      // if the name is valid...
      if (typeof name === 'string' && /\w/.test(name)) {
        // resolve variable tracker
        v = pkg.getVar(name);
        // if a value was passed...
        if (argCnt > 1) {
          // set the current value
          v.values[0] = value;
          // flag success with setting the value
          rtn = true;
        } else { // otherwise, when no value is passed...
          // return the current value
          rtn = v.values[0];
        }
      }
    } else { // otherwise, when passed no arguments...
      // prepare to return an array
      rtn = [];
      // with each property in the vars object...
      for (v in pkg.vars) {
        // if this member is not inherited...
        if (pkg.vars.hasOwnProperty(v)) {
          // add to collection of names to return
          rtn.push(v);
        }
      }
      // sort variable names
      rtn.sort();
    }
    // return result of call
    return rtn;
  };

  // access and edit the arguments passed to traversal functions
  core.proxy.args = function (idx, value) {
    // init vars
    var pkg = core(this), // get package
      args = pkg.args, // alias arguments from this package
      argsLn = args.length, // capture number of args elements
      argCnt = arguments.length, // get number of arguments passed
      idxType = typeOf(idx), // get type of first argument
      rtn = true; // value to return (default is true)
    // if passed arguments and this flow is unlocked...
    if (argCnt && !pkg.locked) {
      // if idx is an array...
      if (idxType === 'array') {
        // replace args with a copy of the idx array
        pkg.args = [].concat(idx);
      } else if (idxType === 'number') { // or, when idx is a number (assuming an integer)...
        // if a value was passed...
        if (argCnt > 1) {
          // if the value is undefined and the last index was targeted...
          if (value === undefined && idx === argsLn - 1) {
            // remove the last index
            args.pop();
          } else { // otherwise, when not setting the last index to an undefined value...
            // set the value at this index
            args[idx] = value;
          }
        } else if (idx > -1 && idx < argsLn) { // or, when no value is passed and the idx is a valid...
          // return the value at the targeted index
          rtn = args[idx];
        } else { // otherwise, when no value is passed and the index is invalid...
          // flag failure to retrieve this index
          rtn = false;
        }
      } else { // otherwise, when the type of idx is invalid...
        // flag failure to return anything because idx is unrecognized
        rtn = false;
      }
    } else if (!argCnt) { // otherwise, when given no arguments...
      // return a copy of the arguments array (always available - even to locked flows)
      rtn = args.concat();
    }
    // send return value
    return rtn;
  };

  // add method to program api
  core.proxy.target = function (qry) {
    // init vars
    var pkg = core(this), // alias this package
      tgtIdx = pkg.vetIndexOf(qry); // resolve a state index from qry
    // if the destination state is valid, and the flow can move...
    if (~tgtIdx) {
      // capture arguments after the tgt
      pkg.args = [].slice.call(arguments).slice(1);
      // navigate towards this index
      pkg.go(tgtIdx);
    } else { // otherwise, when the target state is invalid...
      // return false
      return false;
    }
    // return false when called during navigation or the navigation has not completed. Otherwise, return the result of the _on function, or true when that result is undefined.
    return (pkg.inFnc || pkg.pending || pkg.phase || pkg.pause) ? false : (pkg.result === undefined ? true : pkg.result);
  };

  /**
  Target, add, or insert states to traverse, or resume towards the last target state.
  Returns false when there is no new destination, a waypoint was invalid, or the flow was locked or pending.

  Forms:
    go() - resume traversal
    go(waypoints) - add or insert waypoints
  **/
  core.proxy.go = function () {
    // init vars
    var pkg = core(this), // alias self
      tgts = pkg.targets, // alias array of current state targtes
      wasPaused = pkg.pause, // capture current paused status
      waypoints = [], // collection of targets to add to targets
      wpLn, // placeholder for the number of waypoints added
      result = 0; // success status for this call
    // if any and all state references are valid...
    if (
      [].slice.call(arguments).every(function (stateRef) {
        // init vars
        var idx = pkg.vetIndexOf(stateRef); // resolve index of this reference
        // add to waypoints
        waypoints.push(idx);
        // return true when the resolved index is not -1
        return ~idx;
      })
    ) {
      // if there are waypoints...
      if ((wpLn = waypoints.length)) {
        // if there are targets...
        if (tgts.length) {
          // if the last waypoint matches the current or the second target (based on the phase), remove the matching waypoint
          if (waypoints[wpLn - 1] === tgts[pkg.phase ? 0 : 1]) {
            waypoints.pop();
          }
          // if not in the _on[0] phase...
          if (pkg.phase) {
            // prepend waypoints
            tgts = waypoints.concat(tgts);
          } else { // otherwise, when in the _on[0] phase...
            // replace the current target with the waypoints
            tgts.splice.apply(tgts,[0, 1,].concat(waypoints));
          }
        } else { // otherwise, when there are targets...
          // set route to waypoints
          tgts = waypoints;
        }
        // capture array of targets
        pkg.targets = tgts;
      }
      // capture result of move attempt or true when paused
      result = pkg.go() || wasPaused;
    }
    // return result
    return !!result;
  };

  // delay traversing
  core.proxy.wait = function () {
    // init vars
    var pkg = core(this), // get package
      args = arguments, // alias arguments
      argLn = args.length, // capture number of arguments passed
      noAction = argLn < 2, // flag when no action will be taken after a delay
      delayFnc = noAction ? 0 : args[0], // capture first argument as action to take after the delay, when more than one argument is passed
      isFnc = typeof delayFnc === 'function', // flag when the delay is a function
      delayStateIdx = pkg.indexOf(delayFnc), // get state referenced by delayFnc (the first argument) - no vet check, since this would be a priviledged call
      time = ~~args[argLn - 1], // use last argument as time parameter
      result = 0; // indicates result of call
    // if trusted and the the argument's are valid...
    if (pkg.trust && (!argLn || (time > -1 && (noAction || ~delayStateIdx || isFnc)))) {
      // flag that we've paused this flow
      pkg.pause = 1;
      // stop the tank
      pkg.tank.stop();
      // clear any existing delay
      window.clearTimeout(pkg.delay.timer);
      // set delay to truthy value, callback, or traversal call
      pkg.delay.timer = argLn ?
        window.setTimeout(
          function () {
            // if there is a delay action and it's a state index...
            if (!noAction && ~delayStateIdx) {
              // go to this state index
              pkg.go(delayStateIdx);
            } else { // otherwise, when there is no delay, or the action is a callback...
              // if there is a callback function...
              if (isFnc) {
                // set delay callback (fires during the "begin" event)
                pkg.delay.callback = delayFnc;
              }
              // traverse towards the current target
              pkg.go();
            }
          },
          time // number of milliseconds to wait
        ) :
        1; // set to 1 to pause indefinitely
      // indicate that this flow has been delayed
      result = 1;
    }
    // return whether this function caused a delay
    return !!result;
  };

  // capture aspects of this package
  core.proxy.status = function  () {
    // init vars
    var proxy = this, // this flow proxy
      status = {}; // the status object to build and ultimately return
    // with each package...
    Flow.pkg().forEach(function (pkgName) {
      // init vars
      var pkgDef = Flow.pkg(pkgName), // the package-definition
        stats, key; // placeholder and loop vars for scanning the status object returned
      // if this package-definition has a static addStatus function...
      if (typeof pkgDef.addStatus === 'function') {
        // pass the status object, and capture the returned object
        stats = pkgDef.addStatus.call(pkgDef(proxy), status);
        // with each key in the returned object (if any)...
        for (key in stats) {
          // if not inherited...
          if (stats.hasOwnProperty(key)) {
            // copy to status object
            status[key] = stats[key];
          }
        }
      }
    });
    // return final status object
    return status;
  };

  // define status properties
  // returns an object whose keys are copied to the final status object
  //   newer package definitions can override the keys set by older package definitions
  core.addStatus = function (status) {
    // init vars
    var pkg = this, // the package instance
      current = pkg.states[pkg.tank.currentIndex], // alias the current state
      tgtsLn = pkg.targets.length, // capture the number of targets
      showTraverseInfo = pkg.pause || tgtsLn || pkg.pending, // permit showing traversal information when paused, pending, or there are targets
      getLocationFromIndex = function (idx) {
        return pkg.states[idx].location;
      };
    // return all the objects to be displayed when in the status object
    return { // object of status keys to return
      trust: !!pkg.trust,
      loops: Math.max((pkg.calls.join().match(new RegExp('\\b' + current.index + '.' + pkg.phase, 'g')) || []).length - 1, 0),
      depth: current.depth,
      paused: !!pkg.pause,
      pending: !!pkg.pending,
      pendable: !!current.pendable,
      targets: pkg.targets.map(getLocationFromIndex),
      route: showTraverseInfo ? pkg.route.map(getLocationFromIndex) : [],
      location: current.location,
      index: current.index,
      phase: showTraverseInfo ? core.events[pkg.phase] : '',
      state: current.name
    };
  };
}(this, Object, Array, Math, Flow);