/*
Flow Package: core
*/
!function (window, Object, Math, Flow, undefined) {

  // init vars
  var core = Flow.pkg('core'), // define core package
    typeOf = function (obj) { // custom typeOf function
      // init vars
      var type = typeof obj; // get native type string
      // return string, check for array when an object
      return type === 'object' && Object.prototype.toString.call(obj) === '[object Array]' ? 'array' : type;
    },
    traversalNames = '_on|_in|_out|_over|_bover'.split('|'); // get traversal fnc names

  // initialize the package instance with custom properties
  core.init = function () {
    // init vars
    var pkg = this; // alias self
    // add arguments
    pkg.args = [];
    // init locked flag
    pkg.locked = 0;
    // init index of state paths
    pkg.stateIds = {};
    // init child-parent flow trackers
    pkg.childFlows = [];
    pkg.parentFlows = [];
    pkg.states.forEach(function (state, idx) {
      // index this path with this index position
      pkg.stateIds[state.location] = idx;
      // define array to hold traversal functions
      state.fncs = [];
      // define map function - curried call to target method
      state.map = function () {
        pkg.proxy.pkgs.core.target(idx, arguments);
      };
      // if this state's index is not 0...
      if (state.index) {
        // append to parent's map function
        pkg.states[state.parentIndex].map[state.name] = state.map;
      }
      // set custom toString for passing proxy reference
      state.map.toString = function () {
        // return this state's location
        return state.location;
      };
      // with each traversal name...
      traversalNames.forEach(function (name, idx) {
        //  set traversal function to 0 or the corresponding data key (when a function)
        state.fncs[idx] = typeof state.data[name] === 'function' ? state.data[name] : 0;
      });
      // if there is no _on[0] function and this state's value is a function...
      if (!state.fncs[0] && typeof state.value === 'function') {
        // use as the _on[0] traversal function
        state.fncs[0] = state.value;
      }
    });
    // set map to root map
    pkg.map = pkg.states[1].map;
  };

  // add static variables - could be private - doesn't matter
  core.activeFlows = [];

  // customize data parsing
  core.dataKey = /^_/; // pattern for identifying data keys
  core.invalidKey = /^toString$|^[\d@\[]|\/|\|/; // pattern for identifying invalid keys

  // hook into events
  core.onStart = function () {
    console.log('starting loop towards ', this.flow.targetIndex);
  };
  core.onStop = function () {
    console.log('stopping loop at ', this.flow.currentIndex);
  };
  core.onFinish = function () {
    console.log('finishing loop', this.flow.currentIndex);
  };

  // executes when a state is traversed - scope is the package instance
  core.onTraverse = function (moveInt) {
    // init vars
    var pkg = this, // the package instance
      state = pkg.states[pkg.flow.currentIndex], // the state being traversed (prototyped, read-only value)
      data = state.data; // data from the current state (shared amongst all package instances)
    // toggle internal flag (trust all calls)
    pkg.internal = 1;
    // if there is a function for this motion...
    if (state.fncs[moveInt]) {
      // execute function, in scope of the proxy - pass arguments when traversing _on[0]
      pkg.rtrn = states.fncs[moveInt].apply(pkg.proxy, moveInt ? [] : pkg.args);
    }
    // toggle internal flag (don't trust all calls)
    pkg.internal = 0;
  };

  // define prototype of any package instances
  core.prototype = {
    
  };

  // add method to return map of this flow's states
  core.api.map = function () {
    // return map function
    return core(this).map;
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
    // return map function
    return core(this).map;
  };

  // add method to manage variables
  core.api.vars = function (a1, a2) {
    // init vars
		var pkg = core(this), // get package
			args = arguments, // alias arguments
			v = typeof a1 === 'string' && sys.rxp.oneAlpha.test(a1) && flow.resolveVar(a1),
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
			M = Math, // reduce lookups
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
}(this, Object, Math, Flow);