/*
Flow Package: core
*/
!function (window, Object, Array, Math, Flow, undefined) {

  // init vars
  var core = Flow.pkg('core'), // define core package
    typeOf = function (obj) { // custom typeOf function
      // init vars
      var type = typeof obj; // get native type string
      // return string, check for array when an object
      return type === 'object' && ~((new Object()).toString.call(obj).indexOf('y')) ? 'array' : type;
    },
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
    genVars = new genData(function (name, value, parent, dataset, flags) { // generator to extract variable pairs from a _var component
      // init vars
      var data = this; // alias self
      // flag when this is an object
      data.O = typeof value === 'object';
      // flag when this is an Array
      data.A = value instanceof Array;
      // flag that this has a value (true by default)
      data.V = 1;
      // if there is a parent...
      if (parent) {
        // if the parent is an array...
        if (parent.A) {
          // if this is an object...
          if (data.O) {
            // exclude from result when this is an object within an array
            flags.exclude = 1;
          }
        } else { // otherwise, when the parent is not an array (assume the parent is an object)...
          // don't scan the children of this object (because it's the value, not a _var config)
          flags.scanValue = 0;
        }
      } else if (data.O) { // otherwise, when the first item is an object...
        // exclude from the result
        flags.exclude = 1;
      }
      // if this data has not been exluced...
      if (!flags.exclude) {
        // if there is no parent, or the parent is an array...
        if (!parent || parent.A) {
          // use the value as the name
          data.name = value;
          // set the value to undefined
          data.value = undefined;
          // flag that this data has no value
          data.V = 0;
        }
        // if the name is invalid...
        if (data.name == null || !/\w/.test(data.name)) {
          // exclude this data
          flags.exclude = 1;
        }
        // if this data is still not excluded...
        if (!flags.exclude) {
          // find and remove any data with the same name
          dataset
            .filter(function (d, i) {
              // get the (one) item with the same name
              return d.name === data.name && ((d.I = i) || 1);
            })
            .forEach(function (d) {
              // remove the duplicate index (only ever one)
              dataset.splice(d.I,1);
            });
        }
      }
    }),
    genParsedQuery = new genData(function (name, value, parent, dataset, flags) { // parse token and return a state index and absolute query indicator
      // init vars
      var data = this, // alias self
        slash = '/', // shorthand forward-slash character
        parse = 1, // flags when a token may be parsed (default is true)
        dsLn = dataset.length, // capture the length of the dataset
        idx = -1, // the index of the state resolved by the current token (default is no state)
        state, parentState; // placeholders for referencing and resolving states
      // if this is the first item...
      if (!dsLn) {
        // flag that this is the initial array being processed
        data.i = 1;
      }
      // if this is the second value...
      if (dsLn === 1) {
        // don't scan this value
        flags.scan = 0;
        // set parent (the init array) property, for tracking variables during iteration
        parent.v = {
          f: value[0], // the flow containing all states and state-id's
          s: value[1], // the state to begin resolving tokens
          p: 0, // the number of parsed tokens
          a: 0, // flag when this query is absolute (the same every time, regardless of the starting state)
        };
        // init default return value
        dataset[0] = idx;
        // init default absolute-query flag
        dataset[1] = 0;
      }
      // if iterated pased the second item from the initial array...
      if (dsLn > 1) {
        // reference parent property (for tracking variables)
        data.v = parent.v;
        // copy set information (may not be present)
        data.s = parent.s;
        // if this is a string whose parent is NOT the main array...
        if (typeof value === 'string' && !parent.i) {
          // if slashes exist...
          if (~value.indexOf(slash)) {
            // split into slashes
            data.value = value.split(slash);
          } else if (value.charAt(0) === '[') { // or, when a match-set...
            // remove brackets and split by the match-set delimiter
            data.value = value.slice(1,-1).split('|');
            // init set array, to track progress while parsing this set
            data.s = [
              0, // flag indicating when this set has been matched
              0, // the number of options processed in this set
              data.value.length // the total number of options available in this set
            ];
          }
        }
        // if the resolved value is (still) a non-empty string...
        if (typeof data.value === 'string' && value) {
          // if this token is part of a set...
          if (data.s) {
            // increment the number of set-options processed
            data.s[1]++;
            // if this set has been satisfied...
            if (data.s[0]) {
              // skip parsing this token
              parse = 0;
            }
          }
          // if parsing this token...
          if (parse) {
            // reference the current state (for minification and performance)
            state = data.v.s;
            // reference the parent state (for minification and performance)
            parentState = data.v.f.states[state.parentIndex];
            // based on the token...
            switch (value) {
              case '@child':
                idx = state.firstChildIndex;
              break;

              case '@next':
                idx = state.nextIndex;
              break;

              case '@oldest':
                if (parentState) idx = parentState.lastChildIndex;
              break;

              case '@parent':
              case '..':
                idx = state.parentIndex;
              break;

              case '@previous':
                idx = state.previousIndex;
              break;

              case '@root': // root relative the to the current state
                idx = state.rootIndex;
              break;

              case '@program': // program root
              case '@flow': // parent to program root
                // if no other tokens have been parsed
                if (!data.v.p) {
                  // flag that this query is absolute (since the first token is absolute)
                  data.v.a = 1;
                }
                // set the index to either absolute indice
                idx = (~value.indexOf('f')) ? 0 : 1;
              break;

              break;

              case '@youngest':
                if (parentState) idx = parentState.firstChildIndex;
              break;

              case '@self':
              case '.':
                idx = state.index;
              break;

              default:
                // if value does not end with a slash...
                if (value.slice(-1) !== slash) {
                  // append slash
                  value += slash;
                }
                // append value to token
                state = state.location + value;
                // set idx to the index of the targeted state (by location), or -1
                idx = data.v.f.stateIds.hasOwnProperty(state) ? data.v.f.stateIds[state] : -1;
            }
            // if this is the first token parsed...
            if (!data.v.p++) {
              // capture whether this query is absolute or not
              dataset[1] = data.v.a;
            }
            // if the resolved index is valid...
            if (data.v.f.states[idx]) {
              // if this token was part of a set...
              if (data.s) {
                // flag that the set has been satisfied
                data.s[0]++;
              }
              // capture the state reference for further parsing
              data.v.s = data.v.f.states[idx];
              // capture the valid index
              dataset[0] = idx;
            } else if (!data.s || data.s[1] === data.s[2]) { // otherwise, when the index is invalid and this is not a set, or the last option in a set...
              // clear the index
              dataset[0] = null;
              // truncate to two indice
              dataset.splice(1);
              // exit iterator
              flags.exit = 1;
            }
          }
        }
      }
    }),
    activeFlows = []; // collection of active flows

  // define traversal event names
  core.events = 'on|in|out|over'.split('|');

  // customize data parsing
  core.dataKey = /^_/; // pattern for identifying data keys
  core.invalidKey = /^toString$|^[@\[]|[\/\|]/; // pattern for identifying invalid keys

  // initialize the package instance with custom properties
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
    // init locked flag
    pkg.locked = 0;
    // init index of state paths
    pkg.stateIds = {};
    // the number of child flows fired by this flow's program functions
    pkg.childFlows = 0;
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
      // define array to hold traversal functions
      state.fncs = [];
      // set pendable flag, (true by default, and otherwise inherited when the parent is not pendable)
      state.pendable = (parent && !parent.pendable) ? 0 : (state.data.hasOwnProperty('_pendable') ? !!state.data._pendable : 1);
      // set isRoot flag, based on index or "_root" component
      state.isRoot = idx < 2 ? 1 : !!state.data._root;
      // set rootIndex to self or the parent's root, based on isRoot flag
      state.rootIndex = state.isRoot ? state.index : parent.rootIndex;
      // set restricted path to this state's location, based on the presence of the "_restrict" component or the parent's restrict path
      state.restrictPath = state.data._restrict ? state.location : (parent ? parent.restrictPath : '');
      // define map function - a curried call to .target()
      state.map = function () {
        // invoke target explicitly
        return pkg.proxy.pkgs.core.target(idx, arguments);
      };
      // add variable configurations for this node
      state.vars = genVars(state.data._vars).map(function (data) {
        // return an object based on the given flags
        return {
          name: data.name, // variable name
          value: data.value, // variable value
          use: data.V // flag indicating whether this value should be used when this variable is scoped
        };
      });
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
      // with each traversal name...
      core.events.forEach(function (name, idx) {
        name = '_' + name;
        //  set traversal function to 0 or the corresponding data key (when a function)
        state.fncs[idx] = typeof state.data[name] === 'function' ? state.data[name] : 0;
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
        tokens, // tokens found in tokenized queries
        gpqResult, // stores the result from the genParsedQuery call
        idx = -1; // the index to return for the resolved state (default is -1, indicates when the state could not be found)
      // use the current state, when state is omitted
      state = state || pkg.states[pkg.flow.currentIndex];
      // based on the type of qry...
      switch (typeof qry) {
        case 'object':
          // assume the object is a state, and retreive it's index, as an integer
          qry = parseInt(qry.index);
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
          // if qry is the _flow or _root id...
          if (qry === '..//' || qry === '//') {
            // set idx to 0 or 1, based on qry
            idx = qry === '//' ? 1 : 0;
          } else { // otherwise, when the string is not the _flow or _root ids...
            // get tokens in this string
            tokens = qry.match(/^(?:(?:\.{1,2}|[@\[][^\/]+)\/?)+/);
            /*
            THIS RXP is allowing this to pass thru...
              [@program][a] -> no "][" pattern should be allowed
            */
            // if there are tokens...
            if (tokens) {
              // if there is no generic or specific cache for this query...
              if (!pkg.cache.indexOf.hasOwnProperty(qry + state.index) && !pkg.cache.indexOf.hasOwnProperty(qry)) {
                // resolve state from tokens - pass all states[0], the starting state[1], and the final string to append[2]
                gpqResult = genParsedQuery([[pkg, state], tokens, qry.substr(tokens[0].length)]);
                // if an index was returned...
                if (gpqResult[0] !== null) {
                  // set idx to the resolved state's index
                  idx = gpqResult[0];
                }
                // cache the query result (original query, plus nothing or the state index)
                pkg.cache.indexOf[qry + (gpqResult[1] ? '' : state.index)] = idx;
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
          // break; - not needed, since it's the last option
        }
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
      state = state || pkg.states[pkg.flow.currentIndex];
      // return the target index or -1, based on whether the target is valid, given the trusted status of the package or the restrictions of the current state
      return (~targetIdx && (pkg.trust || !pkg.states[targetIdx].location.indexOf(state.restrictPath))) ? targetIdx : -1;
    },
    // add a variable-tracking-object to this package
    getVar: function (name, value) {
      // init vars
      var pkg = this; // alias self
      // return an existing or new variable tracking object
      return (pkg.vars.hasOwnProperty(name)) ? pkg.vars[name] : (pkg.vars[name] = {
        name: name,
        values: arguments.length > 1 ? [value] : []
      });
    },
    // create/remove variable tracking objects and increase/reduce their values
    scopeVars: function (state, descope) {
      // init vars
      var pkg = this; // alias self (for closure)
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
    },
    // flag whether this flow can move towards the next target
    canMove: function (skipTargetCheck) {
      // init vars
      var pkg = this; // alias self
      // allow movement if trusted (in a program function) or unlocked, there is somewhere to go, and there are no child flows (i.e., not pending)
      return (pkg.trusted || !pkg.locked) && (skipTargetCheck || pkg.targets.length) && !pkg.childFlows;
    },
    // proceed towards the latest target
    move: function () {
      // init vars
      var pkg = this, // alias self
        result = 0;
      // if there are targets...
      if (pkg.targets.length) {
        // direct tank to the first target
        pkg.flow.go(pkg.targets[0]);
        // flag that there is somewhere to go
        result = 1;
      } else { // otherwise, when there are no targets
        // clear the pause flag
        pkg.paused = 0;
      }
      // return result from move attempt (depends on if there is somewhere to go)
      return result;
    }
  };

  // do something when the tank starts moving
  core.onBegin = function () {
    // init vars
    var pkg = this, // alias this package
      delayFnc = pkg.delay.callback, // capture the callback function (if any)
      parentFlow = activeFlows[0];
    // if there is a parent flow and it's current state is pendable...
    if (parentFlow && parentFlow.current.pendable) {
      // increment the number of child flows for the parent flow
      parentFlow.childFlows++;
      // capture this parentFlow for later
      pkg.parentFlows.unshift(parentFlow);
    }
    // if not paused...
    if (!pkg.paused) {
      // reset calls array
      pkg.calls =  [];
      // reset route array with the starting state index
      pkg.route = [];
    }
    // clear pause flag
    pkg.paused = 0;
    // add this flow to the activeFlows list
    activeFlows.unshift(pkg);
    // clear the delay timer
    window.clearTimeout(pkg.delay.timer);
    // clear callback
    pkg.delay.callback = 0;
    // if there was a delayed callback...
    if (delayFnc) {
      // execute the delayed function in scope of the proxy
      delayFnc.call(pkg.proxy);
    }
  };

  // do something when the tank traverses a state
  core.onTraverse = function (phase) {
    // init vars
    var pkg = this, // the package instance
      state = pkg.states[pkg.flow.currentIndex]; // the state being traversed (prototyped, read-only value)
    // trust api calls
    pkg.trusted = 1;
    // flag that we are no longer paused
    pkg.paused = 0;
    // if there is an out state...
    if (pkg.outState) {
      // descope variables in the outstate
      pkg.scopeVars(pkg.outState, 1);
      // clear the outstate
      pkg.outState = 0;
    }
    // based on the motion id...
    switch (phase) {
      case 1: // in
        // scope variables for this state
        pkg.scopeVars(state);
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
      // execute function, in scope of the proxy - pass arguments when traversing _on[0] on the destination state
      pkg.result = state.fncs[phase].apply(pkg.proxy, (phase || pkg.targets.length - 1) ? [] : pkg.args);
    }
    // untrust api calls
    pkg.trusted = 0;
  };

  // do something when the tank stops
  core.onEnd = function () {
    // init vars
    var pkg = this; // alias self
    // if stopped outside the on[0] phase...
    if (pkg.phase) {
      // set pause flag
      pkg.paused = 1;
      // (just) remove from activeFlows
      activeFlows.pop();
    } else { // otherwise, when stopped on a state...
      // remove this target state (even if paused, so it isn't repeated when resumed)
      pkg.targets.shift();
      // if not paused and there are more targets...
      if (!pkg.paused && pkg.targets.length) {
        // go to the next target
        pkg.flow.go(pkg.targets[0]);
      } else { // or, when paused or there are no more targets...
        // remove from activeFlows
        activeFlows.pop();
        // clear call arguments
        pkg.args = [];
        // if there are parent flows...
        if (pkg.parentFlows.length) {
          // queue post-loop callback
          pkg.flow.post(function () {
            // tell each parent flow...
            pkg.parentFlows.forEach(function (parentFlow) {
              // ...to continue toward it's target
              parentFlow.move();
            })
          });
        }
      }
    }
  };

  // add method to return map of this flow's states
  core.api.map = function () {
    // return pre-made function-list - from the root state
    return core(this).states[1].map;
  };

  // add method to 
  core.api.query = function (state) {
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
  core.api.lock = function (set) {
    // init vars
    var pkg = core(this), // alias self
      result = false; // call status
    // if arguments were passed...
    if (arguments.length) {
      // if allowed to change the lock status...
      if (pkg.trusted) {
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
  core.api.vars = function (name, value) {
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
  core.api.args = function (idx, value) {
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
        pkg.args = idx.concat();
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
  core.api.target = function (qry) {
    // init vars
    var pkg = core(this), // alias this package
      tgtState = pkg.vetIndexOf(qry), // resolve a state index from qry
      result = false; // call status indicator
    // if the destination state is valid, and the flow can move (ignoring check for current targets)...
    if (~tgtState && pkg.canMove(1)) {
      // capture arguments after the tgt
      pkg.args = [].slice.call(arguments).slice(1);
      // reset targets array
      pkg.targets = [tgtState];
      // tell flow to move
      pkg.move();
      // if the last phase is on and we're not paused...
      if (!pkg.phase && !pkg.paused) {
        // set result to true or the last function's return value, based on whether that value is `undefined` (as in, no value was returned)
        result  = pkg.result === undefined ? true : pkg.result;
      }
    }
    // otherwise, flag inability to target the state
    return result;
  };

  /**
  Target, add, or insert states to traverse, or resume towards the last target state.
  Returns false when there is no new destination, a waypoint was invalid, or the flow was locked or pending.

  Forms:
    go() - resume traversal
    go(waypoints) - add or insert waypoints
  **/
  core.api.go = function () {
    // init vars
    var pkg = core(this), // alias self
      tgts = pkg.targets, // alias array of current state targtes
      waypoints = [], // collection of targets to add to targets
      wpLn, // placeholder for the number of waypoints added
      result = false; // success status for this call
    // if...
    if (
      // can move (ignoring check for current targets)
      pkg.canMove(1)
      // and
      &&
      // any and all state references are valid
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
						// insert waypoints after first target
						tgts = [].concat(tgts[0], waypoints, tgts.slice(1));
					}
				} else { // otherwise, when there are targets...
					// set route to waypoints
					tgts = waypoints;
				}
				// capture array of targets
				pkg.targets = tgts;
      }
      // capture result of move attempt
      result = !!pkg.move();
    }
    // return result
    return result;
  };

  // delay traversing
  core.api.wait = function () {
    // init vars
    var pkg = core(this), // get package
      args = arguments, // alias arguments
      argLn = args.length, // capture number of arguments passed
      noAction = argLn < 2, // flag when no action will be taken after a delay
      delayFnc = noAction ? 0 : args[0], // capture first argument as action to take after the delay, when more than one argument is passed
      isFnc = typeof delayFnc === 'function', // flag when the delay is a function
      delayStateIdx = pkg.indexOf(delayFnc), // get state referenced by delayFnc (the first argument) - no vet check, since this would be a priviledged call
      time = parseInt(args[argLn - 1]), // use last argument as time parameter
      result = false; // indicates result of call
    // if the flow can move, and the argument's are valid...
    if (pkg.canMove() && (!argLn || (time > -1 && (noAction || ~delayStateIdx || isFnc)))) {
      // stop the tank
      pkg.flow.stop();
      // clear existing delay timer
      window.clearTimeout(pkg.delay.timer);
      // set delay to truthy value, callback, or traversal call
      pkg.delay.timer = argLn ?
        window.setTimeout(
          function () {
            // trust the next call
            pkg.trusted = 1;
            // if there is a delay action and it's a state...
            if (!noAction && ~delayStateIdx) {
              // use the proxy's package method, to target the given state
              pkg.proxy.pkgs.core.target(delayStateIdx);
            } else { // otherwise, when there is no delay, or the action is a callback...
              // if there is a callback function...
              if (isFnc) {
                // set delay callback (fires during the "begin" event)
                pkg.delay.callback = delayFnc;
              }
              // traverse towards the current target
              pkg.move();
            }
          },
          time // number of milliseconds to wait
        ) :
        1; // set to 1 to pause indefinitely
      // indicate that this flow has been delayed
      result = true;
    }
    // return whether this function caused a delay
    return result;
  };

  // capture aspects of this package
  core.api.status = function  () {
    // init vars
    var proxy = this, // this flow proxy
      status = {}; // the status object to return
    // with each package...
    Flow.pkg().forEach(function (pkgName) {
      // init vars
      var pkgDef = Flow.pkg(pkgName), // the package-definition
        stats, key; // placeholder and loop vars for scanning the status object returned
      // if this package-definition has a status function...
      if (pkgDef.hasOwnProperty('status') && typeof pkgDef.status === 'function') {
        // capture the status object returned
        stats = pkgDef.status.call(pkgDef(proxy));
        // with each key in the status object...
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
  core.status = function () {
    // init vars
    var pkg = this, // the package instance
      current = pkg.states[pkg.flow.currentIndex], // alias the current state
      tgtsLn = pkg.targets.length, // capture the number of targets
      getLocationFromIndex = function (idx) {
        return pkg.states[idx].location;
      };
    // return all the objects to be displayed when in the status object
    return { // object of status keys to return
      trusted: !!pkg.trusted,
      loops: Math.max((pkg.calls.join().match(new RegExp('\\b' + current.index + '.' + pkg.phase, 'g')) || []).length - 1, 0),
      depth: current.depth,
      paused: !!pkg.paused,
      pending: !!pkg.childFlows,
      pendable: !!current.pendable,
      targets: pkg.targets.map(getLocationFromIndex),
      route: tgtsLn ? pkg.route.map(getLocationFromIndex) : [],
      location: current.location,
      index: current.index,
      phase: tgtsLn ? core.events[pkg.phase] : '',
      state: current.name
    };
  };

}(this, Object, Array, Math, Flow);