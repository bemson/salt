/*
Flow Package: debug
*/
!function (window, Object, Array, Math, Flow, undefined) {
  // if the debug package is not present...
  if (Flow.pkg().indexOf('debug')) {
    // init vars
    var debug = Flow.pkg('debug'), // define debug package
      trackedFlows = []; // collection of flows to track

    debug.monitor = function () {
      // init vars
      var win = window.open('','flow_package_debug_view','height=200,width=300,menubar=no,toolbar=no,location=no'),
      // if there is no window or it's closed...
      if (!debug.view || debug.view.closed) {
        // create the window view
        debug.view = window.open('','flow_package_debug_view','height=200,width=300,menubar=no,toolbar=no,location=no');
      }
    };

    debug.slow = 1;

    // initialize the package instance with custom properties
    // only argument is the object passed after the program when calling "new Flow(program, extraArg)"
    debug.init = function (cfg) {
      // init vars
      var pkg = this; // alias self
      // set this flow's name based on the cfg or internal id
      pkg.id = pkg.flow.id;
      // set name based on cfg.name in config
      pkg.name = cfg.name || 'Flow #' + pkg.id;
      // initialize each state
      pkg.states.forEach(function (state, idx) {
        // init vars
        var parent = idx && pkg.states[state.parentIndex]; // capture parent when available
      });
    };

    debug.onTraverse = function (moveInt) {
     var pkg = this,
      motion = 'onto|in|out|over|backwards-over'.split('|')[moveInt];
  //   console.log('\t->', motion, Flow.pkg('core')(this.proxy).flow.id,'at', this.states[this.flow.currentIndex].name, ' (' + this.states[this.flow.currentIndex].location + ')', status, 'args',status.Dargs);
      // if slowing and the core pkg is present...
      if (debug.slow) {
        pkg.flow.stop();
      }
    };

    // define prototype of any package instances
    debug.prototype = {};

    // hook into the core status call, when available
    debug.coreStatus = function () {
    	var core = Flow.pkg('core')(this.proxy);
    	return {
    		Dinst: inst,
    		Dcalls: [].concat(core.calls),
    		Droute: [].concat(core.route),
    		Dtgts: [].concat(core.targets),
    		Dargs: [].concat(core.args)
    	};
    };

    debug.onTraverse = function (moveInt) {
  		var core = Flow.pkg('core')(this.proxy);
  		core.trust = 1;
  		this.proxy.pkgs.core.wait(speed);
  		core.trust = 0;
    	}
    };
  }
  // tell debug package to launch it's staic viewer
  Flow.pkg('debug').monitor();
}(this, Object, Array, Math, Flow);