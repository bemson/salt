/*!
 * Flow v0.3.5
 * http://github.com/bemson/Flow/
 *
 * Dependencies:
 * - Panzer v0.2.5 / Bemi Faison (c) 2012 / MIT (http://github.com/bemson/Panzer/)
 * - genData v2.0.0 / Bemi Faison (c) 2012 / MIT (http://github.com/bemson/genData/)
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
    Flow = getFromEnvironment('Panzer').Panzer.create()
    // get genData from environment
    , genData = getFromEnvironment('genData').genData
    // define the "core" package
    , corePkgDef = Flow.pkg('core')
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
    , generateDataConfigurationObjects = genData.spawn(function (name, value, parent, dataset, flags, shared) {
      var
        // alias self
        data = this
        // flag when this item will be a data configuration
        , keep = 1
        // data configuration object
        , obj = {
          // name of data
          name: data.name
          // initial data value
          , value: data.value
          // flag to use this value (true by default)
          , use: 1
        }
      ;
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
        if (isDataNameValid(obj.name)) {
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
    })
    // return path-tokens from a given string
    , generateTokens = genData.spawn(function (name, value, parent, dataset, flags) {
      var
        // alias self
        data = this
        // shorthand forward-slash character
        , slash = '/'
      ;
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
    })
    // collection of active flows
    , activeFlows = []
    // aliased for minification
    , arrayPrototype = Array.prototype
  ;

  // version string
  Flow.version = '0.3.5';

  // return a given namespace, based on whether in a browser or CommonJS environment
  function getFromEnvironment(namespace) {
    return inCommonJsEnv ? require(namespace) : window;
  }

  // returns true when the argument is a valid data name
  function isDataNameValid(name) {
    return name != null && /\w/.test(name);
  }

  // edits store configuration based on given value
  function addStoreConfig(store, value, givenType) {
    // based on the attribute value type...
    switch (givenType || typeof value) {

      // filter/capture matching state/path (based on presence of forward-slash)
      case 'string':
        // add value to array
        store[~value.indexOf('/') ? 'paths' : 'states'].push(value);
      break;

      // filter/capture up to given limit
      case 'number':
        // ensure limit is rounded and absolute
        store.limit = Math.abs(~~value);
      break;

      case 'object':
          // add this program to the filter
          store.prgms.push(value);
      break;

      // declare new collection with blanket capture or ignore
      case 'boolean':
        // set capture to boolean - indicates whether this state captures or not
        store.capture = value;
      break;
    }
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

  // pattern for identifying attribute keys
  corePkgDef.attributeKey = /^_/;

  // pattern for identifying invalid keys
  corePkgDef.invalidKey = /^\W+$|^toString$|^[@\[]|[\/\|]/;

  // initialize the package instance with custom properties
  // only argument is the object passed after the program when calling "new Flow(program, extraArg)"
  corePkgDef.init = function (cfg) {
    // init vars
    var
      // alias self
      pkg = this
      // flag when an owner is available
      , activeFlow = activeFlows[0]
      // flag indicates when the program wants an owner
      , childWantsToBind
    ;
    // collection of arguments for traversal functions
    pkg.args = [];
    // collection of node calls made while traversing
    pkg.calls = [];
    // collection of nodes encountered while traversing
    pkg.route = [];
    // data collection
    pkg.data = {};
    // init delay object
    pkg.delay = {};
    // collection of stores
    pkg.stores = [];
    // collection of cached values
    pkg.cache = {
      indexOf: {} // token query cache
    };
    // flag when api calls are trusted
    pkg.trust = 0;
    // init locked flag
    pkg.locked = 0;
    // init index of node paths
    pkg.nodeIds = {};
    // the number of child flows fired by this flow's program functions
    pkg.pending = 0;
    // collection of parent flow references
    pkg.pendees = [];
    // collection of targeted nodes
    pkg.targets = [];
    // identify the initial phase for this flow, 0 by default
    pkg.phase = 0;
    // flags when the _in or _out phases have notified the owning flow (if any)
    pkg.ownUp = 0;
    // set name of first node name to _flow
    pkg.nodes[0].name = '_flow';
    // set name of second node
    pkg.nodes[1].name = '_program';
    // initialize each node...
    pkg.nodes.forEach(function (node, idx) {
      var
        // capture parent (undefined for the first node)
        parent = pkg.nodes[node.parentIndex]
        // alias node attributes
        , attributes = node.attributes
      ;
      // cache this nodes index by it's unique path
      pkg.nodeIds[node.path] = idx;
      // add reference to the package-instance containing this node
      node.pkg = pkg;
      // set pendable flag, (true by default, and otherwise inherited when the parent is not pendable)
      node.pendable = (parent && !parent.pendable) ? 0 : (attributes.hasOwnProperty('_pendable') ? !!node.attributes._pendable : 1);
      // set root to default index or self, based on _root attribute
      node.root = idx < 2 ? 1 : attributes._root && node.index || parent.root;
      // set restrict node index, based on the "_restrict" attribute or the parent's existing restriction
      node.restrict = attributes.hasOwnProperty('_restrict') ? attributes._restrict && node.index || -1 : parent && parent.restrict || -1;
      // set lock to boolean equivalent of attribute
      node.lock = !!attributes._lock;
      // set default for whether this node updates or is an update gate
      node.upOwn = node.upGate = 0;
      // if an owning flow is available...
      if (activeFlow) {
        // if there is a valid _owner attribute...
        if (attributes.hasOwnProperty('_owner')) {
          // if the attribute is valid...
          if (typeof attributes._owner == 'string' || typeof attributes._owner == 'number') {
            // flag that this child flow wants an owner
            childWantsToBind = 1;
            // flag that this node is should update an owning package, also when it's entered and exited
            node.upOwn = node.upGate = 1;
            // set (new) owner callback path
            node.upPath = attributes._owner;
          }
        } else if (parent && parent.hasOwnProperty('upPath')) { // or, if the parent exists and has an upPath property...
          // flag that this is an update state
          node.upOwn = 1;
          // set the upPath to the parent
          node.upPath = parent.upPath;
        }
      }

      // if this node has a _store attribute...
      if (attributes.hasOwnProperty('_store')) {
        // init store configuration object
        node.store = {
          // filter/capture instances with these programs
          prgms: [],
          // filter/capture instances with these paths
          paths: [],
          // filter/capture instances at these states
          states: [],
          // limit store to this number of captured instances
          limit: 0,
          // specify that this config does not capture (by default)
          capture: 0,
          // set filtering to true (overriden when capture is falsy, ignored when capture is truthy)
          filter: 1,
          // specify when a new collection should be created
          scope: 1
        };
        // if the attribute is an object...
        if (typeof attributes._store == 'object') {
          // if an array...
          if (attributes._store instanceof Array) {
            // with each element...
            attributes._store.forEach(function (filter) {
              // add to the store config
              addStoreConfig(node.store, filter);
            });
          } else { // otherwise, when an object literal (or any other object)...
            // if there is a programs key...
            if (attributes._store.hasOwnProperty('programs')) {
              // add collection of programs
              node.store.prgms = [].concat(attributes._store.programs);
            }
            // if there is a states key...
            if (attributes._store.hasOwnProperty('states')) {
              // add collection of states
              node.store.states = [].concat(attributes._store.states);
            }
            // if there is a paths key...
            if (attributes._store.hasOwnProperty('paths')) {
              // add collection of paths
              node.store.paths = [].concat(attributes._store.paths);
            }
            // if limit is present and numeric...
            if (attributes._store.hasOwnProperty('limit') && typeof attributes._store.limit == 'number') {
              // add to config - specify type
              addStoreConfig(node.store, attributes._store.limit, 'number');
            }
            // if the capture property is given...
            if (attributes._store.hasOwnProperty('capture')) {
              // add to config
              node.store.capture = !!attributes._store.capture;
            }
            // if the scope property is given...
            if (attributes._store.hasOwnProperty('scope')) {
              // add boolean equivalent to config
              node.store.scope = !!attributes._store.scope;
            }
          }
        } else { // otherwise, when the attribute is not an object...
          // add to config
          addStoreConfig(node.store, attributes._store);
        }
        // flag that this state has the first store config
        node.firstStore = 1;
        // if capture was set...
        if (node.store.capture !== 0) {
          // set filtering to false
          node.store.filter = 0;
        }
        // if filter and capture are false...
        if (!node.store.capture && !node.store.filter) {
          // set scope to true
          node.store.scope = 1;
        }
        // if this is the first store config...
        if (!parent.firstStore) {
          // force capture and scope if this is the first store for this branch of the program
          node.store.capture = node.store.scope = 1;
        }
      } else { // otherwise, when there is no _store attribute...
        // flag that this node does not have a store configuration
        node.store = 0;
        // pass thru the first-store config
        node.firstStore = parent ? parent.firstStore : 0;
      }

      // capture when the parent lock property is true
      node.plock = parent ? parent.lock : 0;
      // define map function - a curried call to .target()
      node.map = function () {
        var
          // capture any arguments
          args = [].slice.call(arguments)
        ;
        // prepend this node's index as the target
        args.unshift(idx);
        // invoke the proxies target method, pass along arguments
        return pkg.proxy.target.apply(pkg.proxy, args);
      };
      // override toString method of map
      node.map.toString = function () {
        // return thes node's index
        return node.path;
      };
      // add data configurations for this node
      node.data = generateDataConfigurationObjects(attributes._data);
      // if data configs exist...
      if (node.data.length) {
        // capture own data member as the data authority
        node.dataAuth = node.data;
      } else { // otherwise, when no data objects are resolved for this state...
        // capture the parent's data authority or an empty array
        node.dataAuth = parent ? parent.dataAuth : [];
      }
      // if this node's index is not 0...
      if (node.index) {
        // append to parent's map function
        parent.map[node.name] = node.map;
      }
      // define array to hold traversal functions for each traversal name...
      node.fncs = corePkgDef.events.map(function (name) {
        name = '_' + name;
        //  set traversal function to 0 or the corresponding attribute key (when a function)
        return typeof attributes[name] === 'function' ? attributes[name] : 0;
      });
      // if there is no _on[0] function and this node's value is a function...
      if (!node.fncs[0] && typeof node.value === 'function') {
        // use as the _on[0] traversal function
        node.fncs[0] = node.value;
      }
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
      // if there is an active store...
      if (activeFlow.stores.length && activeFlow.stores[0].active[0]) {
        // pass instance to the active flow for storing
        activeFlow.store(pkg);
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
        // flag when...
        return pkg
          // this flow is in a trusted state (i.e., executing)
          .trust ||
          // or,
          (
            // this flow is dormant but being checked by another flow...
            activeFlows.length &&
            // which has permission...
            ~cfg.cedeHosts.indexOf(activeFlows[0].hostKey)
          );
      };
    }
  };

  // define prototype of any package instances
  corePkgDef.prototype = {
    // vet and capture instances to the current store - auto-accept flow-instances
    store: function (inst) {
      var
        // alias self
        pkg = this,
        // alias the current store
        currentStore = pkg.stores[0],
        // generate random delimited
        randomDelimiter = Math.random(),
        // capture paths
        instPaths = Object.keys(inst.nodeIds).join(randomDelimiter),
        // capture states
        instStates = inst.nodes.map(function (node) {
          return node.name;
        }).join(randomDelimiter)
      ;
      // if the instance meets the store criteria...
      if (
        // the instance matches the required program (if any)...
        (
          !currentStore.prgms.length ||
          currentStore.prgms.some(function (prgm) {
            return inst.nodes[0].value === prgm
          })
        ) &&
        // the instance contains or matches the require path (if any)...
        (
          !currentStore.paths.length ||
          currentStore.paths.some(function (storePath) {
            // return true when the test path is within the available paths
            return ~instPaths.indexOf(storePath);
          })
        ) &&
        // the instance contains or matches the required state (if any)...
        (
          !currentStore.states.length ||
          currentStore.states.some(function (storeState) {
            // return true when the test path is within the available paths
            return ~instStates.indexOf(storeState);
          })
        )
      ) {
        // add the instance to this store
        currentStore.items.push(inst);
        // if at limit for this store...
        if (currentStore.limits[0] < currentStore.items.length) {
          // remove oldest item
          currentStore.items.shift();
        }
      }
    },
    // adds store tracking object to this package's stores array
    addStore: function (storeConfig) {
      // prepend store tracking object
      this.stores.unshift({
        // copy capture details
        prgms: storeConfig.prgms.concat(),
        paths: storeConfig.paths.concat(),
        states: storeConfig.states.concat(),
        // begin with initial limit
        limits: [storeConfig.limit],
        // collection of captured instances
        items: [],
        // collection of (view) filters
        filters: [],
        // collection of on/off states - on by default
        active: [storeConfig.capture]
      });
    },
    // return index of the node resolved from a node reference
    /*
    qry - (string|function.toString()|number|object.index) which points to a node
    node - object - the node to begin any dynamic referencing
    */
    indexOf: function (qry, node) {
      var
        // alias self
        pkg = this
        // alias for minification and performance
        , nodes = pkg.nodes
        // alias for minification and performance
        , nodeIds = pkg.nodeIds
        // the untokenized portion of a tokenized query
        , qryLeaf
        // the node to query from, when parsing tokens
        , qryNode
        // flags when the query begins with a @program or @flow token
        , isAbsQry
        // collection of individual tokens (extracted from the query)
        , tokens
        // the token being parsed
        , token
        // the index to return for the resolved node (default is -1, indicates when the node could not be found)
        , idx = -1
      ;
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
                        // if the token is not empty..
                        if (token.value) {
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
        pkg = this
        // get the index of the target node
        , targetIdx = pkg.indexOf(qry, node)
      ;
      // use the current node, when node is omitted
      node = node || pkg.nodes[pkg.tank.currentIndex];
      // return the target index or -1, based on whether the target is valid, given the trust status of the package or the restrictions of the current node
      return (~targetIdx && (pkg.allowed() || node.canTgt(pkg.nodes[targetIdx]))) ? targetIdx : -1;
    },
    // add a data-tracking-object to this package
    getData: function (name, initialValue) {
      var
        // alias self
        pkg = this
      ;
      // return false when name is invalid or an existing or new data tracking object
      return isDataNameValid(name) && (pkg.data.hasOwnProperty(name) ? pkg.data[name] : (pkg.data[name] = {
        name: name,
        values: arguments.length > 1 ? [initialValue] : []
      }));
    },
    // proceed towards the latest/current target
    go: function () {
      var
        // alias self
        pkg = this
      ;
      // unpause this flow
      pkg.pause = 0;
      // clear the timer
      pkg.delTimer();
      // exit when pending, or direct tank to the first target - returns the number of steps completed (or false when there is no target)
      return pkg.pending ? 0 : pkg.tank.go(pkg.targets[0]);
    },
    delTimer: function () {
      var
        // alias self
        pkg = this
      ;
      // if there is an existing timer...
      if (pkg.delay.timer) {
        // clear any existing delay
        clearTimeout(pkg.delay.timer);
        // set to 0
        pkg.delay.timer = 0;
      }
    },
    // returns current trust state - can be overriden when the parent flow's hostkey matches an item in the called flow's cedeHosts array
    // this method is overriden at intialization
    allowed: function () {
      return this.trust;
    },
    // calls .target() on the owning flow
    upOwner: function (stateQuery) {
      var
        // alias self
        pkg = this
      ;
      // return the result of targeting the owner when present - pass the proxy and it's current status
      return pkg.owner && pkg.owner.proxy.target(stateQuery, pkg.proxy, pkg.proxy.status());
    }
  };

  // do something when the tank starts moving
  corePkgDef.onBegin = function (evtName) {
    var
      // alias this package
      pkg = this
      // capture the delay callback (if any)
      , delayFnc = pkg.delay.callback
      // placeholder for node inquiries (if any)
      , node
    ;
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
      pkg = this
      // alias tank
      , tank = pkg.tank
      // the node being traversed (prototyped, read-only value)
      , node = pkg.nodes[tank.currentIndex]
    ;
    // if there is an out node...
    if (pkg.outNode) {
      // if this node has data configs...
      if (node.data.length) {
        // descope data in the outNode
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
          // scope data for this node
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
    // if the current index is not the same as the last one in the route...
    if (node.index !== pkg.route.slice(-1)[0]) {
      // add index to the route
      pkg.route.push(node.index);
    }
    // if the tank no longer has a target...
    if (!~tank.targetIndex) {
      // remove this target node
      pkg.targets.shift();
    }
    // if there is a function for this phase...
    if (node.fncs[phase]) {
      // trust api calls
      pkg.trust = 1;
      // note that we are calling this program function
      pkg.calls.push(node.index + '.' + phase);
      // execute function, in scope of the proxy - pass arguments when there are no more targets
      pkg.result = node.fncs[phase].apply(pkg.proxy, (pkg.targets.length) ? [] : pkg.args);
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
      pkg = this
      // alias tank
      , tank = pkg.tank
      // alias the parent flow, if any
      , parentFlow = activeFlows[1]
      // flag when this flow is paused, pending, or not at the _on phase
      , blocked = pkg.pause || pkg.pending || pkg.phase
      // placeholder - the node navigation is ending on
      , node = pkg.nodes[tank.currentIndex]
    ;

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
        // clear route
        pkg.route = [];
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
      restrictingNode = this.pkg.nodes[this.restrict]
    ;
    // return true if this node is not restricted, or when the targetNode is within the restricting node's path
    return !restrictingNode || targetNode.within(restrictingNode);
  };

  // add method to de/scope data
  corePkgDef.node.scopeData = function (descope) {
    var
      // alias self (for closure)
      node = this
      // alias the package containing this node
      , pkg = node.pkg
    ;
    // with each data configuration object in this node...
    node.data.forEach(function (dataCfg) {
      var
        // get the data tracking object with this name
        dto = pkg.getData(dataCfg.name)
      ;
      // if descoping data...
      if (descope) {
        // remove current value from values
        dto.values.shift();
        // if no other values exist...
        if (!dto.values.length) {
          // remove the data tracking object
          delete pkg.data[dataCfg.name];
        }
      } else { // otherwise, when scoping a data tracking object...
        // add new or copied value, based on the config
        dto.values.unshift(dataCfg.use ? dataCfg.value : dto.values[0]);
      }
    });
  };

  // add method to apply/remove store conifguration
  corePkgDef.node.setStore = function (remove) {
    var
      // alias self (for closures)
      node = this,
      // alias this node's store config
      storeConfig = node.store,
      // alias package containing this node
      pkg = node.pkg,
      // capture the current store tracking object (if any)
      store = pkg.stores[0],
      // placeholder array, for temporary store configs
      ary = []
    ;
    // if removing this node's store configuration...
    if (remove) {
      // if the store config is capturing...
      if (storeConfig.capture) {
        // if the capture was scoped...
        if (storeConfig.scope) {
          // remove the current store from the package
          pkg.stores.shift();
        } else { // otherwise, when this capture added to the last...
          // remove capture params from the current store criteria
          store.programs.length -= storeConfig.programs.length;
          store.paths.length -= storeConfig.paths.length;
          store.states.length -= storeConfig.states.length;
          // if this store config had a limit...
          if (storeConfig.limit) {
            // remove this config's limit
            store.limits.shift();
          }
        }
      } else if(storeConfig.filter) { // or, when this config is filtering...
        // remove this configuration from the current store's filters
        pkg.stores[0].filters.pop();
      } else if (storeConfig.scope) { // or, when not filtering or capturing, but scoped...
        // remove the current store from the package
        pkg.stores.shift();
      } else { // otherwise, when not filtering or capturing, and not scoped...
        // remove the active flag from the current store tracker
        store.active.shift();
      }
    } else { // otherwise, apply this node's store configuration...
      // if this store config captures...
      if (storeConfig.capture) {
        // if capture is scoped...
        if (storeConfig.scope) {
          // create new store tracker with this config
          pkg.addStore(storeConfig);
        } else { // otherwise, when capture is not scoped...
          // append capture criteria
          store.prgms = store.prgms.concat(storeConfig.prgms);
          store.paths = store.paths.concat(storeConfig.paths);
          store.states = store.states.concat(storeConfig.states);
          // add this configs limit
          store.limits.unshift(storeConfig.limit);
        }
      } else if (storeConfig.filter) { // or, when this config is filtering...
        // add this config to the current store's filters
        store.filters.push(storeConfig);
      } else if (storeConfig.scope) { // or, when not filtering or capturing, but scoped...
        // create new store tracker that does not capture
        pkg.addStore({
          prgms: ary,
          paths: ary,
          states: ary,
          limit: 0,
          capture: 0
        });
      } else { // otherwise, when not filtering or capturing, and not scoped...
        // disable capturing in the current store tracker
        store.active.unshift(0);
      }
    }
    // if the remaining store tracker has more items than it's limit...
    if (pkg.stores.length && pkg.stores[0].limits[0] && pkg.stores[0].limits[0] < pkg.stores[0].items.length) {
      // reduce the number of items in the store
      pkg.stores[0].items = pkg.stores[0].items.slice(-pkg.stores[0].limits[0]);
    }
  };

  // add method to determine when this node is a descendant of the given/current node
  corePkgDef.node.within = function (nodeRef) {
    var
      // resolve the parent node to check
      parentNode = arguments.length ? (typeof nodeRef === 'object' ? nodeRef : this.pkg.nodes[nodeRef]) : this.pkg.nodes[this.pkg.tank.currentIndex]
    ;
    // return whether the current node is within the parent node - auto-pass when parentNode is the flow state
    return parentNode ? parentNode !== this && (!parentNode.index || !this.path.indexOf(parentNode.path)) : false;
  };

  // add method to return map of this flow's nodes
  corePkgDef.proxy.map = function (fromCurrentState) {
    var
      // get core package instance
      pkg = corePkgDef(this),
      // alias nodes
      states = pkg.nodes
    ;
    // if targeting the current state...
    if (fromCurrentState) {
      // return map of the current state
      return states[pkg.tank.currentIndex].map;
    } else { // otherwise, when not targeting the current state...
      // return map of the program (root) state
      return states[1].map;
    }
  };

  // add method to 
  corePkgDef.proxy.query = function (node) {
    var
      // get package instance
      pkg = corePkgDef(this)
      // alias for minification
      , args = arguments
      // node indice resolved by query
      , nodes = []
    ;
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
      pkg = corePkgDef(this)
    ;
    // if arguments were passed...
    if (arguments.length) {
      // if allowed to change the lock status...
      if (pkg.allowed()) {
        // set new lock state
        pkg.locked = !!set;
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
      pkg = corePkgDef(this)
    ;
    // if allowed and given a function...
    if (pkg.allowed() && typeof fnc === 'function') {
      // return "blessed" function
      return function () {
          var
            // capture initial trust value
            currentTrustValue = pkg.trust
            // placeholder to capture execution result
            , rslt
          ;
          // ensure we're executing in a trusted environment
          pkg.trust = 1;
          // call and capture function result, pass along scope and args
          rslt = fnc.apply(this, arguments);
          // restore trust value
          pkg.trust = currentTrustValue;
          // return result of function call
          return rslt;
        }
    }
    // (otherwise) return false
    return false;
  };

  // access and edit scoped data for a node
  corePkgDef.proxy.data = function (name, value) {
    var
      // get package
      pkg = corePkgDef(this)
      // get number of arguments passed
      , argCnt = arguments.length
      // loop data
      , d
      // value to return (default is false)
      , rtn = false
    ;
    // if passed arguments...
    if (argCnt) {
      // based on the type of name...
      switch (typeof name) {
        case 'string':
          // if the name is valid...
          if (isDataNameValid(name)) {
            // resolve data tracker
            d = pkg.getData(name);
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
            // with each data config, declared in the data authority...
            rtn = pkg.nodes[pkg.tank.currentIndex].dataAuth.map(function (dataConfig) {
              // capture name
              return dataConfig.name;
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
                return isDataNameValid(key);
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
      rtn = [];
      // with each property in the data object...
      for (d in pkg.data) {
        // if this member is not inherited...
        if (pkg.data.hasOwnProperty(d)) {
          // add to collection of names to return
          rtn.push(d);
        }
      }
      // sort data names
      rtn.sort();
    }
    // return result of call
    return rtn;
  };

  // access and edit the arguments passed to traversal functions
  corePkgDef.proxy.args = function (idx, value) {
    var
      // get package
      pkg = corePkgDef(this)
      // alias arguments from this package
      , pkgArgs = pkg.args
      // get number of arguments passed
      , argCnt = arguments.length
      // get type of first argument
      , idxType = typeof idx
    ;
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
      pkg = corePkgDef(this)
      // resolve a node index from qry, or nothing if allowed or unlocked
      , tgtIdx = (pkg.allowed() || !pkg.locked) ? pkg.vetIndexOf(qry) : -1
    ;
    // if the destination node is valid, and the flow can move...
    if (~tgtIdx) {
      // capture arguments after the tgt
      pkg.args = [].slice.call(arguments).slice(1);
      // reset targets array
      pkg.targets = [tgtIdx];
      // navigate towards the targets (unpauses the flow)
      pkg.go();
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
      pkg = corePkgDef(this)
      // capture current paused status
      , wasPaused = pkg.pause
      // collection of targets to add to targets
      , waypoints = []
      // success status for this call
      , result = 0
    ;
    // if...
    if (
      // allowed or unlocked and ...
      (pkg.allowed() || !pkg.locked) &&
      // any and all node references are valid...
      [].slice.call(arguments).every(function (nodeRef) {
        var
          // resolve index of this reference
          idx = pkg.vetIndexOf(nodeRef)
        ;
        // add to waypoints
        waypoints.push(idx);
        // return true when the resolved index is not -1
        return ~idx;
      })
    ) {
      // if there are waypoints...
      if (waypoints.length) {
        // if the last waypoint matches the first target...
        if (waypoints.slice(-1)[0] === pkg.targets[0]) {
          // remove the last waypoint
          waypoints.pop();
        }
        // prepend (remaining) waypoints to targets
        pkg.targets = waypoints.concat(pkg.targets);
      }
      // capture result of move attempt or true when paused
      result = pkg.go() || wasPaused;
    }
    // return result as boolean
    return !!result;
  };

  // delay traversing
  corePkgDef.proxy.wait = function () {
    var
      // get package
      pkg = corePkgDef(this)
      // alias arguments
      , args = arguments
      // capture number of arguments passed
      , argLn = args.length
      // flag when no action will be taken after a delay
      , noAction = argLn < 2
      // capture first argument as action to take after the delay, when more than one argument is passed
      , delayFnc = noAction ? 0 : args[0]
      // flag when the delay is a function
      , isFnc = typeof delayFnc === 'function'
      // get node referenced by delayFnc (the first argument) - no vet check, since this would be a priviledged call
      , delayNodeIdx = pkg.indexOf(delayFnc)
      // use last argument as a time
      , time = args[argLn - 1]
      // indicates result of call
      , result = 0
    ;
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
              // target this node index (being explicit to avoid collisions)
              pkg.proxy.pkgs.core.target(delayNodeIdx);
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
      pkg = corePkgDef(this)
    ;
    // return the owning flow's proxy or true when external, otherwise return false when not owned
    return pkg.owner && (pkg.allowed() ? pkg.owner.proxy : true) || false;
  };

  /*
  query, add or delete flows from the current store

  */
  corePkgDef.proxy.store = function () {
    // var
    //   // get arguments as an array
    //   args = [].slice.call(arguments),
    //   // alias this flow's core-instance
    //   pkg = corePkgDef(this),
    //   // flag when deleting the given flows
    //   delMode = 0
    // ;
    // // if allowed...
    // if (pkg.allowed()) {
    //   // if arguments were given...
    //   if (args.length) {
    //     // if the last value is boolean false...
    //     if (args.slice(-1)[0] === false) {
    //       // remove last value
    //       args.pop();
    //       // flag that this function is in delete mode
    //       delMode = 1;
    //     }
    //     // if every argument passed is a flow instance...
    //     if (args.every(function (arg) {
    //       return arg instanceof Flow
    //     })) {

    //     }
    //   }
    // }
    // // (otherwise) return false to untrusted calls unless there are no arguments
    // return !args.length && pkg.store.concat();
  };

  // return an object with status information about the flow and it's current state
  corePkgDef.proxy.status = function () {
    var
      // get the package instance
      pkg = corePkgDef(this)
      // alias the current node
      , currentNode = pkg.nodes[pkg.tank.currentIndex]
    ;

    // map-function for retrieving the node index
    function getPathFromIndex(idx) {
      return pkg.nodes[idx].path;
    }

    // return the collection of keys for the node object
    return {
      trust: !!pkg.trust
      , permit: !!pkg.allowed()
      , loops: Math.max((pkg.calls.join().match(new RegExp('\\b' + currentNode.index + '.' + pkg.phase, 'g')) || []).length - 1, 0)
      , depth: currentNode.depth
      , paused: !!pkg.pause
      , pending: !!pkg.pending
      , pendable: !!currentNode.pendable
      , targets: pkg.targets.map(getPathFromIndex)
      , route: pkg.route.map(getPathFromIndex)
      , path: currentNode.path
      , index: currentNode.index
      , phase: corePkgDef.events[pkg.phase]
      , state: currentNode.name
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