/*
Flow Package: core
*/
!function (Flow) {

  // init vars
  var core = Flow.pkg('core'); // define core package

  // initialize the package instance with custom properties
  core.init = function () {
    // alias this package
    var pkg = this;
    // add arguments
    pkg.arguments = [];
    // init locked flag
    pkg.locked = 0;
    // init index of state paths
    pkg.stateIds = {};
    // init child-parent flow trackers
    pkg.childFlows = [];
    pkg.parentFlows = [];
    // with each sandboxed-state...
    pkg.states.forEach(function (state, idx) {
      // index this path with this index position
      pkg.stateIds[state.location] = idx;
    });
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
        if (data._in) data._in.apply(pkg.proxy, pkg.arguments);
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
}(Flow);