/*!
 * Flow Package: Debug v0.1 / Bemi Faison (c) 2011 / MIT
 *
 * Reruires the Flow platform and depends on the Core package
 * http://github.com/bemson/Flow/tree/nextgen
 */
!function (window, Flow, Object, Array, Math, undefined) {
  // init vars
  var pkgs = Flow.pkg(), // get array of installed package names
    corePkg = ~pkgs.indexOf('core') && Flow.pkg('core'), // if inited, alias the core package
    debugPkg = !~pkgs.indexOf('debug') && Flow.pkg('debug'), // if not inited, define and alias a debug package
    traverseMoveStrings = 'on to|in|out|over|backwards-over'.split('|'), // human readable traversal types
    monitorFlow, // the flow that will track flow traversal events
    flowCnt = 0;
  // if a debug package was just defined...
  if (debugPkg) {
    var trackedFlows = []; // collection of flows to track

    // Flow to manage monitoring of Flows
    debugPkg.monitor = function () {
      var errMsg = 'debug.monitor() requires the "core" Flow package.';
      // if the core package exists...
      if (corePkg) {
        // if the monitorFlow has not been initialized...
        if (!monitorFlow) {
          // create the monitorFlow
          monitorFlow = new Flow({
            _in: function () {
              // init vars
              var win = window.open('','flow_package_debug_view','height=200,width=300,menubar=no,toolbar=no,location=no'),
              // if there is no window or it's closed...
              if (!debugPkg.view || debug.view.closed) {
                // create the window view
                debugPkg.view = window.open('','flow_package_debug_view','height=200,width=300,menubar=no,toolbar=no,location=no');
              }
              // open window
              // init gui
            },
            _on: function () {
              // poll flows every 300 milliseconds?
              // update when flows traverse
            },
            _out: function () {
              // reset trackedFlows (if configured to do so)
              // close window
            }
          });
        }
        // invoke the monitorFlow's root action
        monitorFlow.pkgs.core.target(1);
      } else if (window.console) { // otherwise, if the console exists...
        // show an alert or log msg
        (console.warn || console.log)(errMsg);
      } else {
        alert(errMsg);
      }
    };

    // an integer representing the number of milliseconds to delay all unpaused traversals
    debugPkg.slow = 0;

    // initialize the package instance with custom properties
    // only argument is the object passed after the program when calling "new Flow(program, extraArg)"
    debugPkg.init = function (cfg) {
      // init vars
      var pkg = this; // alias self
      // set this flow's name based on the cfg or internal id
      pkg.id = pkg.tank.id;
      // set name based on cfg.name in config or the count of this flow
      pkg.name = cfg.name || 'Flow #' + ++flowCnt;
      // events that have occurred to this flow
      pkg.eventLog = [];
    };

    debugPkg.prototype.log = function (evtName, data) {
      // capture this event to the eventLog
      this.eventLog.push({
        date: new Date(),
        name: evtName,
        data: data
      });
      // if initialized...
      if (flowMonitor) {
        // update flow monitor
      }
    };

    // simply log begin and end events
    debugPkg.onBegin = debugPkg.onEnd = debugPkg.prototype.log;
    // enable slowing down during traversals
    debugPkg.onTraverse = function (evtName, data) {
      var proxy = this.proxy, // alias public proxy of this flow
        coreInst, // core version of this flow (calculated later)
        delay = ~~debugPkg.slow;
      // log this event
      this.log.apply(this, arguments);
      // if slowing traversals, a core version exists, and this flow is not paused or pending...
      if (delay && corePkg && (coreInst = corePkg(proxy)) && !coreInst.paused && !coreInst.pending) {
        // delay this flow for the given number of abs milliseconds
        proxy.pkgs.core.wait(delay);
      }
    };

    // hook into the core status call, when available
    debugPkg.addStatus = function () {
      var coreInst = corePkg(this.proxy);
      // return object to append properties
    	return {
    		coreCalls: [].concat(coreInst.calls),
    		coreRoute: [].concat(coreInst.route),
    		coreTargets: [].concat(coreInst.targets),
    		coreArguments: [].concat(corePkg.args)
    	};
    };
  }
}(this, Flow, Object, Array, Math);