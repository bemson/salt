/*
 * Flow v0.3
 * http://github.com/bemson/Flow/
 *
 * Copyright 2011, Bemi Faison
 * Released under the MIT License
 */
!function () {
  // init vars
  var pkgs = [], // collection of extension packages
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
  function PkgChain() {}
  function Pkg(name) {
    // init vars
    var pkg = this; // alias self
    // add to packages
    pkgs.list.push(pkg);
    // index this package
    pkgs.idx[name] = pkg;
    // capture name
    pkg.name = name;
    // define new constructor
    pkg._cnst = function chain() {}
    // chain existing prototype to this constructor
    pkg._cnst.prototype = new PkgChain();
    // expose chain prototype via package
    pkg.methods = chain.prototype;
    // set as new package chain
    PkgChain = pkg;
    
  }
  function createProgram(obj) {
    // init vars
    var program = genStates(obj), // get states
      flow = genStates()[0], // define flow state
      root; // placeholder for root state
    // prepend flow to program
    program.unshift(flow);
    // alias root of program (now at index 1)
    root = program[1];
    // set flow properties
    with (flow) {
      // reference index of root as child of flow
      children.push(root.index);
      // set name
      name = '_flow';
      // set depth
      depth = 0;
      // set location
      location = '..//';
    }
    // reference the first child index
    flow.firstChildIndex = root.index;
    // reference the last child index
    flow.lastChildIndex = root.index;
    // referencelink root to flow
    root.parentIndex = flow.index;
    // set root index in flow
    root.childIndex = 0;
    // return program dataset
    return program;
  }
  function proxyAPI(flow) {
    this._Flow = flow;
  };
  // create
  function createProxyAPI(proxy, cnst) {
    // define constructor to reference
    function api(proxy) {
      this._Flow = proxy;
    };
    // set api prototype
    api.prototype = cnst.prototype;
    // return instance of api
    return new api(proxy);
  }
  function Flow(program) {
    // init vars
    var proxy = createFlowProxy(program), // define (private) flow and receive it's proxy (PACKAGE API)
      flow = createPackageProxy(proxy, Pkgs), // create base api with all prototyped packages
      returnFnc, // placeholder for final initialization action
      i = 0, pkg; // loop vars
    // add pkgs to base flow
    flow.pkgs = {};
    pkgs.forEach(function () {
      
    });
    // with each package...
    for (; pkg = pkgs.list[i]; i++) {
      // if this package has a return override action, capture it
      if (pkg.returnOverride) returnFnc = pkg.returnOverride; // overrides return action of earlier packages
      // create api for this package, and add to pkgs
      flow.pkgs[pkg.name] = createPackageProxy(proxy, pkg);
    }
    // object must have
    
    // return object
    return {      
      pkgs: {
        core: getPackage('core')
      }
    };
  }
  // define object pointing to flow
  // set prototype to given model
  Flow.pkg = function (name) {
    // if given a package name to resolve...
    if (name) {
      // if there is no package with this name...
      if (!pkgs.idx.hasOwnProperty(name)) {
        // create new package 
        pkgs.idx[name] = new PackageDefinition();
      }
      // return the target package function
      return pkgs[name];
    }
    // (otherwise) return all package instances
    return pkgs.map(function (pkg) {})
  }
  window.Flow = Flow;
}();

/*

this.pkg.core.go();

this.pkg.core.arguments

this.go = function () {
  this._Flow.go(); -> priviledged method
  this._Flow.stop(); -> priviledged method
};


Flow._Flow.go(); -> priviledged method

Flow.query();
Flow.pkgs.core.query();
Flow.pkgs.core._Pkg.arguments; -> "._Pkg" is the package definition

both "Flow" and "core" are objects with "._Flow" pointer -> points to the flow instance proxy

this.go();

[Outside] Flow.pkg('debug').methods.log -> prototype log() function

[Inside] this.log -> from prototype of debug package
[Inside] this.pkgs.debug.log -> none of these can point to a prototype, but must come from a prototype

"this" and "debug" can be gset objects - which would point to the same methods?

must be objects that point to the same containing package methods - which point 


What is pkgs? How will it always show the 


Flow.prototype.log = fnc
Flow.pkg('debug').methods.log = fnc -> updates prototype of Flow to a PkgMgr

this.log(); -> this is clear
this.pkgs.debug.log(); -> can it be the same this?

when this and debug are both prototyped by the true Flow - perhaps it can be??

we can prototype Flow properties?
*/
