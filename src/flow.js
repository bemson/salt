/*!
 * Flow v0.4.0
 * http://github.com/bemson/Flow/
 *
 * Dependencies:
 * - Panzer v0.3.5 / Bemi Faison (c) 2012 / MIT (http://github.com/bemson/Panzer/)
 * - genData v2.0.1 / Bemi Faison (c) 2012 / MIT (http://github.com/bemson/genData/)
 *
 * Copyright 2012, Bemi Faison
 * Released under the MIT License
 */
!function (inCommonJsEnv, Array, window, undefined) {
  // if in a web environment and Flow already exists...
  if (!inCommonJsEnv && window.Flow) {
    // exit now, and don't re-initialize Flow
    return;
  }

  var
    // get Panzer namespace from environment, then define the Flow namespace
    Flow = getFromEnvironment('Panzer').Panzer.create(),
    // get genData from environment
    genData = getFromEnvironment('genData').genData,
    // define the "core" package
    corePkgDef = Flow.pkg('core'),
    /*
    this generator handles any nesting and combination of _data component values...
    ...strings
      > _data: 'foo'
    ...objects
      > _data: {foo: 'bar'}
    ...arrays of strings, arrays and objects
      > _data: ['f', 'o', 'b']
      > _data: [['f'], ['o'], ['b]]
      > _data: [{foo: 'bar'}, {hello: 'world'}]
      > _data: [['g',{foo: 'bar'}], 'alpha', {accts: 9}] // mixed
    */
    generateDataConfigurationObjects = genData.spawn(function (name, value, parent, dataset, flags, shared) {
      var
        // alias self
        data = this,
        // flag when this item will be a data configuration
        keep = 1,
        // data configuration object
        obj = {
          // name of data
          name: data.name,
          // initial data value
          value: data.value,
          // flag to use this value (true by default)
          use: 1
        };

      // omit everything
      flags.omit = 1;
      // flag when this is an object
      data.O = typeof value === 'object';
      // flag when this is an Array
      data.A = value instanceof Array;
      // if there is a parent...
      if (parent) {
        // if the parent is an array...
        if (parent.A) {
          // if this is an object...
          if (data.O) {
            // exclude from resulting array
            keep = 0;
          }
        } else { // otherwise, when the parent is not an array (assume the parent is an object)...
          // don't scan the children of this object (because it's the value of this _data config, not a new one)
          flags.scan = 0;
        }
      } else { // otherwise, when there is no parent...
        // if there is no keys in shared...
        if (!shared.keys) {
          // init shared.keys
          shared.keys = {};
        }
        // if the first item is an object...
        if (data.O) {
          // exclude from the result
          keep = 0;
        }
      }
      // if keeping this data...
      if (keep) {
        // if there is no parent, or the parent is an array...
        if (!parent || parent.A) {
          // use the value as the name
          obj.name = value;
          // set the value to undefined
          obj.value = undefined;
          // flag that this data has no value
          obj.use = 0;
        }
        // if the (resolved) name is valid...
        if (isDefNameValid(obj.name)) {
          // convert name to string
          obj.name += '';
          // if this key name exists...
          if (shared.keys.hasOwnProperty(obj.name)) {
            // remove existing data configuration
            dataset.splice(shared.keys[obj.name], 1);
          }
          // add to dataset and capture index
          shared.keys[obj.name] = dataset.push(obj) - 1;
        }
      }
    }),
    // return path-tokens from a given string
    generateTokens = genData.spawn(function (name, value, parent, dataset, flags) {
      var
        // alias self
        data = this,
        // shorthand forward-slash character
        slash = '/';

      // init set property (default is false, or "not a set")
      data.set = 0;
      // capture parent
      data.parent = parent;
      // init done property
      data.done = 0;
      // if this is a string...
      if (typeof value === 'string') {
        // if slashes exist...
        if (~value.indexOf(slash)) {
          // split into slashes
          data.value = value.split(slash);
        } else if (value.charAt(0) === '[') { // or, when a match-set...
          // remove brackets and split by the match-set delimiter
          data.value = value.slice(1,-1).split('|');
          // flag that this is a set
          data.set = 1;
        }
      }
      // if the value is (still) a string...
      if (typeof data.value === 'string') {
        // if the parent exists and is a set...
        if (parent && parent.set) {
          // identify this as part of that set
          data.set = 1;
          // identify this as the last option in the set
          parent.last = data;
        }
        // set "first" property, based on whether items already exist in the dataset
        data.first = !dataset.length;
      } else { // otherwise, when not a string...
        // exclude from dataset
        flags.omit = 1;
      }
    }),
    // collection of active flows
    activeFlows = [],
    // tests when the string of an import attribute is valid
    r_validPath = /^\/\/(?:\w+\/)+/;

  // version string
  Flow.version = '0.4.0';

  // return a given namespace, based on whether in a browser or CommonJS environment
  function getFromEnvironment(namespace) {
    return inCommonJsEnv ? require(namespace) : window;
  }

  // returns true when the argument is a valid data name
  function isDefNameValid(name) {
    return name != null && /\w/.test(name);
  }

  // flag when the given argument is a state query
  function smellsLikeAStateQuery(val) {
    var
      valType = typeof val;

    // flag when val is...
    return (
      // a positive number
      valType === 'number' && val >= 0) ||
      // a string of any length
      (valType === 'string' && val) ||
      // a function that resolves into a flow path
      (valType === 'function' && (val + '').charAt(0) === '/');
  }

  // edits store configuration based on given value
  function setStoreCriteria(criteria, value, givenType) {
    // based on the attribute value type...
    switch (givenType || typeof value) {

      case 'object':
          // add to the programs list
          criteria[0].push(value);
      break;

      case 'string':
        // add string as state or path, based on presence of a forward slash
        criteria[~value.indexOf('/') ? 1 : 2].push(value);
      break;

      case 'number':
        // add to state index list
        criteria[3].push(Math.abs(~~value));
      break;
    }
  }

  function mergeStates( program, tagKeyTests, base, source, merged ) {
    var
      // name of the member
      name,
      // temporary object and types
      sourceType, baseType,
      obj,
      // loop vars
      idx = 0, length,
      // keys in base object
      baseKeys = Object.keys(base),
      // keys in source object
      sourceKeys = Object.keys(source),
      // keys of the merged object
      mergedKeys,
      keyIsShared;

    // key tests from every package
    tagKeyTests = tagKeyTests || Flow.pkg()
      .map(function ( pkgName ) {
        return Flow.pkg( pkgName ).tagKey
      })
      .filter(function ( tagKeyTest ) {
        return tagKeyTest
      });

    // define a merged object to return, or create one
    merged = merged || {};

    // add base object keys
    for (idx = 0; name = baseKeys[idx]; idx++) {
      // flag whether the key is in the source object
      keyIsShared = source.hasOwnProperty(name);
      // if this is a tag...
      if (tagKeyTests.every(function ( tagKeyTest ) {
        // if this is a function...
        if (typeof tagKeyTest === 'function') {
          // return result of function
          return tagKeyTest( name, value );
        } else { // otherwise, when the test is not a function...
          // return whether the regular expression passed
          return tagKeyTest.test( name );
        }
      })) {
        // if the key is present in the source object...
        if (keyIsShared) {
          // use source's tag value
          merged[name] = source[name];
        } else { // otherwise, when the key is not in the source object...
          // use base's tag value
          merged[name] = base[name];
        }
      } else { // otherwise, when not a tag...
        // if the key is also in the source object...
        if (keyIsShared) {
          // get types
          baseType = typeof base[name];
          sourceType = typeof source[name];

          // if base is a function...
          if (baseType === 'function') {
            // init new base object
            obj = {};
            // add target key
            obj[name] = {};
            // add "on" tag pointing to this function
            obj[name]['_' + corePkgDef.events[0]] = base[name];
            // set new base object
            base = obj;
            // set base type
            baseType = 'object';
          }

          // if source is a function...
          if (sourceType === 'function') {
            // init new source object
            obj = {};
            // add target key
            obj[name] = {};
            // add "on" tag pointing to this function
            obj[name]['_' + corePkgDef.events[0]] = source[name];
            // set new source object
            source = obj;
            // set source type
            sourceType = 'object';
          }

          // if the base and source are objects...
          if (baseType === 'object' && sourceType === 'object') {
            // merge the subtrees
            merged[name] = mergeStates( program, tagKeyTests, base[name], source[name] );
          } else { // otherwise, when one is not an object...
            // ignore the base value (since they can't be merged)
            merged[name] = source[name];
          }
        } else { // otherwise, when the key is not in the source object
          // copy to the final object
          merged[name] = base[name];
        }
      }
    }

    // add unique source object keys
    for (idx = 0; name = sourceKeys[idx]; idx++) {
      // if this key is not in the base object...
      if (!base.hasOwnProperty(name)) {
        // add directly to the merged object
        merged[name] = source[name];
      }
    }

    // get merged object's keys
    mergedKeys = Object.keys(merged);
    // process nested literal imports
    for (idx = 0; name = merged[idx]; i++) {
      // if the value is a string and a valid import string...
      if (typeof merged[name] === 'string' && r_validImportPath.test( merged[name] )) {
        // get resolved path
        obj = resolveProgramPath( merged[name], program );
        // if the result is valid...
        if (typeof obj !== 'undefined') {
          // use resolved state reference
          merged[name] = obj;
        }
      }
    }

    // return the merged object
    return merged;
  }

  function resolveProgramPath( path, program ) {
    var
      // the state whose child states should be used, based on the given paths
      resolvedState,
      // placeholder for simiulating a full state when it's actually a function
      fauxState,
      // cached of processed paths
      paths = {};

    // while there is a valid state path (handles recursive references)...
    while (path && r_validPath.test( path )) {
      // flag that we've tested this path
      paths[path] = 1;
      // start the resolved state at the program
      resolvedState = program;
      // with each state in this path...
      path.slice( 2, -1 ).split( '/' ).every(function ( childPath ) {
        // step through the path, state by state
        return (resolvedState = resolvedState.hasOwnProperty( childPath ) && resolvedState[childPath]);
      });
      // if the resolved state is yet another path that has not been resolved...
      if (typeof resolvedState === 'string' && !paths.hasOwnProperty( resolvedState )) {
        // set as new path to test and import
        path = resolvedState;
      } else {
        // clear the import path (to exit loop)
        path = 0;
      }
    }
    // if the resolved state is a function...
    if (typeof resolvedState === 'function') {
      // enclose in an object
      fauxState = {};
      fauxState['_' + corePkgDef.events[0]] = resolvedState;
      resolvedState = fauxState;
    }
    // return the final state (when truthy), or `undefined` otherwise
    return resolvedState;
  }

  // collection of active package-trees - exposed to support package integration
  corePkgDef.actives = [];

  // define traversal event names
  corePkgDef.events = [
    // maps to traversal type 0
    'on',
    // maps to traversal type 1
    'in',
    // maps to traversal type 2
    'out',
    // maps to traversal type 3
    'over',
    // maps to traversal type 4
    'bover'
  ];

  // pattern for identifying tag keys
  corePkgDef.tagKey = /^_/;

  // pattern for identifying invalid keys
  corePkgDef.badKey = /^\W+$|^toString$|^[@\[]|[\/\|]/;

  // tests each state for the import pattern, and performs substitution when necessary
  corePkgDef.prepNode = function ( state, program ) {
    var
      // the state whose child states should be used, based on the _import attribute
      resolvedState,
      // determine whether this state is extensible, based on it's attribute or value
      importPath = typeof state === 'string' ? state : (state && typeof state._import === 'string' ? state._import : '');

    // if there is a path...
    if (importPath && r_validPath.test( importPath )) {
      // resolve a state from this path
      resolvedState = resolveProgramPath( importPath, program );
      // if the resolved state and given state are both objects...
      if (typeof resolvedState === 'object' && typeof state === 'object') {
        // get merged state
        resolvedState = mergeStates( program, 0, resolvedState, state );
      }
    }

    // return the final state
    return resolvedState;
  };

  // initialize the package instance with custom properties
  // only argument is the object passed after the program when calling "new Flow(program, extraArg)"
  corePkgDef.init = function (cfg) {
    var
      // alias self
      pkg = this,
      // flag when an owner is available
      activeFlow = activeFlows[0],
      // the store of the active flow
      activeFlowStore,
      // the config of the active flow store
      activeFlowStoreCfg,
      // flag indicates when the program wants an owner
      childWantsToBind,
      // delimiter for stored strings
      randomDelimiter = Math.random();

    // collection of custom callback queries
    pkg.cbs = {};
    // collection of arguments for traversal functions
    pkg.args = [];
    // collection of node calls made while traversing
    pkg.calls = [];
    // collection of nodes targeted and reached while traversing
    pkg.trail = [];
    // collection of defined variables
    pkg.data = {};
    // init delay object
    pkg.delay = {};
    // collection of stores
    pkg.stores = [];
    // collection of cached values
    pkg.cache = {
      // token query cache
      indexOf: {}
    };
    // flag when api calls are trusted
    pkg.trust = 0;
    // init locked flag
    pkg.locked = 0;
    // init tracked target
    pkg.tgtTrace = [];
    // init index of node paths
    pkg.nodeIds = {};
    // the number of child flows fired by this flow's program functions
    pkg.pending = 0;
    // collection of parent flow references
    pkg.pendees = [];
    // collection of targeted nodes
    pkg.targets = [];
    // stack of defined variables (begin with faux data stack)
    pkg.dataStack = [[]];
    // identify the initial phase for this flow, 0 by default
    pkg.phase = 0;
    // flags when the _in or _out phases have notified the owning flow (if any)
    pkg.ownUp = 0;
    // set name of first node name to _flow
    pkg.nodes[0].name = '_flow';
    // set name of second node
    pkg.nodes[1].name = '_program';
    // init collection of precompiled values
    pkg.pc = {};
      // init cache of paths string
      pkg.pc[0] = '|';
      // init cache of state name string
      pkg.pc[1] = '|';
    // initialize each node...
    pkg.nodes.forEach(function (node, idx) {
      var
        // capture parent (undefined for the first node)
        parent = pkg.nodes[node.parentIndex],
        // alias node tags
        tags = node.tags,
        // multiple use variable
        dynamicVariable;

      // init collection of precompilation values for this node
      node.pc = {};
      // collection of pre-compiled child state names
      node.pc[0] = '|';

      // cache this nodes index by it's unique path
      pkg.nodeIds[node.path] = idx;
      // if there is a parent state...
      if (parent) {
        // add to known paths
        pkg.pc[0] += node.path + '|';
        // add to known states
        pkg.pc[1] += node.name + '|';
        // add to parent's collection of child names
        parent.pc[0] += node.name + '|';
      }
      // add reference to the package-instance containing this node
      node.pkg = pkg;
      // set pendable flag, (true by default, and otherwise inherited when the parent is not pendable)
      node.pendable = (parent && !parent.pendable) ? 0 : (tags.hasOwnProperty('_pendable') ? !!node.tags._pendable : 1);
      // set root to default index or self, based on _root attribute
      node.root = idx < 2 ? 1 : tags._root && node.index || parent.root;
      // set restrict node index, based on the "_restrict" attribute or the parent's existing restriction
      node.restrict = tags.hasOwnProperty('_restrict') ? tags._restrict && node.index || -1 : parent && parent.restrict || -1;
      // set lock to boolean equivalent of attribute
      node.lock = !!tags._lock;
      // set default for whether this node updates or is an update gate
      node.upOwn = node.upGate = 0;
      // if an owning flow is available...
      if (activeFlow) {
        // if there is a valid _owner attribute...
        if (tags.hasOwnProperty('_owner')) {
          // if the attribute is valid...
          if (typeof tags._owner == 'string' || typeof tags._owner == 'number') {
            // flag that this child flow wants an owner
            childWantsToBind = 1;
            // flag that this node is should update an owning package, also when it's entered and exited
            node.upOwn = node.upGate = 1;
            // set (new) owner callback path
            node.upPath = tags._owner;
          }
        } else if (parent && parent.hasOwnProperty('upPath')) { // or, if the parent exists and has an upPath property...
          // flag that this is an update state
          node.upOwn = 1;
          // set the upPath to the parent
          node.upPath = parent.upPath;
        }
      }

      // if this node has a _store attribute...
      if (tags.hasOwnProperty('_store')) {
        // init store configuration
        node.store = [
          [     // 0 capture criteria
            [], // 0-0 - program criteria
            [], // 0-1 - paths criteria
            [], // 0-2 - state names criteria
            [], // 0-3 - state index criteria
          ],
          [     // 1 filter criteria
            [], // 1-0 - program criteria
            [], // 1-1 - paths criteria
            [], // 1-2 - state names criteria
            [], // 1-3 - state index criteria
          ],
          0, // 2 - capture limit
          !parent.lastStore  // 3 - new store flag - false by default, unless first store configuration in this branch
        ];
        // if the value is truthy...
        if (tags._store) {
          // get type of store value
          dynamicVariable = typeof tags._store;
          // if a string or array...
          if (dynamicVariable == 'string' || tags._store instanceof Array) {
            // flag whether the criteria is for filtering or capturing
            dynamicVariable = node.store[3] ? 0 : 1;
            // with each filter/capture criteria...
            [].concat(tags._store).forEach(function (filter) {
              // add to capture criteria
              setStoreCriteria(node.store[dynamicVariable], filter);
            });
          } else if (dynamicVariable == 'object') {
            // flag whether this configuration belongs to the (0) capture or (1) filter criteria
            dynamicVariable = (node.store[3] || (tags._store.hasOwnProperty('capture') && tags._store.capture)) ? 0 : 1;
            // if we should use the previous store...
            if (
              // there is a previous store configuration, and...
              parent.lastStore &&
              (
                // this configuration is capturing (dynamicVariable is 0)...
                !dynamicVariable ||
                // the scope property is set and false...
                (tags._store.hasOwnProperty('scope') && !tags._store.scope)
              )
            ) {
              // set scope to falsy
              node.store[3] = 0;
              // if the parent has capture criteria...
              if (parent.lastStore[0]) {
                // copy the last store's capture criteria
                node.store[0][0] = parent.lastStore[0][0];
                node.store[0][1] = parent.lastStore[0][1];
                node.store[0][2] = parent.lastStore[0][2];
                node.store[0][3] = parent.lastStore[0][3];
              }
              // copy the last store's filter criteria
              node.store[1][0] = parent.lastStore[1][0];
              node.store[1][1] = parent.lastStore[1][1];
              node.store[1][2] = parent.lastStore[1][2];
              node.store[1][3] = parent.lastStore[1][3];
              // copy the last store's limit
              node.store[2] = parent.lastStore[2];
              // flag to not create a new store
              node.store[3] = 0;
            } else { // otherwise, when creating a new store...
              // if there is a valid limit property...
              if (tags._store.hasOwnProperty('limit') && tags._store.limit > 0) {
                // set capture limit
                node.store[2] = ~~tags._store.limit;
              }
            }
            // if there is a programs key...
            if (tags._store.hasOwnProperty('programs')) {
              // add to programs criteria
              node.store[dynamicVariable][0] = node.store[dynamicVariable][0].concat(tags._store.programs);
            }
            // if there is a states key...
            if (tags._store.hasOwnProperty('states')) {
              // place state criteria...
              [].concat(tags._store.states).forEach(function (stateCriteria) {
                var
                  // capture the store indice to target, based on whether this is a number or string
                  stateNameOrIndex = typeof stateCriteria == 'number' ? 3 : 2;

                // add to index or name criteria, based on the type of value
                node.store[dynamicVariable][stateNameOrIndex] = node.store[dynamicVariable][stateNameOrIndex].concat(stateCriteria);
              });
            }
            // if there is a paths key...
            if (tags._store.hasOwnProperty('paths')) {
              // add to paths criteria
              node.store[dynamicVariable][1] = node.store[dynamicVariable][1].concat(tags._store.paths);
            }
          }
          // sort capture and store index criteria, so the smallest number is the first
          node.store[0][3].sort();
          node.store[1][3].sort();
          // if there is capture criteria for the state index...
          if (node.store[0][3].length) {
            // reduce to one value (we only care about the minimum state index)
            node.store[0][3].length = 1;
          }
        } else { // otherwise, when the value is falsy...
          // create a new store
          node.store[3] = 1;
          // clear capture criteria - disables auto-collection of instances AND clears store
          // there is no way to disable auto-capture and preserve the previous store
          node.store[0] = 0;
        }
        // set as the last store
        node.lastStore = node.store;
      } else { // otherwise, when there is no _store attribute...
        // flag that this node does not have a store configuration
        node.store = 0;
        // pass thru the last store configuration defined - if any
        node.lastStore = parent ? parent.lastStore : 0;
      }

      // if this node has a _sequence tag...
      if (tags.hasOwnProperty('_sequence')) {
        // set walk to a new or copied array, based on the booly value
        node.seq = tags._sequence ? [] : 0;
        // set last walk to this state's walk
        node.lastWalk = node.seq;
      } else {
        // set walk property to nil
        node.seq = 0;
        // pass thru the last walk array defined - if any
        node.lastWalk = parent && parent.lastWalk || 0;
        // if there is a lastWalk array...
        if (node.lastWalk) {
          // add this node's index to the array
          node.lastWalk[node.lastWalk.length] = node.index;
        }
      }

      // capture when the parent lock property is true
      node.plock = parent ? parent.lock : 0;
      // define callback function - a curried call to .target()
      node.cb = function () {
        var
          // capture any arguments
          args = [].slice.call(arguments);

        // prepend this node's index as the target
        args.unshift(idx);
        // invoke the proxies target method, pass along arguments
        return pkg.proxy.target.apply(pkg.proxy, args);
      };
      // override toString method of .cb
      node.cb.toString = function () {
        // return thes node's index
        return node.path;
      };
      // add data configurations for this node
      node.data = generateDataConfigurationObjects(tags._data);
      // if there is a parent...
      if (parent) {
        // append to parent's cb function
        parent.cb[node.name] = node.cb;
      }
      // define array to hold traversal functions for each traversal name...
      node.fncs = corePkgDef.events.map(function (name) {
        name = '_' + name;
        //  set traversal function to 0 or the corresponding attribute key (when a function)
        return typeof tags[name] === 'function' ? tags[name] : 0;
      });
      // if there is no _on[0] function and this node's value is a function...
      if (!node.fncs[0] && typeof node.value === 'function') {
        // use as the _on[0] traversal function
        node.fncs[0] = node.value;
      }
    });
    // clean up/finalize compilation support/tracking properties
    pkg.nodes.forEach(function (node) {
      // remove parse tracking members
      delete node.lastStore;
      delete node.lastWalk;
    });
    // set owner to default
    pkg.owner = 0;
    // if there is an active flow...
    if (activeFlow) {
      // if this program allows an owner...
      if (childWantsToBind) {
        // assign owner
        pkg.owner = activeFlow;
      }
      // if this instance should be auto-captured by the parent...
      if (
        // there is a storage tracking object...
        activeFlow.stores.length &&
        // it captures
        (activeFlowStoreCfg = (activeFlowStore = activeFlow.stores[0])[1][0])[0] &&
        // the capture criteria is satisfied
        (
          // meets program criteria
          (
            !activeFlowStoreCfg[0][0].length ||
            activeFlowStoreCfg[0][0].some(function (rawProgram) {
              return pkg.nodes[1].value === rawProgram;
            })
          ) &&
          // meets path criteria
          (
            !activeFlowStoreCfg[0][1].length ||
            activeFlowStoreCfg[0][1].some(function (pathCriteria) {
              return ~pkg.pc[0].indexOf(pathCriteria);
            })
          ) &&
          // meets state and index criteria...
          (
            // has no state name or index criteria, or...
            !(activeFlowStoreCfg[0][2].length + activeFlowStoreCfg[0][3].length) ||
            // meets name criteria, or...
            activeFlowStoreCfg[0][2].some(function (stateCriteria) {
              // the required state exists
              return ~pkg.pc[1].indexOf('|' + stateCriteria + '|');
            }) ||
            // this newly created instance meets the minimum state index
            pkg.nodes.length > activeFlowStoreCfg[0][3][0]
          )
        )
      ) {
        // add this instance to the parent's storage
        activeFlowStore[0].push(pkg);
        // clear the store's cache
        activeFlowStore[2] = [];
        // if there are now more items than allowed...
        if (activeFlowStoreCfg[2] && activeFlowStore[0].length > activeFlowStoreCfg[2]) {
          // remove oldest store item
          activeFlowStore[0].shift();
        }
      }
    }
    // if the cfg has a host key...
    if (cfg.hasOwnProperty('hostKey')) {
      // capture the host key
      pkg.hostKey = cfg.hostKey;
    }
    // if the cfg contains a cede list....
    if (cfg.cedeHosts instanceof Array) {
      // override .allowed() method
      pkg.allowed = function () {
        // flag when original method passes, or...
        return corePkgDef.prototype.allowed.apply(pkg, arguments) ||
          (
            // there are active flows
            activeFlows.length &&
            // the current flow has permission to control this one...
            ~cfg.cedeHosts.indexOf(activeFlows[0].hostKey)
          );
      };
    }
  };

  // define prototype of any package instances
  corePkgDef.prototype = {

    // return index of the node resolved from a node reference
    /*
    qry - (string|function.toString()|number|object.index) which points to a node
    node - object - the node to begin any dynamic referencing
    */
    indexOf: function (qry, node) {
      var
        // alias self
        pkg = this,
        // alias for minification and performance
        nodes = pkg.nodes,
        // alias for minification and performance
        nodeIds = pkg.nodeIds,
        // the untokenized portion of a tokenized query
        qryLeaf,
        // the node to query from, when parsing tokens
        qryNode,
        // flags when the query begins with a @program or @flow token
        isAbsQry,
        // collection of individual tokens (extracted from the query)
        tokens,
        // the token being parsed
        token,
        // the index to return for the resolved node (default is -1, indicates when the node could not be found)
        idx = -1;

      // use the current node, when node is omitted
      node = node || pkg.nodes[pkg.tank.currentIndex];
      // based on the type of qry...
      switch (typeof qry) {
        case 'object':
          // if not the null object...
          if (qry !== null) {
            // assume the object is a node, and retrieve it's index property value
            qry = qry.index;
          }
        case 'number':
          // if the index is valid...
          if (nodes[qry]) {
            // set idx to this number
            idx = qry;
          }
        break;

        case 'function':
          // get toString version of this function
          qry = qry + '';
        case 'string':
          // if the string is empty...
          if (qry == '') {
            break;
          }
          // if qry is the _flow or _program id...
          if (qry === '..//' || qry === '//') {
            // set idx to 0 or 1, based on qry
            idx = qry === '//' ? 1 : 0;
          } else { // otherwise, when the string is not the _flow or _program ids...
            // extract tokens from the query
            tokens = qry.match(/^(?:(?:\.{1,2}|[@\[][^\/]+)\/?)+/);
            /*
            THIS RXP is allowing this to pass thru...
              [@program][a] -> no "][" pattern should be allowed
            */
            // if there are tokens...
            if (tokens) {
              // if there is no generic or specific cache for this query...
              if (!pkg.cache.indexOf.hasOwnProperty(qry + node.index) && !pkg.cache.indexOf.hasOwnProperty(qry)) {
                // get remaining query (without token)
                qryLeaf = qry.substr(tokens[0].length);
                // flag when this is an absolute query
                isAbsQry = 0;
                // parse tokens
                tokens = generateTokens(tokens[0]);
                // set idx to the current node's index (for the initial loop)
                idx = node.index;
                // while there are tokens and the found idx is valid...
                while ((qryNode = nodes[idx]) && tokens.length) {
                  // remove this token for processing
                  token = tokens.shift();
                  // if this token is not part of a set, or it's set has not been satisfied...
                  if (!token.set || !token.parent.done) {
                    // based on the token value...
                    switch (token.value) {
                      case '@firstchild':
                        idx = qryNode.firstChildIndex;
                      break;

                      case '@lastchild':
                        idx = qryNode.lastChildIndex;
                      break;

                      case '@next':
                        idx = qryNode.nextIndex;
                      break;

                      case '@parent':
                      case '..':
                        idx = qryNode.parentIndex;
                      break;

                      case '@previous':
                        idx = qryNode.previousIndex;
                      break;

                      case '@root': // root relative the to the current node
                        idx = qryNode.root;
                      break;

                      case '@program': // program root
                      case '@flow': // parent to program root
                        // if this is the first token to be processed...
                        if (token.first) {
                          // flag that this is an absolute query
                          isAbsQry = 1;
                        }
                        // set the index to either absolute indice
                        idx = (~token.value.indexOf('f')) ? 0 : 1;
                      break;

                      case '@oldest':
                      case '@youngest':
                        // set index to first or last child, based on whether there is a parent
                        idx = (nodes[qryNode.parentIndex]) ? nodes[qryNode.parentIndex][(~token.value.indexOf('y') ? 'firstChild' : 'lastChild') + 'Index'] : -1;
                      break;

                      case '@self':
                      case '.':
                        idx = qryNode.index;
                      break;

                      default:
                        // if the token is the name of a child state...
                        if (~qryNode.pc[0].indexOf('|' + token.value + '|')) {
                          // set idx to the matching child state
                          idx = pkg.nodeIds[qryNode.path + token.value + '/'];
                        } else if (token.value) { // or, when the token is not an empty string...
                          // fail parsing due to unrecognized token
                          idx = -1;
                        }
                    }
                    // if part of a set and the idx is valid...
                    if (token.set) {
                      // if the idx is valid...
                      if (idx > -1) {
                        // flag that we're done searching this set
                        token.parent.done = 1;
                      } else if (token.parent.last !== token) { // or, when invalid and this is not the last set option...
                        // reset idx to the current node's index
                        idx = qryNode.index;
                      }
                    }
                  }
                }
                // set index to the resolved node index or -1, append and validate with qryEnd, if present
                idx = (qryNode && (!qryLeaf || (qryNode = nodes[nodeIds[qryNode.path + qryLeaf.replace(/([^\/])$/,'$1/')]]))) ? qryNode.index : -1;
                // cache the query result (original query, plus nothing or the node index)
                pkg.cache.indexOf[qry + (isAbsQry ? '' : node.index)] = idx;
              }
              // return the value of the cached query id, use generic cache-id if the specific one is not present
              idx = pkg.cache.indexOf.hasOwnProperty(qry + node.index) ? pkg.cache.indexOf[qry + node.index] : pkg.cache.indexOf[qry];
            } else { // otherwise, when there are no tokens...
              // if the first character is not a forward slash...
              if (qry.charAt(0) !== '/') {
                // prepend current path
                qry = node.path + qry;
              } else if (qry.charAt(1) !== '/') { // or, when the second character is not a forward slash...
                // prepend the current node's root
                qry = nodes[node.root].path + qry.substr(1);
              }
              // if the last character is not a forward slash...
              if (qry.slice(-1) !== '/') {
                // append the final forward slash
                qry += '/';
              }
              // set idx to a string match or -1
              idx = nodeIds.hasOwnProperty(qry) ? nodeIds[qry] : -1;
            }
          }
        // break; - not needed, since it's the last option
      }
      // return resolved index
      return idx;
    },

    //  return index of the resolved node reference, or -1 when it's invalid or unavailable from the given/current node
    vetIndexOf: function (qry, node) {
      var
        // alias self
        pkg = this,
        // get the index of the target node
        targetIdx = pkg.indexOf(qry, node);

      // if the target index exists (speed?)...
      if (~targetIdx) {
        // use the current node, when node is omitted
        node = node || pkg.nodes[pkg.tank.currentIndex];
        // return the target index or -1, based on whether the target is valid, given the trust status of the package or the restrictions of the current node
        return pkg.allowed() || node.canTgt(pkg.nodes[targetIdx]) ? targetIdx : -1;
      } else { // otherwise, when the index is invalid...
        // return faux no-index result
        return -1;
      }
    },

    // add a data-tracking-object to this package
    getDef: function (name, initialValue) {
      var
        // alias self
        pkg = this;

      // return false when name is invalid or an existing or new data tracking object
      return isDefNameValid(name) && (pkg.data.hasOwnProperty(name) ? pkg.data[name] : (pkg.data[name] = {
        name: name,
        values: arguments.length > 1 ? [initialValue] : []
      }));
    },

    // proceed towards the latest/current target
    // track - save point for reconciliation later
    go: function (trackTarget) {
      var
        // alias self
        pkg = this;

      // unpause this flow
      pkg.pause = 0;
      // clear the timer
      pkg.delTimer();
      // if there is a target to track...
      if (trackTarget && pkg.targets.length) {
        // add to traced target collection
        pkg.tgtTrace.unshift(pkg.targets[0]);
      }
      // exit when pending, or direct tank to the first target - returns the number of steps completed (or false when there is no target)
      return pkg.pending ? 0 : pkg.tank.go(pkg.targets[0]);
    },

    delTimer: function () {
      var
        // alias self
        pkg = this;

      // if there is an existing timer...
      if (pkg.delay.timer) {
        // clear any existing delay
        clearTimeout(pkg.delay.timer);
        // set to 0
        pkg.delay.timer = 0;
      }
    },

    // flag when the flow is allowed to perform trusted executions
    allowed: function () {
      // flag true when the current flow, or when active and unlocked
      return activeFlows[0] === this || (this.trust && !this.locked);
    },

    // calls .target() on the owning flow
    upOwner: function (stateQuery) {
      var
        // alias self
        pkg = this;

      // return the result of targeting the owner when present and the path is valid - pass the proxy and it's current status
      return pkg.owner && stateQuery !== '' && stateQuery !== -1 && pkg.owner.proxy.target(stateQuery, pkg.proxy, pkg.proxy.status());
    },

    // search store (or given store items) with the given criteria
    inStore: function (criteriaSet, itemStore) {
      var
        pkg = this;

      // with instances in the current store...
      return (itemStore || pkg.stores[0][0])
        // reduce to instances that match the given criteria
        .filter(function (pkgInst) {
          var
            // get the current state
            curState = pkgInst.nodes[pkgInst.tank.currentIndex],
            // get comparison values
            comparisonValues = [
              // 0 -   program
              pkgInst.nodes[1].value,
              // 1 - path
              curState.path,
              // 2 - state name
              curState.name,
              // 3 - state index
              curState.index
            ];

          // flag whether this core-instance satisfies the given criteria
          return criteriaSet.slice(0, 2).every(
              function (criterias, idx) {
                var
                  // the value to compare against each criteria option
                  comparisonValue = comparisonValues[idx];

                // for each filter criteria...
                return !criterias.length ||
                  criterias.some(idx == 1 ?
                    // search paths
                    function (criteria) {
                      // flag when this criteria matches the comparison value
                      return ~comparisonValue.indexOf(criteria);
                    } :
                    // match everything else
                    function (criteria) {
                      // flag when this criteria matches the comparison value
                      return criteria === comparisonValue;
                    }
                  );
              }
            ) && (
              // handle name/index testing separately
              !(criteriaSet[2].length || criteriaSet[3].length) ||
              [[], [], criteriaSet[2], criteriaSet[3]].some(function (criterias, idx) {
                var
                  // the value to compare against each criteria option
                  comparisonValue = comparisonValues[idx];

                // for each filter criteria...
                return criterias.some(idx == 1 ?
                    // search paths
                    function (criteria) {
                      // flag when this criteria matches the comparison value
                      return ~comparisonValue.indexOf(criteria);
                    } :
                    // match everything else
                    function (criteria) {
                      // flag when this criteria matches the comparison value
                      return criteria === comparisonValue;
                    }
                  );
              })
            );
        });
    },

    // rebuilds store caches after testing whether instance states have changed
    upStore: function () {
      var
        // alias self
        pkg = this,
        // the current storage tracking object
        store = pkg.stores[0],
        // loop var
        i;

      if (store) {
        // if any flows have changed their current state...
        if (
          // there is a cache of package instances, and...
          store[2][0] &&
          (
            // there are no instances, or...
            !store[2][0][0].length ||
            // any instance states have changed
            store[2][0][0].some(function (pkgInst, idx) {
              // flag true when the current state index does not match the cached state index
              return pkgInst.tank.currentIndex != store[2][0][1][idx];
            })
          )
        ) {
          // clear the cache
          store[2][0] = 0;
        }
        // if there is no cache for this config...
        if (!store[2][0]) {
          // starting from the last config and working backwards...
          for (i = store[1].length - 1; i > -1; i--) {
            // build cache set
            store[2][i] = [
              // 0 - instances that match this configs filter criteria
              pkg.inStore(
                // the filter criteria of this config
                store[1][i][1],
                // against the earlier config's cache or all items
                (store[2][i + 1] || store)[0]
              )
            ];
            // add remaining cache items
            store[2][i].push(
              // 1 - cache of indexes, for comparison later
              store[2][i][0].map(function (pkgInst) {
                return pkgInst.tank.currentIndex;
              }),
              // 2 - cache of instance proxies, when returning
              store[2][i][0].map(function (pkgInst) {
                return pkgInst.proxy;
              })
            );
          }
        }
      }
    }

  };

  // do something when the tank starts moving
  corePkgDef.onBegin = function (evtName) {
    var
      // alias this package
      pkg = this,
      // capture the delay callback (if any)
      delayFnc = pkg.delay.callback,
      // placeholder for node inquiries (if any)
      node;

    // add this package to the private collection
    activeFlows.unshift(pkg);
    // add proxy to the public collection
    corePkgDef.actives.unshift(pkg.proxy);
    // clear any timer
    pkg.delTimer();
    // clear callback
    pkg.delay.callback = 0;
    // if there was a delayed callback...
    if (delayFnc) {
      // trust api calls
      pkg.trust = 1;
      // execute the delay callback in scope of the proxy
      delayFnc.call(pkg.proxy);
      // untrust api calls
      pkg.trust = 0;
      // if the flow is now paused or pending...
      if (pkg.pause || pkg.pending) {
        // exit function
        return;
      }
    }
    // if not already updated and resuming the entry or exit of an update gate...
    if (!pkg.ownUp && (pkg.phase == 1 || pkg.phase == 2) && (node = pkg.nodes[pkg.tank.currentIndex]).upGate) {
      // update the owning flow that the _in/_out phase completed (before we leave this state)
      pkg.upOwner(node.upPath);
    }
  };

  // do something when the tank traverses a node
  corePkgDef.onTraverse = function (evtName, phase) {
    var
      // the package instance
      pkg = this,
      // alias tank
      tank = pkg.tank,
      // the node being traversed (prototyped, read-only value)
      node = pkg.nodes[tank.currentIndex];

    // if there is an out node...
    if (pkg.outNode) {
      // if this node has data configurations...
      if (node.data.length) {
        // descope datas in the outNode
        pkg.outNode.scopeData(1);
      }
      // if this node has a store configuration...
      if (pkg.outNode.store) {
        // remove store configs
        pkg.outNode.setStore(1);
      }
      // clear the outNode
      pkg.outNode = 0;
    }
    // based on the motion id...
    switch (phase) {
      case 1: // in
        // if the node specifies locking...
        if (node.lock) {
          // lock the flow
          pkg.locked = 1;
        }
        // if this node has daat configs...
        if (node.data.length) {
          // scope defined variables for this node
          node.scopeData();
        }
        // if this node has a store configuration...
        if (node.store) {
          // apply store configs
          node.setStore();
        }
      break;

      case 2: // out
        // if this node has an auto lock and the parent does not...
        if (node.lock && !node.plock) {
          // unlock (occurs before executing any _out callback)
          pkg.locked = 0;
        }
        // set the outNode to the current node
        pkg.outNode = node;
      break;
    }
    // capture this phase
    pkg.phase = phase;
    // re-init result
    pkg.result = undefined;
    // reset owner updated flag
    pkg.ownUp = 0;
    // if the tank no longer has a target...
    if (!~tank.targetIndex) {
      // if last targeted index matches the target being tracked...
      if (pkg.tgtTrace[0] === pkg.targets.shift()) {
        // note that this target has been reached and stop tracing it
        pkg.trail[pkg.trail.length] = pkg.tgtTrace.shift();
      }
    }
    // if traversing "on" a walk state...
    if (node.seq && !pkg.phase) {
      // if the last walk state matches the next target (if any)...
      if (pkg.targets[0] && pkg.targets[0] === node.seq.slice( -1 )[0]) {
        // prepend all but the last state in this node's walk sequence
        pkg.targets = node.seq.slice( 0, -1 ).concat( pkg.targets );
      } else { // otherwise, when merging will not cause adjacent duplicates...
        // prepend this node's walk sequence
        pkg.targets = node.seq.concat( pkg.targets );
      }
    }
    // if there is a function for this phase...
    if (node.fncs[phase]) {
      // trust api calls
      pkg.trust = 1;
      // note that we are calling this program function
      pkg.calls.push(node.index + '.' + phase);
      // execute function, in scope of the proxy - pass arguments when there are no more targets
      pkg.result = node.fncs[phase].apply(pkg.proxy, (pkg.targets.length ? [] : pkg.args));
      // untrust api calls
      pkg.trust = 0;
    }
    // if we are pending...
    if (pkg.pending) {
      // stop navigating
      tank.stop();
    }
    // if not already notified, and we're entering/exiting an update gate and the flow is not paused or pending...
    if (node.upGate && (phase == 1 || phase == 2) && !(pkg.pause || pkg.pending)) {
      // direct owner to this node's update path
      pkg.upOwner(node.upPath);
      // flag that the owner was updated for this phase
      pkg.ownUp = 1;
    }
  };

  // do something when the tank stops
  corePkgDef.onEnd = function (evtName) {
    var
      // alias self
      pkg = this,
      // alias tank
      tank = pkg.tank,
      // alias the parent flow, if any
      parentFlow = activeFlows[1],
      // flag when this flow is paused, pending, or not at the _on phase
      blocked = pkg.pause || pkg.pending || pkg.phase,
      // placeholder - the node navigation is ending on
      node = pkg.nodes[tank.currentIndex];

    // if not blocked and there are more targets...
    if (!blocked && pkg.targets.length) {
      // direct tank to the next state
      tank.go(pkg.targets[0]);
    } else { // otherwise, when blocked or there are no more targets...
      // if blocked...
      if (blocked) {
        // if this flow is not pending...
        if (!pkg.pending) {
          // assume/ensure it appears paused (since any package can stop the tank)
          pkg.pause = 1;
        }
        // if this state and that of an unknown parent flow are pendable...
        if (
            // there is a parent flow
            parentFlow
            // the parent flow's state is pendable
            && parentFlow.nodes[parentFlow.tank.currentIndex].pendable
            // the state of this flow is pendable
            && node.pendable
            // the parent flow is not already pended by this flow
            && !pkg.pendees[parentFlow.tank.id]
        ) {
          // increment the parents number of pending flows
          parentFlow.pending++;
          // index this parent by it's tank id
          pkg.pendees[parentFlow.tank.id] = parentFlow;
          // tell the parent's tank to stop
          parentFlow.tank.stop();
        }
      } else { // otherwise, when not blocked...
        
        // if the current node updates the owner, which has not already been updated...
        if (node.upOwn && !pkg.ownUp) {
          // update the owning flow
          pkg.upOwner(node.upPath);
          // flag that the owner has been updated - only when the owner is inactive (trust = 0)
          pkg.ownUp = !pkg.owner.trust;
          // if new targets were added (by the owning flow)...
          if (pkg.targets.length) {
            // exit now, so the loop can continue navigating
            return;
          }
        }
        
        // clear call arguments
        pkg.args = [];
        // clear calls array
        pkg.calls = [];
        // clear trail
        pkg.trail = [];
        // clear traced targets
        pkg.tgtTrace = [];
        // if there are pending (parent) flows...
        if (pkg.pendees.length) {
          // with each pending flow...
          pkg.pendees.forEach(function (pender) {
            // reduce the number of child flows for this pending parent flow
            pender.pending--;
          });
          // queue post-loop callback function
          tank.post(function () {
            // process and remove each parent flow
            pkg.pendees.splice(0).forEach(function (pender) {
              // if this parent has no more children and is not paused...
              if (!(pender.pending || pender.pause)) {
                // tell the parent to resume it's traversal
                pender.go();
              }
            });
          });
        }
      }
      // remove this flow from the private collection
      activeFlows.shift();
      // remove this flow's proxy from the public collection
      corePkgDef.actives.shift();
    }
  };

  // add method to determine if another node can be targeted from this node
  corePkgDef.node.canTgt = function (targetNode) {
    var
      // alias the restrict node (if any)
      restrictingNode = this.pkg.nodes[this.restrict];

    // return true if this node is not restricted, or when the targetNode is within the restricting node's path
    return !restrictingNode || targetNode.within(restrictingNode);
  };

  // add method to de/scope defined variables
  corePkgDef.node.scopeData = function (descope) {
    var
      // alias self (for closure)
      node = this,
      // alias the package containing this node
      pkg = node.pkg;

    // if there are defined variables...
    if (node.data.length) {
      // if descoping defined variables...
      if (descope) {
        // remove set of datas from the stack
        pkg.dataStack.shift();
      } else { // otherwise, when adding defined variables...
        // capture names defined by this node
        pkg.dataStack.unshift(node.data);
      }
      // with each data configuration object in this node...
      node.data.forEach(function (defCfg) {
        var
          // get the data tracking object with this name
          dto = pkg.getDef(defCfg.name);

        // if descoping defined variables...
        if (descope) {
          // remove current value from values
          dto.values.shift();
          // if no other values exist...
          if (!dto.values.length) {
            // remove the data tracking object
            delete pkg.data[defCfg.name];
          }
        } else { // otherwise, when scoping a data tracking object...
          // add new or copied value, based on the config
          dto.values.unshift(defCfg.use ? defCfg.value : dto.values[0]);
        }
      });
    }
  };

  /*
  Each store tracker is an array with the following structure:
  [
    [..]      // 0 : master items, collection of package instances
    [         // 1 : store configurations
      [       // 1 - 0 : store configuration
        [     // 1 - 0 - 0 : capture criteria
          [], // 1 - 0 - 0 - 0 : program criteria
          [], // 1 - 0 - 0 - 1 : paths criteria
          [], // 1 - 0 - 0 - 2 : state names criteria
          []  // 1 - 0 - 0 - 3 : state index criteria
        ],
        [     // 1 - 0 - 1 : filter criteria
          [], // 1 - 0 - 1 - 0 : program criteria
          [], // 1 - 0 - 1 - 1 : paths criteria
          [], // 1 - 0 - 1 - 2 : state names criteria
          []  // 1 - 0 - 1 - 3 : state index criteria
        ],
        0,    // 1 - 0 - 2 : capture limit
        1     // 1 - 0 - 3 : new store flag
      ]
    ],
    [         // 2 : cached results, collection of package instances, from corresponding filter configurations
      [       // 2 - 0 : cache set
        [..], // 2 - 0 - 0 : filtered package instances
        [..], // 2 - 0 - 1 : cached index of states for the filtered package instances
        [..]  // 2 - 0 - 2 : cached proxy objects for the filtered package instances
      ]
    ]
  ]
  */

  // add method to apply/remove store conifguration
  corePkgDef.node.setStore = function (remove) {
    var
      // alias self (for closures)
      node = this,
      // alias this node's store configuration
      storeConfig = node.store,
      // alias package containing this node
      pkg = node.pkg,
      // capture the current store tracking object (if any)
      currentStorageTracker = pkg.stores[0],
      // placeholder array, for temporary store configs
      ary = [];

    // if removing this node's store configuration...
    if (remove) {
      // if this configuration created a store...
      if (storeConfig[3]) {
        // remove the store tracking object
        pkg.stores.shift();
      } else { // otherwise, when this configuration was added to an existing store tracking object...
        // remove this configuration from the store tracking object
        currentStorageTracker[1].shift();
        // remove this configurations results from the cache
        currentStorageTracker[2].shift();
      }
    } else { // otherwise, apply this node's store configuration...
      // if creating a new store...
      if (storeConfig[3]) {
        // prepend a new storage tracker
        pkg.stores.unshift([
          // 0 - master set of items
          [],
          // 1 - store configurations (the first is the capture criteria, the rest are filter criteria)
          [storeConfig],
          // 2 - cache of results from each config - starting with 0
          []
        ]);
      } else { // otherwise, when adding to the current store tracker...
        // prepend this config (will serve as a filter)
        currentStorageTracker[1].unshift(storeConfig);
        // set empty cache for this filter configuration
        currentStorageTracker[2].unshift(0);
      }
    }
  };

  // add method to determine when this node is a descendant of the given/current node
  corePkgDef.node.within = function (nodeRef) {
    var
      // resolve the parent node to check
      parentNode = arguments.length ? (typeof nodeRef === 'object' ? nodeRef : this.pkg.nodes[nodeRef]) : this.pkg.nodes[this.pkg.tank.currentIndex];

    // return whether the current node is within the parent node - auto-pass when parentNode is the flow state
    return parentNode ? parentNode !== this && (!parentNode.index || !this.path.indexOf(parentNode.path)) : false;
  };

  // add method to return callbacks to this flow's states
  corePkgDef.proxy.cb = function (arg) {
    var
      // get core package instance
      pkg = corePkgDef(this),
      // alias nodes
      states = pkg.nodes,
      // the type of the given argument
      argType = typeof arg;

    // if not passed anything...
    if (!arguments.length) {
      // return callback for the program (root) state
      return states[1].cb;
    } else if (arg === true) { // or, when passed `true`...
      // return callback for the current state
      return states[pkg.tank.currentIndex].cb;
    } else if (smellsLikeAStateQuery(arg)) { // or, when passed something like a state query...
      // if the query is a valid path or index...
      if (pkg.nodeIds.hasOwnProperty(arg) || (argType === 'number' && pkg.nodes[arg])) {
        // return the matched cb member
        return pkg.nodes[argType === 'number' ? arg : pkg.nodeIds[arg]].cb;
      }
      // if there is no callback with for this query...
      if (!pkg.cbs.hasOwnProperty(arg)) {
        // add callback to cache
        pkg.cbs[arg] = function () {
          // target the query path with the given arguments
          return pkg.proxy.target.apply(pkg.proxy, [arg].concat([].slice.call(arguments)));
        };
      }
      // return callback from cache
      return pkg.cbs[arg];
    }
    // (otherwise) flag bad arguments
    return false;
  };

  // add method to 
  corePkgDef.proxy.query = function (node) {
    var
      // get package instance
      pkg = corePkgDef(this),
      // alias for minification
      args = arguments,
      // node indice resolved by query
      nodes = [];

    // return false, a string or array of strings, based on whether a single node reference fails
    return (
      // at least one parameter
      args.length
      // all parameters resolve to nodes
      && [].slice.call(arguments).every(function (nodeRef) {
        var
          // resolve index of this reference
          idx = pkg.vetIndexOf(nodeRef),
          // default result
          result = 0;
        // if this index is not -1...
        if (~idx) {
          // capture the absolute path for this node
          nodes.push(pkg.nodes[idx].path);
          // flag that this element passed
          result = 1;
        }
        // return the result
        return result;
      })
    ) ? (nodes.length > 1 ? nodes : nodes[0]) : false;
  };

  // access and edit the locked status of a flow
  corePkgDef.proxy.lock = function (set) {
    var
      // alias package instance
      pkg = corePkgDef(this);

    // if arguments were passed...
    if (arguments.length) {
      // if allowed to change the lock status...
      if (pkg.allowed()) {
        // set new lock state
        pkg.locked = set ? 1 : 0;
        // flag success in changing the locked property of this flow
        return true;
      }
      // (otherwise) flag failure to change lock status
      return false;
    }
    // (otherwise) return current locked status
    return !!pkg.locked;
  };

  // set trust flag before and after execution
  corePkgDef.proxy.bless = function (fnc) {
    var
      // placeholder for package instance
      pkg = corePkgDef(this);

    // if allowed and given a function...
    if (pkg.allowed() && typeof fnc === 'function') {
      // return "blessed" function
      return function () {
          var
            // capture initial trust value
            currentTrustValue = pkg.trust,
            // capture initial lock value
            currentLockValue = pkg.locked,
            // flag when we're already in a blessed function by testing type of the locked property
            alreadyInBlessedFunction = typeof pkg.locked === 'boolean',
            // placeholder to capture execution result
            rslt;

          // ensure we're executing in a trusted environment
          pkg.trust = 1;
          // if not already in a blessed function, and we're currently locked...
          if (!alreadyInBlessedFunction && currentLockValue) {
            // ensure we're unlocked - set to boolean, since it's not set like this anywhere else
            pkg.locked = false;
          }
          // call and capture function result, pass along scope and args
          rslt = fnc.apply(this, arguments);
          // restore trust value
          pkg.trust = currentTrustValue;
          // if not already in a blessed function and the lock value is still a boolean (which means lock() was not called)...
          if (!alreadyInBlessedFunction && typeof pkg.locked === 'boolean') {
            // restore original lock value
            pkg.locked = currentLockValue;
          }
          // return result of function call
          return rslt;
        }
    }
    // (otherwise) return false
    return false;
  };

  // access and edit scoped data variables for a node
  corePkgDef.proxy.data = function (name, value) {
    var
      // get package
      pkg = corePkgDef(this),
      // get number of arguments passed
      argCnt = arguments.length,
      // loop data
      d,
      // value to return (default is false)
      rtn = false;

    // if passed arguments...
    if (argCnt) {
      // based on the type of name...
      switch (typeof name) {
        case 'string':
          // if the name is valid...
          if (isDefNameValid(name)) {
            // resolve data tracker
            d = pkg.getDef(name);
            // if a value was passed...
            if (argCnt > 1) {
              // set the current value
              d.values[0] = value;
              // flag success with setting the value
              rtn = true;
            } else { // otherwise, when no value is passed...
              // return the current value
              rtn = d.values[0];
            }
          }
        break;

        case 'boolean':
          // if only given one truthy argument...
          if (name && argCnt == 1) {
            // with each data configuration from the last scoped node...
            rtn = pkg.dataStack[0].map(function (definedVariableConfiguration) {
              // capture name
              return definedVariableConfiguration.name;
            });
          }
        break;

        case 'object':
          // if object is not null...
          if (name) {
            // capture keys
            d = Object.keys(name);
            // if every name is valid...
            if (
              d.every(function (key) {
                // test name in batch
                return isDefNameValid(key);
              })
            ) {
              // with each name/value pair...
              d.forEach(function (key) {
                // make recursive call to set this name/value pair
                pkg.proxy.data(key, name[key]);
              });
              // flag batch success
              rtn = true;
            }
          }
        break;
      }
    } else { // otherwise, when passed no arguments...
      // prepare to return an array
      rtn = Object.keys(pkg.data);
      // sort defined variable names
      rtn.sort();
    }
    // return result of call
    return rtn;
  };

  // access and edit the arguments passed to traversal functions
  corePkgDef.proxy.args = function (idx, value) {
    var
      // get package
      pkg = corePkgDef(this),
      // alias arguments from this package
      pkgArgs = pkg.args,
      // get number of arguments passed
      argCnt = arguments.length,
      // get type of first argument
      idxType = typeof idx;

    // if getting a single value, or setting arguments on a permitted or unlocked flow...
    if (argCnt === 1 || (argCnt && (pkg.allowed() || !pkg.locked))) {
      // if idx is an array...
      if (idx instanceof Array) {
        // replace args with a copy of the idx array
        pkg.args = [].concat(idx);
        // flag success with setting new argument values
        return true;
      } else if (idxType === 'number' && !isNaN(idx) && idx >= 0) { // or, when idx is a valid index...
        // if a value was passed...
        if (argCnt > 1) {
          // if the value is undefined and the last index was targeted...
          if (value === undefined && idx === pkgArgs.length - 1) {
            // remove the last index
            pkgArgs.pop();
          } else { // otherwise, when not removing the last index
            // set the value of the target index
            pkgArgs[idx] = value;
          }
          // (finally) flag success with setting or removing the index
          return true;
        }
        // (otherwise) return the value of the targeted index (could be undefined)
        return pkgArgs[idx];
      }
    } else if (!argCnt) { // otherwise, when given no arguments...
      // return a copy of the arguments array (available to locked flows)
      return [].concat(pkgArgs);
    }
    // send false when sent arguments are invalid or setting is prohibited (i.e., the flow is locked)
    return false;
  };

  // add method to program api
  corePkgDef.proxy.target = function (qry) {
    var
     // alias this package
      pkg = corePkgDef(this),
      // resolve a node index from qry, or nothing if allowed or unlocked
      tgtIdx = (pkg.allowed() || !pkg.locked) ? pkg.vetIndexOf(qry) : -1;

    // if the destination node is valid, and the flow can move...
    if (~tgtIdx) {
      // capture arguments after the tgt
      pkg.args = [].slice.call(arguments).slice(1);
      // reset targets array
      pkg.targets = [tgtIdx];
      // navigate towards the targets (unpauses the flow)
      pkg.go(1);
    } else { // otherwise, when the target node is invalid...
      // return false
      return false;
    }
    // return based on call path
      // when internal (via a program-function)
        // true when there are no pending child flows (otherwise, false)
      // when external (outside a program-function)
        // false when this flow is paused or exits outside of phase 0
        // true when the traversal result is undefined - otherwise the traversal result is returned
    return pkg.allowed() ? !pkg.pending : ((pkg.phase || pkg.pause) ? false : pkg.result === undefined || pkg.result);
  };

  /**
  Target, add, or insert nodes to traverse, or resume towards the last target node.
  Returns false when there is no new destination, a waypoint was invalid, or the flow was locked or pending.

  Forms:
    go() - resume traversal
    go(waypoints) - add or insert waypoints
  **/
  corePkgDef.proxy.go = function (waypoint) {
    var
      // alias self
      pkg = corePkgDef(this),
      // capture current paused status
      wasPaused = pkg.pause,
      // collection of targets to add to targets
      waypoints = [],
      // success status for this call
      result = 0;

    // if...
    if (
      // allowed or unlocked and ...
      (pkg.allowed() || !pkg.locked) &&
      // any and all node references are valid...
      [].slice.call(arguments).every(function (nodeRef) {
        var
          // resolve index of this reference
          idx = pkg.vetIndexOf(nodeRef);

        // add to waypoints
        waypoints.push(idx);
        // return true when the resolved index is not -1
        return ~idx;
      })
    ) {
      // if there are waypoints...
      if (waypoints.length) {
        // if the last waypoint matches the first target...
        while (waypoints[waypoints.length - 1] === pkg.targets[0]) {
          // remove the last waypoint
          waypoints.pop();
        }
        // prepend (remaining) waypoints to targets
        pkg.targets = waypoints.concat(pkg.targets);
      }
      // capture result of move attempt or true when paused
      result = pkg.go(1) || wasPaused;
    }
    // return result as boolean
    return !!result;
  };

  // delay traversing
  corePkgDef.proxy.wait = function () {
    var
      // get package
      pkg = corePkgDef(this),
      // alias arguments
      args = arguments,
      // capture number of arguments passed
      argLn = args.length,
      // flag when no action will be taken after a delay
      noAction = argLn < 2,
      // capture first argument as action to take after the delay, when more than one argument is passed
      delayFnc = noAction ? 0 : args[0],
      // flag when the delay is a function
      isFnc = typeof delayFnc === 'function',
      // get node referenced by delayFnc (the first argument) - no vet check, since this would be a priviledged call
      delayNodeIdx = pkg.indexOf(delayFnc),
      // use last argument as a time
      time = args[argLn - 1],
      // indicates result of call
      result = 0;

    // if allowed and the the argument's are valid...
    if (pkg.allowed() && (!argLn || (time >= 0 && typeof time === 'number' && (noAction || ~delayNodeIdx || isFnc)))) {
      // flag that we've paused this flow
      pkg.pause = 1;
      // stop the tank
      pkg.tank.stop();
      // clear the timer
      pkg.delTimer();
      // set delay to truthy value, callback, or traversal call
      pkg.delay.timer = argLn ?
        setTimeout(
          function () {
            // if there is a delay action and it's a node index...
            if (!noAction && ~delayNodeIdx) {
              // target this node index
              pkg.proxy.target(delayNodeIdx);
            } else { // otherwise, when there is no delay, or the action is a callback...
              // if there is a callback function...
              if (isFnc) {
                // set delay callback (fires during the "begin" event)
                pkg.delay.callback = delayFnc;
              }
              // traverse towards the current target
              pkg.go();
            }
          },
          ~~time // number of milliseconds to wait (converted to an integer)
        ) :
        1; // set to 1 to pause indefinitely
      // indicate that this flow has been delayed
      result = 1;
    }
    // return whether this function caused a delay
    return !!result;
  };

  // retrieve the flow that owns this one, if any
  corePkgDef.proxy.owner = function () {
    var
      // alias this flow's core-instance
      pkg = corePkgDef(this);

    // return the owning flow's proxy or true when external, otherwise return false when not owned
    return pkg.owner && (pkg.allowed() ? pkg.owner.proxy : true) || false;
  };

  /*
  query, add or delete flows from the current store

  This method has a command syntax, when given one or two arguments.

    # Simple Query

        this.store()

      Returns the currently filtered items in the store.

    # Add/Remove Flows

        this.store(storeItems, removeFlag)

      Where _storeItems_ is an array or one flow instances.
      This command is prohibited externally.
      If an array or one flow instance is given, they will be added to the master store.
      Returns true/false.

    # Filter Stored Items
        
        this.store(criteria, searchMaster)

      Only returns number of items when called externally.
      Where _criteria_ is an object or array that is not all flow instances.
      Searching the master is prohibited externally.
      If a non-flow instance or array of mixed items is given, they will be used to filter the local store.
      Returns an array of flow instances.

  */
  corePkgDef.proxy.store = function () {
    var
      // get arguments as an array
      args = [].slice.call(arguments),
      // alias this flow's core-instance
      pkg = corePkgDef(this),
      // number of custom filter packages
      pkgs,
      // the current store
      store = pkg.stores[0],
      // placeholder for user criteria
      userCriteria,
      // caches result of pkg.allowed()
      isAllowed = pkg.allowed(),
      // number of changes made to the master store
      storeChanged = 0,
      // the flag for the given command - default is false
      commandFlag = 0;

    // if given arguments...
    if (args.length) {
      // if the first argument is an array, or there are two arguments and the second is a boolean....
      if (args[0] instanceof Array || (args.length === 2 && typeof args[1] === 'boolean')) {
        // set command flag to absence or value of second argument
        commandFlag = !!args[1];
        // use first argument as command set - flattens array
        args = [].concat(args[0]);
      }
      // if all args are flow instances...
      if (
        args.length &&
        args.every(function (arg) {
          return arg instanceof Flow;
        })
      ) {
        // if allowed to add/remove flow instances...
        if (isAllowed) {
          // if deleting...
          if (commandFlag) {
            // with each instance...
            args.forEach(function (flow) {
              var
                // retrieve this flow's corresponding core-instance
                pkgInst = corePkgDef(flow),
                // get index of this instance (if any)
                pkgIndex = store[0].indexOf(pkgInst);

              // if in the store...
              if (~pkgIndex) {
                // remove from store
                store[0].splice(pkgIndex, 1);
                // flag that a store item changed
                storeChanged++;
              }
            });
          } else { // otherwise, when adding...
            // with each instance...
            args.forEach(function (flow) {
              var
                // retrieve this flow's corresponding core-instance
                pkgInst = corePkgDef(flow),
                // get index of this instance (if any)
                pkgIndex = store[0].indexOf(pkgInst);

              // if not already in items...
              if (!~pkgIndex) {
                // add to store
                store[0].push(pkgInst);
                // flag that a store item changed
                storeChanged++;
              }
            });
          }
          // if anything changed, reset all caches...
          if (storeChanged) {
            // clear all caches
            store[2] = [];
          }
          // flag success with executing action (regardless of whether store items changed)
          return true;
        } else { // otherwise, when prohibited...
          // flag denial of action - throw?
          return false;
        }
      } else if (store) { // or, when filtering and there is a store...
        // if not filtering from the master store...
        if (!commandFlag) {
          // update caches
          pkg.upStore();
        } else if (!isAllowed) { // or, when filtering from the master store and not allowed...
          // flag denial of action - throw?
          return false;
        }
        // define user criteria sets
        userCriteria = [ [], [], [], [] ];
        // with each argument...
        args.forEach(function (arg) {
          // update user criteria
          setStoreCriteria(userCriteria, arg);
        });
        // capture proxies of instances filtered from the master or cached store...
        pkgs = pkg.inStore(userCriteria, commandFlag ? store[0] : store[2][0][0]);
        // if allowed...
        if (isAllowed) {
          // return proxies
          return pkgs.map(function (pkgInst) {
            return pkgInst.proxy;
          });
        } else { // otherwise, when not allowed access to flows
          // return count of filtered items
          return pkgs.length;
        }
      } else if (!isAllowed && commandFlag) { // or, when filtering and there is no store...
        // flag denial of filter
        return false;
      }
    } else if (store) { // or, when given no arguments and there is a store...
      // check and update store caches
      pkg.upStore();
      // if allowed...
      if (isAllowed) {
        // return copy of proxies
        return store[2][0][2].concat();
      } else { // otherwise, when not allowed access to flows
        // return count of proxies
        return store[2][0][2].length;
      }
    }
    // (otherwise) when not passed arguments and there is no store, return 0 (this would only occur when called externally)
    return isAllowed ? [] : 0;
  };

  // return an object with status information about the flow and it's current state
  corePkgDef.proxy.status = function () {
    var
      // get the package instance
      pkg = corePkgDef(this),
      // alias the current node
      currentNode = pkg.nodes[pkg.tank.currentIndex];

    // callback-function for retrieving the node index
    function getPathFromIndex(idx) {
      return pkg.nodes[idx].path;
    }

    // return the collection of keys for the node object
    return {
      trust: !!pkg.trust,
      permit: !!pkg.allowed(),
      loops: Math.max((pkg.calls.join().match(new RegExp('\\b' + currentNode.index + '.' + pkg.phase, 'g')) || []).length - 1, 0),
      depth: currentNode.depth,
      paused: !!pkg.pause,
      pending: !!pkg.pending,
      pendable: !!currentNode.pendable,
      targets: pkg.targets.map(getPathFromIndex),
      trail: pkg.trail.map(getPathFromIndex),
      path: currentNode.path,
      index: currentNode.index,
      phase: corePkgDef.events[pkg.phase],
      state: currentNode.name
    };
  };
  /*
  Other packages should override this method in the following manner, to add and edit their own status properties:

  //example--------/
  SomePkgDef.proxy.status = function () {
    var
      stats = SomePkgDef.getSuper('status').call(this) || {},
      somePkgInst = SomePkgDef(this);
    stats.someProperty = somePkgInst.someValueToReport;
    return stats;
  };
  /--------example//

  Using .getSuper('status') allows earlier packages to include their status values.
  */
  // expose Flow namespace
  (inCommonJsEnv ? exports : window).Flow = Flow;
}(typeof require !== 'undefined', Array, this);