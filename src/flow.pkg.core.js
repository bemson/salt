/*
Flow Package: core
*/
!function (window, Object, Flow, undefined) {

  // init vars
  var core = Flow.pkg('core'), // define core package
    typeOf = function (obj) { // custom typeOf function
      // init vars
      var type = typeof obj; // get native type string
      // return string, check for array when an object
      return type === 'object' && Object.prototype.toString.call(obj) === '[object Array]' ? 'array' : type;
    };

  // initialize the package instance with custom properties
  core.init = function () {
    // alias this package
    var pkg = this;
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
    // based on the traversal direction
    switch (moveInt) {
      case 0 :// on
        if (data._on) data._on.apply(pkg.proxy);
      break;
      case 1: // in
        if (data._in) data._in.apply(pkg.proxy, pkg.args);
      break;
      case 2: // out
        if (data._out) data._out.apply(pkg.proxy);
      break;
      case 3: // over
        if (data._over) data._over.apply(pkg.proxy);
      break;
      case 4: // bover
        if (data._bover) data._bover.apply(pkg.proxy);
      break;
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
}(this, Object, Flow);