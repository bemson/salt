/*!
 * Flow (NextGen) v0.X
 * http://github.com/bemson/Flow/tree/nextGen
 *
 * Dependencies:
 * genData v1.1 / Bemi Faison (c) 2011 / MIT (http://github.com/bemson/genData)
 *
 * Copyright 2011, Bemi Faison
 * Released under the MIT License
 */
!function (window, Array, genData, undefined) {
  // init vars
  var flowCnt = 0, // the number of Flow instances created
    sig = {}, // private signature object for priviledged access
    pkgDefs = [], // collection of package-definitions
    pkgsIdx = {}, // name index of package-definitions
    pkgsFlagKey = function (hdlrKey, name, value) { // tests a string against each package's handler
      // return true when there is a name, pkgs, and each pkg's handler passes
      return name.length && pkgDefs.some(function (pkgDef) {
        // init vars
        var hdlr = pkgDef.pkg[hdlrKey]; // get dataKey handler - returns/evaluates true when the name is invalid
        // based on the type...
        switch (typeof hdlr) {
          case 'function' :
            // exit loop if this function confirms that this pair pass
            return hdlr(name, value);
          case 'object' :
            // if the object is a regular expression...
            if (hdlr instanceof RegExp) {
              // return result of testing it against the name
              return hdlr.test(name);
            }
        }
        // return false by default (i.e., no handler)
        return false;
      });
    },
    genStates = new genData( // spawn state generator
      function (name, value, parent, dataset, flags) {
        // init vars
        var state = this, // alias state
          isInvalid = pkgsFlagKey('invalidKey', name, value), // cache whether this state is invalid
          isData = pkgsFlagKey('dataKey', name, value); // cache whether this state is data
        // if this key is invalid or flagged as data...
        if (isInvalid || isData) {
          // exclude from dataset and don't scan
          flags.omit = 1;
          // don't scan this value
          flags.scan = 0;
          // if valid data, capture in parent data
          if (isData && !isInvalid) parent.data[name] = value;
        } else { // otherwise, when this key is not invalid or data...
          // set default property values to undefined (presence reduces prototype property lookups)
          state.inContext = state.parentIndex = state.previousIndex = state.nextIndex = state.firstChildIndex = undefined;
          // capture index of this item once added
          state.index = dataset.length + 1;
          // capture depth
          state.depth = parent ? parent.depth + 1 : 1; // start depth at 1, since _flow state will be prepended later
          // set name
          state.name = parent ? name : '_root';
          // init data property - holds any attributes of this state
          state.data = {};
          // start or extend parent location
          state.location = parent ? parent.location + name + '/' : '//';
          // init child collection
          state.children = [];
          // if there is a parent state...
          if (parent) {
            // set parent index
            state.parentIndex = parent.index;
            // if there are no children, set first child index
            if (!parent.children.length) parent.firstChildIndex = state.index;
            // capture the index of this state in the parent's child collection
            state.childIndex = parent.children.push(state.index) - 1;
            // set this state as the last child of the parent
            parent.lastChildIndex = state.index;
            // if not the first child...
            if (state.childIndex) {
              // reference index of previous state
              state.previousIndex = parent.children[state.childIndex - 1];
              // reference index of this state in the previous state
              dataset[state.previousIndex - 1].nextIndex = state.index;
            }
          }
        }
      }
    ),
    genPkgStates = new genData( // spawn package-state generator (clones genState output)
      function (name, value, parent, dataset, flags) {
        // init vars
        var state = this,
          mbr;
        // if this is the array container...
        if (!parent) {
          // exclude from the dataset
          flags.omit = 1;
        } else { // otherwise, when a state object...
          // don't scan further
          flags.scan = 0;
          // with each state property available...
          for (mbr in value) {
            // if not inherited and not inContext (since it can't be maintained)...
            if (value.hasOwnProperty(mbr) && mbr !== 'inContext') {
              // add to self
              state[mbr] = value[mbr];
            }
          }
        }
      }
    ),
    arrayPrototype = Array.prototype; // alias for minification purposes
  /**
    Shims for missing native object methods (on crap browsers).
    WARNING: These methods are not robust and do no validation! They merely support the needs of this library.
    Shim these methods yourself before loading this script, if you want something equivalent to https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/
    Ofcourse, we're targeting IE here. I didn't want to include this, but - then again - no one wants to work with IE... We just have to.
  */
  if (!arrayPrototype.some) {
    arrayPrototype.some = function(fnc, scope) {
      for (var i = 0, j = this.length; i < j; i++) {
        if (fnc.call(scope, this[i], i, this)) {
          return true;
        }
      }
      return false;
    };
  }
  if (!arrayPrototype.filter) {
    arrayPrototype.filter = function(fnc, scope) {
      var results = [],
        i = 0,
        j = this.length,
        value;
      for (; i < j; i++) {
        value = this[i];
        if (fnc.call(scope, value, i, this)) {
          results.push(value);
        }
      }
      return results;
    };
  }
  if (!arrayPrototype.forEach) {
    arrayPrototype.forEach = function(fnc, scope) {
      for (var i = 0, j = this.length; i < j; i++) {
        fnc.call(scope, this[i], i, this);
      }
    };
  }
  if (!arrayPrototype.map) {
    arrayPrototype.map = function(fnc, scope) {
      var i = 0,
        j = this.length,
        results = new Array(j);
      for (; i < j; i++) {
        results[i] = fnc.call(scope, this[i], i, this);
      }
      return results;
    };
  }

  // define prototype base for FlowAPI instances
  function ProxyModel() {}
  // make sure it's constructor points to the public Flow(API) function (for those who care)
  ProxyModel.prototype.constructor = FlowAPI;
  // define prototype base for Package instances
  function pkgModel() {};
  // define base methods
  pkgModel.prototype.inState = function (idx) {
    // if the index is valid and we're on it...
    if (idx < this.states.length) {
      return true;
    }
    return false;
  };

  // create
  function definePackage(name) {
    // package returns the private instance of it's public proxy
    function pkg(pxy) {
      // init vars
      var flow = pxy && pxy.toString(sig); // pass secret to pxy's toString
      // return the package instance with this name
      return typeof flow === 'object' && (flow.pkgs.filter(function (pkgInst) {
        return pkgInst.name === name
      })[0] || {}).pkg || false
    }
    pkg.prototype = new pkgModel();
    // set default static properties
    pkg.init = pkg.dataKey = pkg.invalidKey = pkg.onBegin = pkg.onEnd = pkg.onTraverse = 0;
    // define new prototype-model for this package
    function pxyModel() {}
    // chain existing FlowModel to this model
    pxyModel.prototype = new ProxyModel();
    // define new FlowModel from this extended chain
    ProxyModel = pxyModel;
    // expose the model's prototype for adding API methods
    pkg.proxy = pxyModel.prototype;
    // define new state-prototype-model
    function stateModel() {}
    // expose the stateModel's prototype for adding API methods
    pkg.state = stateModel.prototype;
    // define package definition object, to capture and index this package and it's model
    pkgsIdx[name] = pkgDefs.push({
      name: name,
      pkg: pkg,
      model: pxyModel,
      state: stateModel
    }) - 1;
    // return package
    return pkg;
  }

  function getStates(program) {
    // init vars
    var states = genStates(program); // parse initial states
    // set parent and childIndex of root
    states[0].parentIndex = states[0].childIndex = 0;
    // prepend flow state
    states.unshift(genStates()[0]);
    // reference index of root as child of flow
    states[0].children.push(1);
    // set name
    states[0].name = '_flow';
    // set index
    states[0].index = 0;
    // set depth
    states[0].depth = 0;
    // set location
    states[0].location = '..//';
    // reference the first and last child index
    states[0].firstChildIndex = states[0].lastChildIndex = 1;
    // if we haven't captured
    // return states
    return states;
  }

  function Flow(program, proxy, customCfg) {
    // init vars
    var flow = this; // alias this instance
    if (typeof customCfg !== 'object') {
      customCfg = {};
    }
    // reference original program - for cloning only
    flow.prgm = program;
    // states for this program
    flow.states = getStates(program);
    // define shared pkg api - all package instances control the tank via these members
    flow.shared = {
      // increment and capture the number of Flow instantiations
      id: ++flowCnt,
      // index of the current program state
      currentIndex: 0,
      // index of the target program state (-1 indicates idle or at rest)
      targetIndex: -1,
      // define scoped call to direct this flow
      go: function (tgtIndex) {
        // init vars
        var tgtState = flow.states[tgtIndex]; // alias the target state (if any)
        // if a valid target state was given...
        if (tgtState) {
          // capture the targeted state
          flow.target = tgtState;
          // set target index
          flow.shared.targetIndex = tgtState.index;
        }
        // clear internal stop flag
        flow.stop = 0;
        // return number of steps traversed
        return flow.go();
      },
      // define scoped call to stop this flow
      stop: function () {
        // set internal stop flag
        flow.stop = 1;
        // return truthy when this flow is in a loop, otherwise falsy
        return flow.loop;
      },
      // add and remove post-loop functions
      post: function (param) {
        // based on the type
        switch (typeof param) {
          case 'function':
            // return the index of the callback after adding it to this flow's post queue
            return flow.posts.push(param) - 1;
          break;

          case 'number':
            // if the target is a valid...
            if (flow.posts[param]) {
              // clear the callback at this index
              flow.posts[param] = null;
              // return success
              return true;
            }
        }
        // (otherwise) flag that this call failed
        return false;
      }
    };
    // init collection of post functions
    flow.posts = [];
    // init current state reference
    flow.current = flow.states[0];
    // init target state and loop flags
    flow.target = flow.loop = 0;
    // define a pkg instance for each definition...
    flow.pkgs = pkgDefs.map(function (pkgDef) {
      // init vars
      var pkgInst = { // init pkg instance
          // capture package name for lookups
          name: pkgDef.name
        };
      // define base package
      function pkgBase() {}
      // extend the base package prototype
      pkgBase.prototype = new pkgDef.pkg();
      // set pkg to new pkgBase
      pkgInst.pkg = new pkgBase();
      // copy states array
      pkgInst.pkg.states = genPkgStates(
        flow.states,
        [],
        pkgDef.state
      );
      // if there is a package initialization function...
      if (typeof pkgDef.pkg.init === 'function') {
        // initialize package instance according to the definition's function
        pkgDef.pkg.init.call(pkgInst.pkg, customCfg);
      }
      // add flow and proxy properties
      // expose shared api to this package instance
      pkgInst.pkg.tank = flow.shared;
      // expose public proxy to this package instance
      pkgInst.pkg.proxy = proxy;
      // return the pkgInst
      return pkgInst;
    });
  }

  Flow.prototype = {
    // head towards the current target
    go: function () {
      // init vars
      var flow = this, // alias self
        states = flow.states, // alias states (for minification & performance)
        shared = flow.shared, // alias shared (for minification & performance)
        dir, // direction of traversal movement
        traversals = 0, // the number of traversal events fired
        curState = flow.current, // alias the current state (for minification & performance)
        nextIsEvent = 0, // flag when the nextInt is an event (when 0) or state index (when 1)
        nextInt = 0, // integer representing the state index or event type
        firedEnd; // flag when we've fired the end event
      // if already looping...
      if (flow.loop) {
        // flag true if there is a current target
        return !!flow.target;
      }
      // reset the posts array
      flow.posts = [];
      // flag that this flow is looping
      flow.loop = 1;
      // fire begin event
      flow.fire('Begin');
      // while looping...
      while (flow.loop) {
        // if there is a target and we haven't stopped...
        if (flow.target && !flow.stop) {
          // reset firedEnd flag
          firedEnd = 0;
          // get traversal direction
          dir = flow.target.index - curState.index;
          // if going forwards or backwards...
          if (dir) {
            // if going forward on the _flow or _root state, or the target path contains the current path...
            if ((dir > 0 && curState.index < 2) || !flow.target.location.indexOf(curState.location)) {
              // if already in context...
              if (curState.inContext) {
                // flag that we're switching states
                nextIsEvent = 0;
                // target the first child
                nextInt = curState.firstChildIndex;
              } else { // otherwise, if not in context...
                // flag that we're doing an event
                nextIsEvent = 1;
                // set to in event
                nextInt = 1;
                // flag that we're in the current state
                curState.inContext = 1;
              }
            } else { // otherwise, if the target path is not in the current path...
              // if in the context of the current state...
              if (curState.inContext) {
                // flag that we're doing an event
                nextIsEvent = 1;
                // set to out event
                nextInt = 2;
                // flag that we're out of the current state
                curState.inContext = 0;
              } else { // otherwise, when out of this state...
                // if the current state's parent is an ancestor of the target state...
                if (flow.target.location.indexOf(states[curState.parentIndex].location)) {
                  // set direction to backwards
                  dir = -1;
                }
                // predict next event based on the direction
                nextInt = dir < 0 ? 4 : 3;
                // if the last event was out, or matches the calculated one...
                if (curState.lastEvent === 2 || curState.lastEvent === nextInt) {
                  // flag that we're changing states
                  nextIsEvent = 0;
                  // go forward, backward, or up based on direction
                  nextInt = dir > 0 ? curState.nextIndex : (curState.previousIndex || curState.parentIndex);
                } else { // otherwise, when the last event was not out and won't be repeated...
                  // flag that we're doing an event (the one previously calculated)
                  nextIsEvent = 1;
                }
              }
            }
          } else { // otherwise, when on the target state...
            // flag that we're doing an event
            nextIsEvent = 1;
            // set event to on or in, based on the current context
            nextInt = curState.inContext ? 0 : 1;
            // if already in context...
            if (curState.inContext) {
              // clear internal target
              flow.target = 0;
              // clear shared target (set to negative one)
              shared.targetIndex = -1;
            }
            // set context to in
            curState.inContext = 1;
          }
          // if doing an event...
          if (nextIsEvent) {
            // capture last event
            curState.lastEvent = nextInt;
            // tick traversal event count
            traversals++;
            // fire traverse event with the resolved next target
            flow.fire('Traverse', [nextInt]);
          } else { // otherwise, when changing the current state...
            // reset lastEvent flag from the current state
            curState.lastEvent = 0;
            // set internal current state
            curState = flow.current = states[nextInt];
            // set shared target
            shared.currentIndex = nextInt;
          }
        } else if (!firedEnd && (flow.stop || !flow.target)) { // or, when stopped and we did not fire the stop event and we've stopped...
          // note that we've fired the end event
          firedEnd = 1;
          // fire end event
          flow.fire('End');
        } else { // (otherwise), when none of these conditions are met...
          // flag that we're done looping
          flow.loop = 0;
        }
      }
      // fire post-loop functions
      flow.posts.forEach(function (fnc) {
        if (typeof fnc === 'function') {
          // execute this post-function
          fnc();
        }
      });
      // return the number of traversal events fired
      return traversals;
    },
    // fire package event
    fire: function (evtName, args) {
      // use args or array - assumes args is an array
      args = args || [];
      // prepend event name
      args.unshift(evtName.toLowerCase());
      // prepend evtName with "on" prefix
      evtName = 'on' + evtName;
      // with each package instance...
      this.pkgs.forEach(function (pkgInst) {
        // init vars
        var callback = pkgDefs[pkgsIdx[pkgInst.name]].pkg[evtName]; // get callback from this package instance's definition
        // if the callback is a function...
        if (typeof callback === 'function') {
          // execute call back in scope of the package instance, with given args
          callback.apply(pkgInst.pkg, args);
        }
      });
    }
  };

  /*
  program may be an existing flow - this effectively clones the Flow - this is not for performance but convenience
  */
  function FlowAPI(program, customCfg) {
    // if not invoked with the "new" operator...
    if (!(this instanceof arguments.callee)) {
      // throw an error
      throw new Error('Requires "new"');
    }
    // init vars
    var apiPkgs = {}, // define pkgs collection for this Flow
      flowProxy = new (getFlowProxy()), // create initial flow proxy
      flow = new Flow(program instanceof ProxyModel ? program.toString(sig).prgm : program, flowProxy, typeof customCfg === 'object' ? customCfg : {}); // define (private) flow, and pass flowProxy for any packages
    // faux toString method, for accessing the private flow
    function proxyToString(key) { // faux toString method
      // return corresponding flow or default toString result
      return key === sig ? flow : Object.prototype.toString.apply(this, arguments);
    }
    // return an API container for the private flow
    function getFlowProxy() {
      // return anonymous pointer to the private flow
      function api() {
        // reference pkgs for targeted method calls
        this.pkgs = apiPkgs;
        // add custom
        this.toString = proxyToString;
      }
      // use the ProxyModel as the default prototype
      api.prototype = new ProxyModel();
      // return anonymous proxy instance
      return api;
    }
    // with each package-definition...
    pkgDefs.forEach(function (pkgDef) {
      // init vars
      var apiProxy = getFlowProxy(); // get unique proxy constructor
      // prototype this proxy for this package
      apiProxy.prototype = new pkgDef.model();
      // add package methods to this proxy's pkgs object
      apiPkgs[pkgDef.name] = new apiProxy();
    });
    // return the flow proxy
    return flowProxy;
  }

  // define object pointing to flow
  // set prototype to given model
  FlowAPI.pkg = function (name) {
    // if arguments passed...
    if (arguments.length) {
      // if given a valid name to resolve...
      if (typeof name === 'string' && /\w/.test(name)) {
        // if no package has this name...
        if (!pkgsIdx.hasOwnProperty(name)) {
          // create new package definition
          definePackage(name);
        }
        // return the package definition's pkg function
        return pkgDefs[pkgsIdx[name]].pkg;
      }
      // (otherwise) return false - fire error in the future?
      return false;
    }
    // (otherwise) return list of package names
    return pkgDefs.map(function (pkgDef) {
      // extract the package name
      return pkgDef.name;
    });
  }

  // expose Flow
  window.Flow = FlowAPI;
}(this, Array, genData);