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
    rxps = [ // collection of regular expressions
      /\w/ // 0 - one alpha numeric character
    ],
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
    activeFlows = [], // collection of active flows
    Variable = function (flow, key) {
      var v = this;
      v.flow = flow;
      v.key = key;
      v.values = [undefined]; // initial value is undefined
      // add self to flow's vars
      flow.vars[key] = v;
    };
	Variable.prototype = {
		descope: function () {
			var v = this;
			// remove scope from values
			v.values.shift();
			// if no more scope levels exist, remove self-reference from flow
			if (!v.values.length) delete v.flow.vars[v.key];
			// flag that this instance was descoped
			return 1;
		},
		scope: function () {
			var v = this;
			// copy current value as the new value (first value)
			v.values.unshift(v.values[0]);
			// flag that this instance was scoped
			return 1;
		}
	};

  // define traversal event names
  core.events = 'main|in|out|over'.split('|');

  // customize data parsing
  core.dataKey = /^_/; // pattern for identifying data keys
  core.invalidKey = /^toString$|^[@\[]|[\/\|]/; // pattern for identifying invalid keys

  // initialize the package instance with custom properties
  core.init = function () {
    // init vars
    var pkg = this; // alias self
    // add arguments
    pkg.args = [];
    // collection of variables
    pkg.vars = {};
    // init locked flag
    pkg.locked = 0;
    // init index of state paths
    pkg.stateIds = {};
    // init child-parent flow trackers
    pkg.childFlows = [];
    pkg.parentFlows = [];
    // collection of targets
    pkg.targets = [];
    // initialize each state
    pkg.states.forEach(function (state, idx) {
      // init vars
      var parent = idx && pkg.states[state.parentIndex]; // capture parent when available
      // index this path with this index position
      pkg.stateIds[state.location] = idx;
      // define array to hold traversal functions
      state.fncs = [];
      // set pendable flag
      state.pendable = parent ? parent.pendable : 0;
      // set isRoot flag, based on index or "_root" component
      state.isRoot = idx < 2 ? 1 : !!state.data._root;
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

  // hook into events
  core.onStart = function () {
    // init vars
    var pkg = this; // alias this package
    // activate this flow
    //pkg.activate();
  };
  core.onStop = function () {
    // init vars
    var pkg = this; // alias this package
    // remove self from active flows
    //activeFlows.unshift();
  };
  core.onFinish = function () {
    /*
    // init vars
    var pkg = this, // alias self
      tgts = pkg.targets; // alias targets
    // remove the last target...
    tgts.pop();
    // if there are more targets...
    if (tgts.length) {
      // go to the next target
      pkg.flow.go(tgts[tgts.length - 1]);
    } else { // otherwise, when there are no more targets...
      // clear cache?
      // clear history?
      // remove from activeFlows
      activeFlows.pop();
      // inform parent flows
    }*/
  };

  // executes when a state is traversed - scope is the package instance
  core.onTraverse = function (moveInt) {
    // init vars
    var pkg = this, // the package instance
      state = pkg.states[pkg.flow.currentIndex]; // the state being traversed (prototyped, read-only value)
    // toggle internal flag (trust all calls)
    pkg.trust = 1;
    // if there is an out state...
    if (pkg.outState) {
      console.log('de-scoping', pkg.outState.name, '\n\tvCfgs:', pkg.outState.vars);
      // descope variables in the outstate
      pkg.scopeVars(pkg.outState, 1); 
      // clear the outstate
      pkg.outState = 0;
    }
    // based on the motion...
    switch (moveInt) {
      case 1: // in
        console.log('scoping', state.name, '\n\tvCfgs:', state.vars);
        // scope variables for this state
        pkg.scopeVars(state);
      break;

      case 2: // out
        // set the outState to the current state
        pkg.outState = state;
      break;
    }
    // if there is a function for this motion...
    if (state.fncs[moveInt]) {
      // execute function, in scope of the proxy - pass arguments when traversing _on[0]
      pkg.rtrn = state.fncs[moveInt].apply(pkg.proxy, moveInt ? [] : pkg.args);
    }
    // toggle internal flag (don't trust all calls)
    pkg.trust = 0;
  };

  // define prototype of any package instances
  core.prototype = {
    activate: function () {
      // if there is an active flow...
      if (activeFlows.length) {
        // add this flow as a child of the active flow
        activeFlows[0].childFlows.push(pkg);
        // add the active flow as a parent of this flow
        pkg.parentFlows.push(pkg);
      }
      // add self to activeFlows
      activeFlows.shift(pkg);
    },
    deactivate: function () {
    },
    // add a variable-tracking-object to this package
    getVar: function (name) {
      // init vars
      var pkg = this; // alias self
      // return an existing or new variable tracking object
      return (pkg.vars.hasOwnProperty(name)) ? pkg.vars[name] : (pkg.vars[name] = {
        name: name,
        values: []
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
    }
  };

  // add method to return map of this flow's states
  core.api.map = function () {
    // return pre-made function-list - from the root state
    return core(this).states[1].map;
  };

  // add method to 
  core.api.query = function () {
    // init vars
  	var pkg = core(this), // get package instance
  		args = arguments, // alias arguments
  		i = 0, node, // loop vars
  		nodes = []; //
  	for (; node = pkg.findNode(args[i]); i++) {
  		nodes.push(node.id);
  	}
  	// return the node id or false
  	return (nodes.length && nodes.length === args.length) ? (nodes.length > 1 ? nodes : nodes[0]) : !1;
  };

  // add method to lock and unlock
  core.api.lock = function () {
  };

  // add method to manage variables
  core.api.vars = function (a1, a2) {
    // init vars
		var pkg = core(this), // get package
			args = arguments, // alias arguments
			v = typeof a1 === 'string' && /\w/.test(a1) && flow.resolveVar(a1),
			i, rtn = !1; // 
		switch (args.length) {
			case 0: // get names of all vars
				rtn = [];
				for (i in flow.vars) {
					if (flow.vars.hasOwnProperty(i)) rtn.push(i);
				}
			break;

			case 1: // get the value of this var
				if (v) rtn = v.values[0];
			break;

			default:
				// if the var is valid...
				if (v) {
					// set the current value
					v.values[0] = a2;
					rtn = !0;
				}
			break;
		}
		// return result
		return rtn;
  };

  // add method to access and edit arguments
  core.api.args = function (a1, a2) {
    // init vars
    var pkg = core(this), // retrieve package-sandbox for this proxy
      args = [].slice.call(arguments), // capture arguments as an array
      a1Ok = a1 > -1 && Math.ceil(a1) === a1; // flag when the first argument is a valid number
    // based on the number of arguments...
    switch (args.length) {
      // with zero arguments...
      case 0 :
        // return copy of arguments
        return pkg.args.concat();
      break;

      // with one argument...
      case 1:
        // based on the type of the first argument...
        switch (typeOf(a1)) {
          // when the first argument is an array...
          case 'array':
            // replace package arguments
            pkg.args = a1.concat();
            // flag success
            return true;
          break;

          // if the first argument is a number...
          case 'number':
            // if the number is valid...
            if (a1Ok) {
              // return the argument at the given index
              return pkg.args[a1];
            }
          break;
        }
      break;

      // with more than one argument...
      default:
        // if the index is valid...
        if (a1Ok) {
          // and, if the value is undefined for the last item...
          if (a2 === undefined && a1 === pkg.args.length - 1) {
            // remove last item
            pkg.args.splice(-1, 1);
          } else { // otherwise, when not a "delete" flag...
            // set value at the given index
            pkg.args[a1] = a2;
          }
          // flag success with removing or setting the value
          return !0;
        }
      break;
    }
    // (ultimately) return false
    return !1;
  };

  // add method to program api
  core.api.target = function (idx) {
    /*
      Scope ("this") is the public Flow proxy.
      The sandboxed package-instance is retrieved by passing the proxy to the package definition function.
    */
    // init vars
    var pkg = core(this); // get the package instance related to this flow proxy
                          // could also be done as:
                          // > var pkg = Flow.pkg('core')(this);
    // if the target index is valid...
    if (idx < pkg.states.length) {
      // capture arguments after idx
      pkg.arguments = [].slice.call(arguments).slice(1);
      // pkg.flow provides control and access to the true flow instance
      pkg.flow.go(idx); // tell flow to go here
    }
  };

  // add method to resume
  core.api.go = function () {
  };

  // delay traversing
  core.api.wait = function () {
    // init vars
		var pkg = core(this), // get package instance
			args = arguments, // alias arguments
			cur = pkg.states[pkg.flow.currentIndex], // 
			cache = pkg.cache.proxy, // 
			argLn = args.length, // 
			fnc = argLn > 1 ? args[0] : 0, // 
			node, // stub to test when fnc is a node reference
			fncOk = !fnc || typeof fnc === 'function' || ((node = pkg.flow.findNode(fnc)) && cur.allowTgt(node)), // 
			time = Math.ceil(Math.abs(args[argLn - 1])), // 
			timeOk = !isNaN(time), // 
			rtn = 1; // 
		// if there are targets or staged waypoints to reach, and the argument's are valid (node is not false)...
		if ((flow.targets.length || flow.stage.waypoints.length) && (!argLn || (timeOk && fncOk && node !== !1))) {
			// if reset traversal cache
			if (cache.status) {
			  // 
				delete cache.status.traversal;
			}
			// clear existing delay
			flow.clearDelay();
			// if fnc was a node, make a function that targets it, as the callback
			if (node) {
			  // define callback function
			  fnc = function () {
			    // 
			    flow.target(node);
			  };
		  }
			// set delay to truthy value or delayed traverse call
			pkg.delay.active = argLn ? window.setTimeout(function () {
					// set callback next callback
					pkg.delay.callback = fnc;
					// clear delay
					pkg.delay.active = 0;
					// attempt traversal - invokes callback
					pkg.traverse();
				}, time) : 1;
			// flag that the flow will be (or has been) delayed
			rtn = 0;
		}
		// return boolean flag of success or failure
		return !rtn;
  };
}(this, Object, Array, Math, Flow);