/*
Flow Package: core

  /*

var flow = new Flow({
  _in: function () {
    this.go();
    this.pkgs.core.go();
  }
});

flow.go();
flow.pkgs.core.go();

core.methods.go = function () {
  var pkg = core(this); // returns the package instance, which has the tank api
  // pkg.flow is another proxy
  pkg.flow.go(idx); // tell flow to go here
  pkg.flow.stop(); // tell flow to stop going anywhere
  pkg.flow.states; // array of states
  pkg.flow.state; // the current state
};

// flow 
flow.go = function (index) {
  return moveFlow(this, index);
}

flow.stop = function () {
  return stopFlow(this);
}


*/
!function (Flow) {

  // init vars
  var core = Flow.pkg('core'); // define core package - returns package instance
  /*
    private vars of package instance:
    _chain - the constructor within the package prototype chain - changing this won't hurt
    _name - the name of this package - changing this would be bad...
  */
  // init arguments array
  core.arguments = [];
  // init locked flag
  core.locked = 0;

  // customize data parsing
  core.dataKey = /^_/; // pattern for identifying data keys
  core.invalidKey = /^toString$|^[\d@\[]|\/|\|/; // pattern for identifying invalid keys

  // executes duringadd custom properties to each state - scope is the window
  core.initState = function (state) {
    
  };
  // executes when a Flow is defined - scope is the package proxy
  core.initFlow = function () {
    var pkg = this,
      flow = pkg._Flow; // flow api is dead until initialization is complete
  };
  // customized what's returned when instantiating a Flow - called in scope of proxy for this package
  core.overrideReturn = function () { // passes any additional parameters given to the public Flow function
    // scope is the package proxy
    return this.map();
  };
  // executes before Flow begins traversing - scope is the package proxy
  core.onStart = function () {
    
  };
  // executes when Flow has stopped traversing - scope is the package proxy
  core.onStop = function () {
    
  };
  // executes when Flow has reached it's traversal target - scope is the package proxy
  core.onEnd = function () {
    
  };
  // executes when a state is traversed - scope is the package proxy
  core.onTraverse = function (state, moveInt) {
    // init vars
    var pkg = this, // the package proxy
      state = pkg._Flow.state.data,
      args = pkg.arguments;
    switch (moveInt) {
      case 0 :// in
        pkg.executeProgramCall(data._in);
      break;
      case 1: // on
        pkg.executeProgramCall(data._on, args);
      break;
      case 2: // out
        pkg.executeProgramCall(data._out);
      break;
      case 3: // over
        pkg.executeProgramCall(data._over);
      break;
      case 4: // bover
        pkg.executeProgramCall(data._bover);
      break;
    }
  };
  core.methods.go = function () {
    var pkg = this;
    pkg._proxy();
  };
}(Flow);