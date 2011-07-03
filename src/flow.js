/*
 * Flow v0.3
 * http://github.com/bemson/Flow/
 *
 * Copyright 2011, Bemi Faison
 * Released under the MIT License
 */
!function () {
  // init vars
  var sig = {}, // private signature object for priviledged access
    pkgs = [], // collection of package-definitions
    pkgsIdx = {}, // name index of package-definitions
    genStates = new genData( // spawn state generator
      function (name, value, parent, index, dataset) {
        // init vars
        var state = this, // alias state
          isInvalid = name && !pkgs.list.every(function (pkg) { // flag true when a package deems this an invalid key
            return !pkg.invalidKey || !pkg.invalidKey.test(name);
          }),
          isData = name && !pkgs.list.every(function (pkg) { // flag true when a package deems this a data key
            return !pkg.dataKey || !pkg.dataKey.test(name);
          });
        // if this key is invalid or flagged as data...
        if (isInvalid || isData) {
          // if valid data, capture in parent data
          if (isData && !isInvalid) parent.data[name] = value;
          // stop parsing this data
          return false;
        }
        // capture index
        state.index = index + 1;
        // capture depth
        state.depth = parent ? parent.depth + 1 : 1; // start depth at 1, since _flow state will be prepended later
        // set name
        state.name = parent ? name : '_root';
        // init data property - holds any attributes of this state
        state.data = {};
        // start or extend parent location
        state.location = index ? parent.location + name + '/': '//';
        // init child collection
        state.children = [];
        // remove parent property
        delete state.parent;
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
            dataset[state.previousIndex - 1].next = state.index;
          }
        }
      }
    );
  function ModelAPI() {}
  // create
  function definePackage(name) {
    // package returns the private instance of it's public proxy
    function pkg(pxy) {
      // init vars
      var flow = pxy && pxy.toString(sig); // pass secret to pxy's toString
      // return the package instance or false
      return flow.pkgs && flow.pkgs[name] || false;
    }
    // set default static properties
    pkg.init = pkg.dataKey = pkg.invalidKey = pkg.onStart = pkg.onEnd = pkg.onFinish = pkg.onTraverse = 0;
    // define new prototype-model for this package
    function Model() {}
    // chain existing FlowModel to this model
    Model.prototype = new ModelAPI();
    // define new FlowModel from this extended chain
    ModelAPI = Model;
    // expose the model's prototype for adding API methods
    pkg.api = model.prototype;
    // define package definition object, to capture and index this package and it's model
    pkgsIdx[name] = pkgs.push({
      name: name,
      pkg: pkg,
      model: Model
    }) - 1;
    // return package
    return pkg;
  }
  function getStates(program) {
    // init vars
    var states = genStates(program); // parse initial states
    // set parent and childIndex of root
    states[0].parentIndex = flow.states[0].childIndex = 0;
    // prepend flow state
    states.unshift(genStates()[0]);
    // reference index of root as child of flow
    states[0].children.push(1);
    // set name
    states[0].name = '_flow';
    // set depth
    states[0].depth = 0;
    // set location
    states[0].location = '..//';
    // reference the first and last child index
    states[0].firstChildIndex = states[0].lastChildIndex = 1;
    // return states
    return states;
  }
  function Flow(program) {
    // init vars
    var flow = this;
    // define pkgs object
    flow.pkgs = {};
    // states for this program
    flow.states = getStates(program);
    // index of the current program state
    flow.curStateIndex = 0;
    // define scoped method calls for package instances
    flow.pkgAPI = {
      go: function () {
        return flow.go.apply(flow, arguments);
      },
      stop: function () {
        return flow.stop.apply(flow, arguments);
      }
    };
    // with each package definition...
    pkgs.forEach(function (pkgDef) {
      // init vars
      var pkg = flow.pkgs[pkgDef.name] = { // the package instance that will mirror this flow
        flow: flow.pkgAPI // alias pkg api as "flow"
      };
      // use the definition's prototype
      pkg.prototype = pkgDef.pkg.prototype;
      // add states array
      pkg.states = [];
      // with each state...
      flow.states.forEach(function (state, idx) {
        // add blank object
        pkg.states[idx] = new function () {};
        // use state as prototype
        pkg.states[idx].constructor.prototype = state;
      });
      // if there is a package initialization function, invoke on this package
      if (pkgDef.pkg.init) pkgDef.pkg.init.call(pkg);
    });
  }
  Flow.prototype = {
    go: function () {
      // fire loop towards target
    },
    stop: function () {
      // set stop flag to true
      flow.stopFlag = 1;
    }
  };

  function FlowAPI(program) {
    // init vars
    var flow = new Flow(program), // define (private) flow
      apiPkgs = {}, // define pkgs collection for this Flow
      proxyAPI = getProxyAPI(); // create API proxy
    // use the ModelAPI as the primary prototype
    proxyAPI.constructor.prototype = new ModelAPI();
    // faux toString method, for accessing the private flow
    function proxyToString(key) { // faux toString method
      // return corresponding flow or default toString result
      return key === sig ? flow : Object.prototype.toString.apply(this, arguments);
    }
    // return an API container for the private flow
    function getProxyAPI() {
      // return anonymous pointer to the private flow
      function api() {
        // reference pkgs for targeted method calls
        this.pkgs = apiPkgs;
        // add custom
        this.toString = proxyToString;
      }
      // return anonymous proxy instance
      return new api();
    }
    // with each package-definition...
    pkgs.forEach(function (pkgDef) {
      // create apiProxy for this package and use it's corresponding model for a prototype
      (apiPkgs[pkgDef.name] = getProxyAPI()).constructor.prototype = new pkgDef.model();
    });
    // return the flowAPI
    return proxyAPI;
  }
  // define object pointing to flow
  // set prototype to given model
  FlowAPI.pkg = function (name) {
    // if given a valid name to resolve...
    if (typeof name === 'string' && /\w/.test(name)) {
      // if no package has this name, create new package definition
      if (!pkgsIdx.hasOwnProperty(name)) definePackage(name);
      // return the package definition's pkg function
      return pkgs[pkgsIdx[name]].pkg;
    }
    // (otherwise) return false - fire error in the future?
    return !1
  }
  window.Flow = FlowAPI;
}();
