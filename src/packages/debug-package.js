/*!
 * Flow Package: Debug v0.1 / Bemi Faison (c) 2011 / MIT
 *
 * Reruires the Flow platform and depends on the Core package
 * http://github.com/bemson/Flow/tree/nextgen
 */
!function (Flow, window, undefined) {
  // if Flow does not exist...
  if (!Flow) {
    // throw simple error
    throw "Flow platform required"
  }
  // if this package already exists...
  if (getPkg('debug')) {
    // skip re-initializing this package
    return;
  }
  var
    // if available, cache reference to core pkg
    corePkg = getPkg('core'),
    // define and alias this, the debug package
    debugPkg = Flow.pkg('debug'),
    // human readable traversal types
    traverseMoveStrings = 'on to|in|out|over|backwards-over'.split('|'),
    // number of flows created
    flowCnt = 0,
    // collection of flows to track
    trackedFlows = [],
    // flow to track that of other flows in a separate window
    monitorFlow = new Flow({
      _vars: [
        {
          //
          supported: typeof window.open === 'function'
        },
        'doc',
        'body',
        'dom',
        'gui'
      ],
      _in: function () {
        // if there is no window open method object...
        if (!this.data('supported')) {
          // exit this flow - or do some error/debug stuff
          this.target(0);
        }
        /*
        var vars = {
          win = this.args(0),
          doc, body, dom, gui;
        if (win) {
          this.vars('win')
        } else {
          this.target(0);
        }*/
      },
      _on: function () {
        // append dom to body
      },
      init: {
        _over: function () {
          this.go('@self');
        },
        _on: function () {
          
        }
      },
      popup: {
        _in: function() {
          
        },
        _on: function () {
          
        },
        update: function () {
        }
      }
    });

  // return the given package if it exists (otherwise 0)
  function getPkg(pkgName) {
    return ~Flow.pkg().indexOf(pkgName) && Flow.pkg(pkgName);
  }

  // Flow to manage monitoring of Flows
  debugPkg.monitor = function () {
    // if there is no core package installed...
    if (!getPkg('core')) {
      throw new Error('The debug monitor requires the core package.');
    }
    monitorFlow.target('//popup', window.open('','flow_package_debug_view','height=200,width=300,menubar=no,toolbar=no,location=no'));
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
    pkg.events = [];
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
      core = corePkg || (corePkg = getPkg('core')), // get core package (if available)
      delay = ~~debugPkg.slow;
    // log this event
    this.log.apply(this, arguments);
    // if slowing traversals, a core version exists, and this flow is not paused or pending...
    if (core && delay && (coreInst = core(proxy)) && !coreInst.paused && !coreInst.pending) {
      // delay this flow for the given number of abs milliseconds
      proxy.pkgs.core.wait(delay);
    }
  };

  // hook into the core status call, when available
  debugPkg.addStatus = function () {
    var coreInst = (corePkg || (corePkg = getPkg('core')))(this.proxy);
    // return object to append properties
  	return {
  		coreCalls: [].concat(coreInst.calls),
  		coreRoute: [].concat(coreInst.route),
  		coreTargets: [].concat(coreInst.targets),
  		coreArguments: [].concat(corePkg.args)
  	};
  };
}((typeof require !== 'undefined' ? require('Flow') : this).Flow, this);