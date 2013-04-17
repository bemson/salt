/*!
 * Flow v0.5.0
 * http://github.com/bemson/Flow/
 *
 * Dependencies:
 * - Panzer v0.3.7 / Bemi Faison (c) 2012 / MIT (http://github.com/bemson/Panzer/)
 *
 * Copyright, Bemi Faison
 * Released under the MIT License
 */
!function (inAMD, inCJS, Array, Math, Object, RegExp, scope, undefined) {

  // dependent module initializer
  function initFlow(require, exports, module) {

    var
      Flow = ((inCJS || inAMD) ? require('Panzer') : scope.Panzer).create(),
      corePkgDef = Flow.pkg('core'),
      staticUnusedArray = [],
      protoSlice = Array.prototype.slice,
      i, // loop vars
      isArray = (typeof Array.isArray === 'function') ?
        Array.isArray :
        function (obj) {
          return obj instanceof Array;
        },
      tokenPrefix = '@',
      // regexps
      r_queryIsTokenized = new RegExp('[\\.\\|\\[\\]' + tokenPrefix + ']'),
      r_validAbsolutePath = /^\/\/(?:\w+\/)+/,
      r_trimSlashes = /^\/+|\/+$/g,
      r_hasNonAlphanumericCharacter = /\W/,
      r_hasAlphanumericCharacter = /\w/,
      traversalCallbackOrder = {
        _on: 0,
        _in: 1,
        _out: 2,
        _over: 3,
        _bover: 4,
        '0': '_on',
        '1': '_in',
        '2': '_out',
        '3': '_over',
        '4': '_bover'
      },
      activeFlows = [],
      reservedQueryTokens = {
        'null': {
          f: 0,
          i: 0
        },
        program: {
          f: 0,
          i: 1
        },
        root: {
          f: function (node) {
            return node.rootIndex;
          }
        },
        parent: {
          f: function (node) {
            return node.parentIndex;
          }
        },
        child: {
          f: function (node) {
            return node.firstChildIndex;
          }
        },
        next: {
          f: function (node) {
            return node.nextIndex;
          }
        },
        previous: {
          f: function (node) {
            return node.previousIndex;
          }
        },
        oldest: {
          f: function (node, nodes, tokenName) {
            var parentNode = nodes[node.parentIndex];
            if (parentNode) {
              return parentNode[((tokenName.charAt(0) === 'y') ? 'first' : 'last') + 'ChildIndex'];
            }
            return -1;
          }
        },
        self: {
          f: function (node) {
            return node.index;
          }
        }
      },
      coreTags = {
        /*
          Specifies when a state is the base for rooted queries.
        */
        _root: function (tagName, exists, tags, node, parentNode, pkg, idx) {
          if (idx < 2 || (exists && tags._root)) {
            node.rootIndex = idx;
          } else {
            node.rootIndex = parentNode.rootIndex;
          }
        },
        /*
          Specifies when a state may not be exited with external calls.
        */
        _restrict: function (tagName, exists, tags, node, parentNode, pkg, idx) {
          var prop = tagName.substr(1);
          if (exists && tags[tagName]) {
            node[prop] = idx;
          } else if (parentNode) {
            node[prop] = parentNode[prop];
          } else {
            node[prop] = -1;
          }
        },
        /*
          Specifies when an entered state will lock/unlock the flow.
        */
        _lock: function (tagName, exists, tags, node, parentNode, pkg, idx) {

          node.lGate = node.lock = 0;

          if (exists) {
            node.lGate = 1;
            node.lock = !!tags._lock;
          } else if (parentNode) {
            node.lock = parentNode.lock;
          }
        },
        /*
          Defines the path to update an owning flow - if any.
        */
        _owner: function (tagName, exists, tags, node, parentNode, pkg, idx) {
          var
            typeofTag,
            tagValue
          ;

          node.pGate = 0;
          node.ping = -1;

          if (exists) {
            pkg.ownable = 1;

            tagValue = tags._owner;
            typeofTag = typeof value;

            if (
              (typeofTag === 'string' && tagValue) ||
              (typeofTag === 'number' && tagValue >= 0)
            ) {
              node.pGate = 1;
              node.ping = tagValue;
            }
          } else if (parentNode) {
            node.ping = parentNode.ping;
          }
        },
        /*
          Define alias for this state, to use in queries.
        */
        _name: function (tagName, exists, tags, node, parentNode, pkg, idx) {
          if (
            exists && tags._name && typeof tags._name === 'string' &&
            !r_queryIsTokenized.test(tags._name) && r_hasAlphanumericCharacter.test(tags._name)
          ) {
            pkg.tokens[tags._name] = {
              i: idx,
              f: 0
            };
          }
        },
        /*
          Define criteria for preserving instances created while traversing this branch.
        */
        _store: function (tagName, exists, tags, node, parentNode, pkg, idx) {

          node.criteria = 0;

          if (exists) {
            node.criteria = compileFilterCriteria(tags._store);
          } else if (parentNode) {
            node.criteria = parentNode.criteria;
          }
        },
        /*
          Define data names and values for a branch.

          _data: 'foo'
          _data: ['foo']
          _data: {foo: 'bar'}
          _data: ['foo', {zoo:'baz'}]
        */
        _data: function (tagName, exists, tags, node, parentNode, pkg, idx) {
          var
            cfgs = {},
            key
          ;

          // init dtos property to collect data tracking objects
          node.dcfgs = [];

          if (exists) {
            (isArray(tags._data) ? tags._data : [tags._data]).forEach(function (data) {
              var
                typeofData = typeof data,
                key
              ;
              if (typeofData === 'string' && data) {
                cfgs[data] = {
                  use: 0,
                  name: data,
                  value: undefined
                };
              }
              if (typeofData === 'object' && data) {
                for (key in data) {
                  if (data.hasOwnProperty(key)) {
                    cfgs[key] = {
                      use: 1,
                      name: key,
                      value: data[key]
                    };
                  }
                }
              }
            });
            for (key in cfgs) {
              if (cfgs.hasOwnProperty(key)) {
                node.dcfgs.push(cfgs[key]);
              }
            }
          }
        },
        /*
          Specifies a branch to navigate after targeting this state.
        */
        _sequence: function (tagName, exists, tags, node, parentNode, pkg, idx) {
          if (exists) {
            // set walk to a new or copied array, based on the booly value
            node.seq = tags[tagName] ? [] : 0;
            // set last walk to this state's walk
            node.lastWalk = node.seq;
          } else {
            // set walk property to nil
            node.seq = 0;
            // pass thru the last walk array defined - if any
            if (parentNode) {
              node.lastWalk = parentNode.lastWalk;
            } else {
              node.lastWalk = 0;
            }
            // if there is a lastWalk array...
            if (node.lastWalk) {
              // add this node's index to the array
              node.lastWalk.push(node.index);
            }
          }
        },
        /*
          Specifies when a paused state will prevent parent flow's from completing their navigation.
        */
        _pendable: function (tagName, exists, tags, node, parentNode, pkg, idx) {
          if (exists) {
            node.pendable = !!tags._pendable;
          } else if (parentNode) {
            node.pendable = parentNode.pendable;
          } else {
            node.pendable = true;
          }
        },
        /*
          Defines one of five callback methods to invoke.
        */
        _on: function (tagName, exists, tags, node, parentNode, pkg, idx) {
          var
            tagValue = tags[tagName]
          ;
          if (exists && typeof tagValue === 'function') {
            node.fncs[traversalCallbackOrder[tagName]] = tagValue;
          }
        },
        /*
          Specifies where to direct the flow at the end of a sequence for a given branch
        */
        _tail: function (tagName, exists, tags, node, parentNode, pkg, idx) {
          var
            tagValue,
            tailData,
            tailNode
          ;
          if (exists) {
            tagValue = tags._tail;
            node.tail = tailData = {
              p: tagValue
            };
            if (tagValue === true) {
              tailData.n = node;
            } else if (tagValue === false) {
              // skip all when false
              tailData.n =
              tailData.t =
                -1;
            } else if (typeof tagValue === 'number' && !(tailData.n = pkg.nodes[tagValue])) {
              // ignore invalid numbers now
              tailData.t = -1;
            }
          } else if (parentNode) {
            node.tail = parentNode.tail;
          } else {
            node.tail = 0;
          }
        }
      },
      // tags that depend on other tags or require cleanup
      corePostTags = {
        /*
          Clean up lastWalk flag
        */
        _sequence: function (tagName, exists, tags, node) {
          delete node.lastWalk;
        },
        /*
          Specifies where to direct the flow at the end of a sequence for a given branch
        */
        _tail: function (tagName, exists, tags, node, parentNode, pkg, idx) {
          var
            tailData = node.tail,
            tailNode
          ;
          node.tail = -1;
          // if there is tail data to use/process
          if (tailData) {

            // resolve path when there is no node
            if (!tailData.hasOwnProperty('n')) {
              tailData.n = pkg.nodes[pkg.indexOf(tailData.p, node)];
            }

            // resolve tail index
            if (!tailData.hasOwnProperty('t')) {
              tailNode = tailData.n;
              // if...
              if (
                // there is a tail target, and...
                tailNode &&
                // the tail target is not a descendent of this node, and...
                !tailNode.within(node) &&
                (
                  // the tail target is not a sequence, or...
                  !tailNode.seq ||
                  (
                    // the tail sequence is not the owning node, and...
                    tailNode !== node &&
                    // not an ancestor anyway
                    !node.within(tailNode)
                  )
                )
              ) {
                // capture tail target index
                tailData.t = tailNode.index;
              } else {
                // ignore invalid tail target
                tailData.t = -1;
              }
            }

            // if this is an owning node that tails itself...
            if (exists && tailData.n === node) {
              // use parent's tail value
              node.tail = parentNode.tail;
            } else {
              node.tail = tailData.t;
            }
          }
        },
        /*
          Process callbacks that are redirects
        */
        _on: function (tagName, exists, tags, node, parentNode, pkg, idx) {
          var
            tgtIdx = -1,
            phase,
            typeofTagValue,
            tagValue
          ;
          if (exists && (typeofTagValue = typeof (tagValue = tags[tagName])) !== 'function') {
            if (typeofTagValue === 'string' && tagValue.length) {
              tgtIdx = pkg.indexOf(tagValue, node);
            } else if (typeofTagValue === 'number' && pkg.nodes[tagValue]) {
              tgtIdx = tagValue;
            }
            if (~tgtIdx && (tagName !== '_on' || tgtIdx !== idx)) {
              phase = traversalCallbackOrder[tagName];
              node.reds[phase] = tgtIdx;
              node.fncs[phase] = sharedRedirectEventHandler;
            }
          }
        }
      },
      // import resolution helpers
      import_pkgCnt,
      import_tagKeyTests,
      // cache of core tag keys
      coreTagKeys = [],
      coreTagKeyCount,
      // cache of core post tag keys
      corePostTagKeys = [],
      corePostTagKeyCount
    ;

    Flow.version = '0.5.0';

    // define remaining core tags and share tag initializers
    /*
      _ingress: Defines a state that must be targeted before it's descendents.
    */
    coreTags._ingress = coreTags._restrict;
    coreTags._in = coreTags._out = coreTags._over = coreTags._bover = coreTags._on;
    corePostTags._in = corePostTags._out = corePostTags._over = corePostTags._bover = corePostTags._on;

    // get core tag keys
    for (i in coreTags) {
      if (coreTags.hasOwnProperty(i)) {
        coreTagKeys[coreTagKeys.length] = i;
      }
    }
    coreTagKeyCount = coreTagKeys.length;

    // get post core tag keys
    for (i in corePostTags) {
      if (corePostTags.hasOwnProperty(i)) {
        corePostTagKeys[corePostTagKeys.length] = i;
      }
    }
    corePostTagKeyCount = corePostTagKeys.length;

    // reuse dynamic resolution for other tokens
    reservedQueryTokens['.'] = reservedQueryTokens.self;
    reservedQueryTokens['..'] = reservedQueryTokens.parent;
    reservedQueryTokens.youngest = reservedQueryTokens.oldest;

    // returns true when the argument is a valid data name
    function isDataDefinitionNameValid(name) {
      return typeof name === 'string' && r_hasAlphanumericCharacter.test(name);
    }

    // gets tag key tests for parsing state tags
    function import_cacheTagKeyTests () {
      var pkgNames = Flow.pkg();
      // only compile if the number of packages has changed
      // NOTE: this approach is performant but fails if attrkeys are changed per package
      if (pkgNames.length !== import_pkgCnt) {
        // compile list of attribute keys from all packages
        if ((import_pkgCnt = pkgNames.length) === 1) {
          import_tagKeyTests = [corePkgDef.attrKey];
        } else {
          import_tagKeyTests = pkgNames
            .map(import_cacheTagKeyTests_map)
            .filter(import_cacheTagKeyTests_filter)
          ;
        }
        // cache type of attribute test
        import_tagKeyTests = import_tagKeyTests
          .map(import_cacheTagKeyTests_precalc);
      }
    }

    function import_cacheTagKeyTests_map ( pkgName ) {
      return Flow.pkg(pkgName).attrKey;
    }

    function import_cacheTagKeyTests_filter ( tagKeyTest ) {
      return tagKeyTest;
    }

    function import_cacheTagKeyTests_precalc ( tagKeyTest ) {
      var typeMap = {
        // flag when the test is a function
        f:0,
        // flag when the test is a regular-expression
        r:0
      };
      if (typeof tagKeyTest === 'function') {
        typeMap.f = tagKeyTest;
      } else {
        typeMap.r = tagKeyTest;
      }
      return typeMap;
    }

    function import_extractBasePath (state) {
      var importPath;
      if (typeof state === 'string') {
        importPath = state;
      } else if (state && state.hasOwnProperty('_import') && typeof state._import === 'string') {
        importPath = state._import;
      }
      if (importPath && r_validAbsolutePath.test(importPath)) {
        return importPath;
      }
      return '';
    }

    // flag when the given state member is a state (otherwise a tag)
    function import_isState ( name, value ) {
      var
        i = 0,
        tagKeyTest
      ;
      // all key tests must fail, in order to be a state
      for (; tagKeyTest = import_tagKeyTests[i]; i++) {
        if (
          (
            tagKeyTest.r &&
            tagKeyTest.r.test(name)
          ) ||
          (
            tagKeyTest.f &&
            tagKeyTest.f(name, value)
          )
        ) {
          return 0;
        }
      }
      return 1;
    }

    // ensure the given value is a state object
    function import_mergeStates_convertToObject( state ) {
      var typeofState = typeof state;
      if (typeofState === 'string') {
        return {
          _import: state
        };
      } else if (typeofState === 'function') {
        return {
          _on: baseState
        };
      } else if (typeofState === 'object') {
        return state;
      }
      return {};
    }

    function import_mergeStates ( baseState, sourceState, mergedState) {
      var
        merged = mergedState || {},
        base = import_mergeStates_convertToObject(baseState),
        source = import_mergeStates_convertToObject(sourceState),
        baseKeys = Object.keys(base),
        sourceKeys = Object.keys(source),
        keyIsInSource,
        idx = 0,
        key
      ;

      // import base keys and merge states also in source
      for (; key = baseKeys[idx]; idx++) {
        keyIsInSource = source.hasOwnProperty(key);
        if (import_isState(key)) {
          if (keyIsInSource) {
            merged[key] = import_mergeStates(base[key], source[key], {});
          } else {
            merged[key] = base[key];
          }
        } else if (keyIsInSource && key !== '_import') { // override all but the _import tag
          merged[key] = source[key];
        } else {
          merged[key] = base[key];
        }
      }

      // append unique source keys that are not "_import"
      for (idx = 0; key = sourceKeys[idx]; idx++) {
        if (!base.hasOwnProperty(key) && key !== '_import') {
          merged[key] = source[key];
        }
      }

      return merged;
    }

    function import_getStateByAbsolutePath( path, program ) {
      var resolvedState = program;

      if (
        path.slice(2, -1).split('/').every(function ( partialPath ) {
          if (
            resolvedState.hasOwnProperty(partialPath) &&
            import_isState(partialPath, resolvedState[partialPath])
          ) {
            resolvedState = resolvedState[partialPath];
            return 1;
          }
        })
      ) {
        return resolvedState;
      }
    }

    function import_resolveBase( sourceState, program, importedPaths ) {
      var
        resolvedState,
        baseState,
        importPath = import_extractBasePath(sourceState)
      ;

      if (
        importPath &&
        !importedPaths.hasOwnProperty(importPath) &&
        (baseState = import_getStateByAbsolutePath(importPath, program))
      ) {
        importedPaths[importPath] = 1;
        if (typeof sourceState === 'string') {
          resolvedState = baseState;
        } else {
          resolvedState = import_mergeStates(baseState, sourceState);
        }
      }
      return resolvedState;
    }

    function compileFilterCriteria(rawCriteria) {
      var
        typeofRaw = typeof rawCriteria,
        values,
        // default filter flags
        criteria = {
          // include matches for any filter
          strict: 0,
          // retrieve non-matches
          invert: 0
        },
        flag,
        didParseCriteria
      ;

      // return compiled criteria to collect all or zero items
      if (typeofRaw === 'boolean') {
        if (rawCriteria) {
          criteria.all = 1;
          criteria.opts = 0;
          return criteria;
        } else {
          return 0;
        }
      }

      // return compiled criteria for paths or states
      if (typeofRaw === 'string') {
        if (!rawCriteria) {
          return 0;
        }
        criteria.opts = [{
          matches: [rawCriteria]
        }];
        if (r_hasNonAlphanumericCharacter.test(rawCriteria)) {
          criteria.opts[0].name = 's_paths';
        } else {
          criteria.opts[0].name = 's_states';
        }
        return criteria;
      }

      // return compiled criteria for state numbers
      if (typeofRaw === 'number') {
        if (rawCriteria >= 0 && rawCriteria === ~~rawCriteria) {
          criteria.opts = [{
            name: 'n_states',
            matches: [rawCriteria]
          }];
          return criteria;
        } else {
          return 0;
        }
      }

      // parse object criteria
      if (typeofRaw === 'object') {

        // update matching flags
        for (flag in criteria) {
          if (criteria.hasOwnProperty(flag) && rawCriteria.hasOwnProperty('qry_' + flag)) {
            didParseCriteria = 1;
            criteria[flag] = !!rawCriteria['qry_' + flag];
          }
        }

        // init filter options
        criteria.opts = [];

        // sanitize matching options from raw criteria
        ['paths', 'states', 'programs'].forEach(function (filter) {
          if (rawCriteria.hasOwnProperty(filter)) {
            values = rawCriteria[filter];
            if (!isArray(values)) {
              values = [values];
            }
            if (filter !== 'programs') {
              // states and paths may be numbers, strings and/or regexps
              if (!values.some(
                function (value) {
                  var typeofValue = typeof value;
                  return (typeofValue === 'string' && !value) ||
                        // only states may be whole numbers
                        (typeofValue === 'number' &&
                          (filter !== 'states' || value !== ~~value)
                        ) ||
                        (typeofValue === 'object' && !(value instanceof RegExp));
                }
              )) {
                // define options for each kind of filter value
                ['string', 'object', 'number'].forEach(function (typeofValue) {
                  var set = values.filter(function (value) {
                    return typeof value === typeofValue;
                  });
                  if (set.length) {
                    didParseCriteria = 1;
                    criteria.opts.push({
                      name: typeofValue.charAt(0) + '_' + filter,
                      matches: set
                    });
                  }
                });
              }
            } else {
              didParseCriteria = 1;
              criteria.opts.push({
                name: filter,
                matches: values
              });
            }
          }
        });
      }
      if (didParseCriteria) {
        return criteria;
      } else {
        return 0;
      }
    }

    function sharedRedirectEventHandler() {
      var
        flow = this,
        pkg = corePkgDef(flow)
      ;
      flow.go(pkg.nodes[pkg.tank.currentIndex].reds[pkg.phase]);
    }

    function sharedNodeCallbackInitializer(node, parentNode) {
      // define custom, curried, and linked calls to .target
      node.cb = function () {
        var
          args = protoSlice.call(arguments),
          pkg = node.pkg
        ;
        args.unshift(node.index);
        return pkg.proxy.target.apply(pkg.proxy, args);
      };
      node.cb.toString = function () {
        return node.path;
      };
      if (parentNode) {
        parentNode.cb[node.name] = node.cb;
      }
    }

    function FlowStorage() {
      this.all = {};
      this.tmp = {};
    }

    FlowStorage.prototype = {

      on: 0,

      put: function (flows, bin) {
        var
          i = 0,
          flow
        ;
        // add corresponding package instance to the master collection
        if (flows.length &&
          flows.every(function (flow) {
            return flow instanceof Flow;
          })
        ) {
          for (; flow = flows[i]; i++) {
            bin[flow.tank.id] = corePkgDef(flow);
          }
          return true;
        }
        return false;
      },

      commit: function () {
        var
          mgr = this,
          pkgs = this.filter(mgr.on, mgr.tmp),
          pkgId
        ;
        for (pkgId in pkgs) {
          if (pkgs.hasOwnProperty(pkgId)) {
            mgr.all[pkgId] = pkg;
          }
        }
        mgr.tmp = {};
      },

      // filters

      f: {
        programs: function (pkg, matches) {
          var
            i = 0,
            j = matches.length,
            originalProgram = pkg.nodes[1].value
          ;
          for (; i < j; i++) {
            if (originalProgram === matches[i]) {
              return 1;
            }
          }
          return 0;
        },
        s_states: function (pkg, matches) {
          var
            i = 0,
            j = matches.length,
            currentStateName = pkg.nodes[0].name
          ;
          for (; i < j; i++) {
            if (currentStateName === matches[i]) {
              return 1;
            }
          }
          return 0;
        },
        n_states: function (pkg, matches) {
          var
            i = 0,
            j = matches.length,
            currentIndex = pkg.tank.currentIndex
          ;
          for (; i < j; i++) {
            if (currentIndex === matches[i]) {
              return 1;
            }
          }
          return 0;
        },
        o_states: function (pkg, matches) {
          var
            i = 0,
            j = matches.length,
            currentStateName = pkg.nodes[0].name
          ;
          for (; i < j; i++) {
            if (matches[i].test(currentStateName)) {
              return 1
            }
          }
          return 0;
        },
        s_paths: function (pkg, matches) {
          var
            i = 0,
            j = matches.length,
            currentPath = pkg.nodes[0].path
          ;
          for (; i < j; i++) {
            if (~currentPath.indexOf(matches[i])) {
              return 1;
            }
          }
          return 0;
        },
        o_paths: function (pkg, matches) {
          var
            i = 0,
            j = matches.length,
            currentPath = pkg.nodes[0].path
          ;
          for (; i < j; i++) {
            if (matches[i].test(currentPath)) {
              return 1
            }
          }
          return 0;
        }
      },

      filter: function (criteria, bins) {
        var
          mgr = this,
          pkg,
          pkgId,
          bin,
          binIdx = 0,
          options,
          option,
          optionIdx,
          captureAllPackages,
          mustSatisfyAllCriteria,
          getNonMatchingPackages,
          lastOptionIdx,
          filtered = {}
        ;
        // use default bins and criteria
        if (!criteria) {
          return filtered;
        } else if (!(captureAllPackages = criteria.hasOwnProperty('all'))) {
          mustSatisfyAllCriteria = criteria.strict;
          getNonMatchingPackages = criteria.invert;
          if (criteria.opts) {
            options = criteria.opts;
            lastOptionIdx = options.length - 1;
          }
        }
        // use default bins
        if (!bins) {
          bins = [mgr.all, mgr.tmp];
        }
        if (!isArray(bins)) {
          bins = [bins];
        }
        for (; bin = bins[binIdx]; binIdx++) {
          if (!bin) {
            continue;
          }
          nextPackage:
          for (pkgId in bin) {
            if (bin.hasOwnProperty(pkgId)) {
              pkg = bin[pkgId];
              if (captureAllPackages) {
                filtered[pkgId] = pkg;
              } else {
                for (optionIdx = 0; option = options[optionIdx]; optionIdx++) {
                  if (mgr.f[option.name](pkg, option.matches)) {
                    // capture successfully matched packages
                    if (!getNonMatchingPackages && (!mustSatisfyAllCriteria || optionIdx === lastOptionIdx)) {
                      filtered[pkgId] = pkg;
                      continue nextPackage;
                    }
                  } else {
                    // capture non-matching packages
                    if (getNonMatchingPackages && (mustSatisfyAllCriteria || optionIdx === lastOptionIdx)) {
                      filtered[pkgId] = pkg;
                    }
                    // stop testing for strict criteria
                    if (mustSatisfyAllCriteria) {
                      continue nextPackage;
                    }
                  }
                }
              }
            }
          }
        }
        return filtered;
      },

      // exposed interfaces

      get: function (criteria, bins) {
        var
          mgr = this,
          pkgs = mgr.filter(criteria, bins),
          ary = [],
          pkgId
        ;
        for (pkgId in pkgs) {
          if (pkgs.hasOwnProperty(pkgId)) {
            ary.push(pkgs[pkgId].proxy);
          }
        }
        return ary;
      },

      remove: function (criteria, bins) {
        var
          mgr = this,
          pkgs,
          pkgId,
          deletedAtLeastOnePackage = 0
        ;
        if (isArray(criteria)) {
          if (criteria.every(function (flow) {
            return flow instanceof Flow;
          })) {
            criteria.forEach(function (flow) {
              pkgId = corePkgDef(flow).tank.id;
              delete mgr.all[pkgId];
              delete mgr.tmp[pkgId];
            });
            deletedAtLeastOnePackage = 1;
          }
        } else {
          pkgs = mgr.filter(criteria, bins);
          for (pkgId in pkgs) {
            if (pkgs.hasOwnProperty(pkgId)) {
              deletedAtLeastOnePackage = 1;
              delete mgr.all[pkgId];
              delete mgr.tmp[pkgId];
            }
          }
        }
        return !!deletedAtLeastOnePackage;
      },

      add: function (flows) {
        return this.put(flows, this.all);
      },

      buffer: function (flows) {
        return this.put(flows, this.tmp);
      }

    };

    // collection of active package-trees - exposed to support package integration
    corePkgDef.actives = [];

    // pattern for identifying tag keys
    corePkgDef.attrKey = /^_/;

    // pattern for identifying invalid state names
    corePkgDef.badKey = /\W|^toString$/;

    corePkgDef.prepTree = function () {
      import_cacheTagKeyTests();
    };

    corePkgDef.prepNode = function ( state, program ) {
      var
        finalState,
        tmpState = state,
        importedPaths = {}
      ;
      // resolve all top-level imports for this state - avoid shallow-recursion
      // this is similar to sub-classing
      while (tmpState = import_resolveBase(tmpState, program, importedPaths)) {
        finalState = tmpState;
      }

      return finalState;
    };

    // initialize the package instance with custom properties
    // only argument is the object passed after the program when calling "new Flow(program, extraArg)"
    corePkgDef.init = function (cfg) {
      var
        pkg = this,
        activeFlow = activeFlows[0],
        sharedProxyDataMember = {},
        sharedProxyStateMember = {
          name: '_null',
          path: '..//',
          depth: 0,
          index: 0,
          phase: traversalCallbackOrder[0],
          pendable: true
        },
        nodes = pkg.nodes,
        nodeCount = nodes.length,
        i, j,
        node, parentNode, tagName,
        pkgId
      ;

      // define stored instance manager
      pkg.bin = new FlowStorage();
      // define initial vars member
      pkg.vars = {};
      // collection of custom query tokens
      pkg.tokens = {};
      // collection of custom callback queries
      pkg.cbs = {};
      // collection of arguments for traversal functions
      pkg.args = [];
      // collection of node calls made while traversing
      pkg.calls = [];
      // collection of nodes targeted and reached while traversing
      pkg.trail = [];
      // state index to add to trail at end of traversal/resume
      pkg.tgtTrail = -1;
      // collection of declared variable tracking objects
      pkg.dtos = {};
      // init delay timer, function, and args
      pkg.waitTimer =
      pkg.waitFnc =
      pkg.waitArgs =
        0;
      // collection of cached values
      pkg.cache = {
        // token query cache
        indexOf: {},
        // store cache
        store: {}
      };
      // flag when api calls are trusted
      pkg.trust = 0;
      // init locked flag
      pkg.locked = 0;
      // init index of node paths
      pkg.nids = {};
      // the number of child flows fired by this flow's program functions
      pkg.pending = 0;
      // collection of parent flow references
      pkg.pendees = [];
      // collection of targeted nodes
      pkg.targets = [];
      // identify the initial phase for this flow, 0 by default
      pkg.phase = 0;
      // set owner permission and assignment defaults
      pkg.owner = pkg.ownable = 0;
      // set name of first node
      pkg.nodes[0].name = '_null';
      // set name of second node
      pkg.nodes[1].name = '_program';
      // initialize nodes...
      for (i = 0; i < nodeCount; i++) {
        node = nodes[i];
        parentNode = nodes[node.parentIndex];

        // define node path
        if (i == 1) {
          node.path = '//';
        } else if (i) {
          node.path = parentNode.path + node.name + '/';
        } else {
          node.path = '..//';
        }

        // index this node path
        pkg.nids[node.path] = i;

        // prep for tag compilation
        node.pkg = pkg;
        node.fncs = [0,0,0,0,0];
        node.reds = [];

        // run core tags
        for (j = 0; j < coreTagKeyCount; j++) {
          tagName = coreTagKeys[j];
          coreTags[tagName](tagName, node.attrs.hasOwnProperty(tagName), node.attrs, node, parentNode, pkg, i);
        }

        // add callback-tree
        sharedNodeCallbackInitializer(node, parentNode);

        // if there is no _on[0] function and this node's value is a function...
        if (!node.fncs[0] && typeof node.value === 'function') {
          // use as the _on[0] traversal function
          node.fncs[0] = node.value;
        }
      }

      // run post core tags for each node
      for (i = 0; i < nodeCount; i++) {
        node = nodes[i];
        for (j = 0; j < corePostTagKeyCount; j++) {
          tagName = corePostTagKeys[j];
          corePostTags[tagName](tagName, node.attrs.hasOwnProperty(tagName), node.attrs, node, parentNode, pkg, i);
        }
      }

      for (pkgId in pkg.pkgs) {
        if (pkg.pkgs.hasOwnProperty(pkgId)) {
          // reference data object in all proxy objects
          pkg.pkgs[pkgId].proxy.data = sharedProxyDataMember;
          // reference data object in all proxy objects
          pkg.pkgs[pkgId].proxy.state = sharedProxyStateMember;
        }
      }

      if (activeFlow) {

        // use active flow as the owner
        if (pkg.ownable) {
          pkg.owner = activeFlow;
        }

        // auto capture to the active flow's store
        if (activeFlow.bin.on) {
          activeFlow.bin.tmp[pkg.id] = pkg;
        }
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
          pkg = this,
          tank = pkg.tank,
          nodes = pkg.nodes,
          nids = pkg.nids,
          qryNode,
          simpleQuery,
          tokens,
          token,
          qryCacheId,
          slashSegments,
          slashSegmentsIdx,
          slashSegmentsLn,
          pipeSegments,
          pipeSegmentsIdx,
          pipeSegmentsLn,
          resolvedIndex,
          tokenResolver,
          idx = -1
        ;
        // use the current node, when node is omitted
        node = qryNode = node || pkg.nodes[pkg.tank.currentIndex];
        // based on the type of qry...
        switch (typeof qry) {
          case 'object':
            // if not null "object"...
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

            // short circuit special queries
            if (qry === '..//' || qry === '//') {
              idx = qry === '//' ? 1 : 0;
              break;
            }

            simpleQuery = !r_queryIsTokenized.test(qry);

            // ensure query ends with a slash (for absolute, root, and relative queries)
            if (qry.slice(-1) !== '/') {
              qry += '/';
            }

            if (qry.charAt(0) === '/') {
              if (qry.charAt(1) === '/') {

                // vet absolute query
                if (simpleQuery) {
                  idx = nids[qry] || -1;
                  break;
                }
                qryNode = nodes[0];
              } else {
                qryNode = nodes[qryNode.rootIndex];

                // vet rooted query
                if (simpleQuery) {
                  idx = nids[qryNode.path + qry.substr(1)] || -1;
                  break;
                }
              }
            } else if (simpleQuery) {
              // vet relative query
              idx = nids[qryNode.path + qry] || -1;
              break;
            }

            // (otherwise) prepare query for token resolution and caching
            qry = qry.replace(r_trimSlashes, '');
            qryCacheId = qry + node.index;

            if (!pkg.cache.indexOf.hasOwnProperty(qryCacheId)) {
              slashSegments = qry.split('/');
              slashSegmentsLn = slashSegments.length;
              resolution:
              for (slashSegmentsIdx = 0; slashSegmentsIdx < slashSegmentsLn; slashSegmentsIdx++) {
                pipeSegments = slashSegments[slashSegmentsIdx].split('|');
                pipeSegmentsLn = pipeSegments.length;
                for (pipeSegmentsIdx = 0; pipeSegmentsIdx < pipeSegmentsLn; pipeSegmentsIdx++) {
                  token = pipeSegments[pipeSegmentsIdx];
                  // fail when an empty string
                  if (!token) {
                    idx = -1;
                    break resolution;
                  }
                  resolvedIndex = -1;
                  if (r_hasNonAlphanumericCharacter.test(token)) {
                    // resolve dynamic token
                    if (token.charAt(0) === tokenPrefix) {
                      token = token.slice(1);
                    }
                    tokenResolver = reservedQueryTokens[token] || pkg.tokens[token];
                    if (tokenResolver) {
                      if (tokenResolver.f) {
                        // validate token with a function
                        resolvedIndex = tokenResolver.f(qryNode, nodes, token);
                      } else {
                        // resolve token with an index
                        resolvedIndex = tokenResolver.i;
                      }
                    }
                  } else {
                    // get index matching this state appended to the current node's path
                    resolvedIndex = nids[qryNode.path + token + '/'] || -1;
                  }
                  if (~resolvedIndex) {
                    qryNode = nodes[resolvedIndex];
                    // go to next slash segment (if any)
                    break;
                  }
                }
                // exit when all pipe segments fail
                if (!~resolvedIndex) {
                  break;
                }
              }
              // cache query result
              pkg.cache.indexOf[qryCacheId] = idx = resolvedIndex;
            }
            // get cached query result
            idx = pkg.cache.indexOf[qryCacheId];
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

      // resolve data-tracking-object
      getDTO: function (name) {
        var pkg = this;

        if (!pkg.dtos.hasOwnProperty(name)) {
          pkg.dtos[name] = {
              name: name,
              stack: []
            };
          // check proxy for existing data by this name
          if (typeof pkg.proxy.data == 'object' && pkg.proxy.data.hasOwnProperty(name)) {
            pkg.dtos[name].stack[0] = pkg.proxy.data[name];
          }
        }
        return pkg.dtos[name];
      },

      // proceed towards the latest/current target
      // track - save point for reconciliation later
      go: function () {
        var pkg = this;
        pkg.preMove();
        // exit when pending, or direct tank to the first target - returns the number of steps completed (or false when there is no target)
        return pkg.tank.go(pkg.targets[0]);
      },

      // handle various flags before moving forward
      preMove: function () {
        var pkg = this;
        // clear any delays
        clearTimeout(pkg.waitTimer);
        // unpause this flow
        pkg.pause = 0;
      },

      // flag when the flow is allowed to perform trusted executions
      allowed: function () {
        // flag true when the current flow, or when active and unlocked
        return activeFlows[0] === this || (this.trust && !this.locked);
      },

      // direct owning flow to the given state
      pingOwner: function (stateQuery) {
        var
          pkg = this,
          proxy = pkg.proxy,
          owner = pkg.owner
        ;
        if (owner) {
          owner.proxy.target(stateQuery, proxy, proxy.status());
        }
      },

      // set vars member
      setVars: function () {
        var
          pkg = this,
          proxy = pkg.proxy
        ;

        // preserve untrusted vars member (if any)
        if (proxy.hasOwnProperty('vars')) {
          pkg.tvars = proxy.vars;
        }
        // set "private" vars member
        proxy.vars = pkg.vars;        
      },

      // unset vars member
      delVars: function () {
        var
          pkg = this,
          proxy = pkg.proxy
        ;
        // set and delete vars member
        if (typeof proxy.vars === 'object') {
          pkg.vars = proxy.vars;
        }
        if (pkg.hasOwnProperty('tvars')) {
          // restore public vars member
          proxy.vars = pkg.tvars;
          delete pkg.tvars;
        } else {
          // remove "private" vars member
          delete proxy.vars;
        }
      }

    };

    // do something when the tank starts moving
    corePkgDef.onBegin = function (evtName) {
      var
        pkg = this
      ;

      // add to the private and public flow stack
      activeFlows.unshift(pkg);
      corePkgDef.actives.unshift(pkg.proxy);

      pkg.preMove();
      // prevent going forward when pended by another flow
      if (pkg.pending) {
        pkg.tank.stop();
      }
    };

    corePkgDef.onNode = function (evtName, currentNodeIndex, lastNodeIndex) {
      var
        pkg = this,
        state = pkg.proxy.state,
        nodes = pkg.nodes,
        currentNode = nodes[currentNodeIndex],
        lastNode = nodes[lastNodeIndex]
      ;
      // set nodal info
      state.name = currentNode.name;
      state.index = currentNode.index;
      state.depth = currentNode.depth;
      state.path = currentNode.path;
      state.pendable = currentNode.pendable;
      state.phase = -1;

      // lock or unlock flow
      if (currentNode.lGate || lastNode.lGate) {
        pkg.locked = currentNode.lock;
      }
    };

    corePkgDef.onScope = function (evtName, entering) {
      var
        pkg = this,
        node = pkg.nodes[pkg.tank.currentIndex]
      ;
      if (entering) {
        // set phase to "in"
        pkg.phase = 1;
      } else {
        // set phase to "out"
        pkg.phase = 2;
      }

      // scope node data
      if (node.dcfgs.length) {
        node.scopeData(entering);
      }

      // notify owner before entering and after exiting this node
      if (node.pGate && ~node.ping) {
        pkg.pingOwner(node.ping);
      }
    };

    corePkgDef.onEngage = function () {
      var pkg = this;
      // trust api calls
      pkg.trust = 1;

      pkg.setVars();
    };

    corePkgDef.onRelease = function () {
      var pkg = this;
      // untrust api calls
      pkg.trust = 0;

      pkg.delVars();
    };

    // do something when the tank traverses a node
    corePkgDef.onTraverse = function (evtName, phase) {
      var
        pkg = this,
        tank = pkg.tank,
        node = pkg.nodes[tank.currentIndex],
        parentNode = pkg.nodes[node.parentIndex]
      ;

      pkg.proxy.state.phase = traversalCallbackOrder[pkg.phase = phase];

      // capture when this node was a tank target
      if (!~tank.targetIndex) {
        pkg.tgtTrail = pkg.targets.shift();
      }

      // set store capture criteria
      if (phase < 3) {
        pkg.bin.on = node.criteria;
      } else if (parentNode) {
        pkg.bin.on = parentNode.criteria;
      } else {
        pkg.bin.on = 0;
      }

      // prepend sequence node targets
      if (node.seq && !phase) {
        pkg.proxy.go.apply(pkg.proxy, node.seq);
      }

      // invoke and track phase function
      if (node.fncs[phase]) {
        pkg.calls.push(node.index + '.' + phase);
        // include arguments for the "on" function
        pkg.result = node.fncs[phase].apply(pkg.proxy, (pkg.targets.length ? [] : pkg.args));

        if (pkg.paused || pkg.pending) {
          pkg.result = undefined;
        }
      }
    };

    // execute delayed functions
    corePkgDef.onTraversing = function (evtName, phase) {
      var pkg = this;

      // execute any delay function
      if (pkg.waitFnc) {
        pkg.waitFnc.apply(pkg.proxy, pkg.waitArgs);
        // clear delay components
        pkg.waitFnc =
        pkg.waitArgs =
          0;
      }
    };

    // complete traversing a node facet
    corePkgDef.onTraversed = function (evtName, phase) {
      var
        pkg = this,
        proxy = pkg.proxy,
        node = pkg.nodes[pkg.tank.currentIndex]
      ;

      // reconcile qualifying instances
      pkg.bin.commit();

      // when completing the "on" phase
      if (pkg.phase) {
        // track completed target
        if (~pkg.tgtTrail) {
          pkg.trail[pkg.trail.length] = pkg.tgtTrail;
          pkg.tgtTrail = -1;
        }
        // update owning flow
        if (!pkg.targets.length && ~node.ping) {
          pkg.pingOwner(node.ping);
        }
      }
      if (typeof proxy.vars === 'object') {
        pkg.vars = proxy.vars;
      }
      proxy.vars = pkg.vars;
    };

    // do something when the tank stops
    corePkgDef.onEnd = function (evtName) {
      var
        pkg = this,
        tank = pkg.tank,
        parentFlow = activeFlows[1],
        blocked = pkg.pause || pkg.pending || pkg.phase,
        hasTargets = pkg.targets.length,
        node = pkg.nodes[tank.currentIndex]
      ;

      if (!blocked && (hasTargets || ~node.tail)) {
        if (hasTargets) {
          // direct tank to the next state
          tank.go(pkg.targets[0]);
        } else {
          // instruct flow to tail state
          pkg.proxy.go(node.tail);
        }
      } else {
        if (blocked) {
          // link pendable parents with this pendable state
          if (
            parentFlow &&
            parentFlow.nodes[parentFlow.tank.currentIndex].pendable &&
            node.pendable &&
            !pkg.pendees[parentFlow.tank.id]
          ) {
            // bind parent and this flow
            parentFlow.pending++;
            pkg.pendees[parentFlow.tank.id] = parentFlow;
            parentFlow.tank.stop();
          }
        } else {

          // reset sequence trackers
          pkg.args = [];
          pkg.calls = [];
          pkg.trail = [];

          if (!node.index) {
            // reset vars when ending on the null node
            pkg.vars = {};
          }

          // update pending flows
          if (pkg.pendees.length) {
            // first, reduce pending count of each pended flow
            pkg.pendees.forEach(function (pendedFlow) {
              pendedFlow.pending--;
            });
            tank.post(function () {
              // then, resume each pended flow (once this flow is complete)
              pkg.pendees.splice(0).forEach(function (pendedFlow) {
                if (!(pendedFlow.pending || pendedFlow.pause)) {
                  pendedFlow.go();
                }
              });
            });
          }
        }
        // remove private and public activeflow status
        activeFlows.shift();
        corePkgDef.actives.shift();
      }
    };

    // Node prototype methods

    // add method to determine if another node can be targeted from this node
    corePkgDef.node.canTgt = function (targetNode) {
      var
        // alias the restrict node (if any)
        restrictingNode = this.pkg.nodes[this.restrict],
        // alias the ingress node of the target
        targetIngressNode = this.pkg.nodes[targetNode.ingress]
      ;

      // return true if this node is within it's restrictions (if any), or when we're within, targeting, or on the target's ingress node (if any)
      return (!restrictingNode || targetNode.within(restrictingNode)) && (!targetIngressNode || this === targetIngressNode || targetNode === targetIngressNode || this.within(targetIngressNode));
    };

    // add method to de/scope defined variables
    corePkgDef.node.scopeData = function (add) {
      var
        node = this,
        pkg = node.pkg,
        data = pkg.proxy.data,
        dataCfgs = node.dcfgs,
        dataCfgLn = dataCfgs.length,
        dataCfgIdx = 0,
        dataCfg,
        dataName,
        dataTrackingObject,
        scopeAction
      ;
      // define scoping routine
      if (add) {
        // scope new value to stack - set value from config
        scopeAction = function () {
          // capture current value in stack (if any)
          if (data.hasOwnProperty(dataName)) {
            // capture current value in stack
            dataTrackingObject.stack.unshift(data[dataName]);
          }
          if (dataCfg.use) {
            // set key to value from config
            data[dataName] = dataCfg.value;
          } else {
            // set key to last value or undefined (by default)
            data[dataName] = dataTrackingObject.stack[0];
          }
        };
      } else {
        // set value form stack and remove
        scopeAction = function () {
          if (dataTrackingObject.stack.length) {
            // use and remove value from stack
            data[dataName] = dataTrackingObject.stack.shift();
          } else {
            // remove tracking object and data member
            delete pkg.dtos[dataName];
            delete data[dataName];
          }
        };
      }

      for (; dataCfgIdx < dataCfgLn; dataCfgIdx++) {
        dataCfg = dataCfgs[dataCfgIdx];
        dataName = dataCfg.name;
        dataTrackingObject = pkg.getDTO(dataName);
        scopeAction();
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

    // Flow prototype methods

    // add method to return callbacks to this flow's states
    corePkgDef.proxy.callbacks = function (origQry) {
      var
        pkg = corePkgDef(this),
        nodes = pkg.nodes,
        qry = origQry,
        qryType = typeof qry,
        customCallback;

      /*
        Not passing arguments returns the program root state.
        From here, the callback for every program state may be targeted with dot-notation.

        eg: flow.callbacks().any.state.in.the.tree();
      */
      if (!arguments.length) {
        return nodes[1].cb;
      }

      /*
        Pass boolean true for the callback of the current state.

        eg: flow.callbacks(true);
      */
      if (qry === true) {
        return nodes[pkg.tank.currentIndex].cb;
      }

      /*
        Pass a valid index to retrieve the callback of a matching state node.

        eg: flow.callbacks(4);
      */
      if (qryType === 'number' && nodes[qry]) {
        return nodes[qry].cb;
      }

      // ensure strings have an ending slash
      if (qryType === 'string' && qry.charAt(qry.length - 1) !== '/') {
        qry += '/';
      }

      /*
        Compare string with existing current id.

        eg: flow.callbacks(obj);
      */
      if (pkg.nids.hasOwnProperty(qry)) {
        return nodes[pkg.nids[qry]].cb;
      }

      /*
        Check out whether this path has already been processed and cache.
      */
      if (qryType === 'string') {
        if (pkg.cbs.hasOwnProperty(origQry)) {
          return pkg.cbs[origQry];
        }

        customCallback = function () {
          return pkg.proxy.target.apply(pkg.proxy, [origQry].concat(protoSlice.call(arguments)));
        };
        // preserve query via the .toString() method
        customCallback.toString = function () {
          return origQry;
        };

        // return cached custom callback
        return pkg.cbs[origQry] = customCallback;
      }

      return false;
    };

    // add method to
    corePkgDef.proxy.query = function () {
      var
        // get package instance
        pkg = corePkgDef(this),
        // alias for minification
        args = arguments,
        // node indice resolved by query
        nodes = []
      ;
      // return false, a string or array of strings, based on whether a single node reference fails
      return (
        // at least one parameter
        args.length &&
        // all parameters resolve to nodes
        protoSlice.call(arguments).every(function (nodeRef) {
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
          };
      }
      // (otherwise) return false
      return false;
    };

    // access and edit the arguments passed to traversal functions
    corePkgDef.proxy.args = function (idx, value) {
      var
        pkg = corePkgDef(this),
        pkgArgs = pkg.args,
        argCnt = arguments.length,
        isInt = typeof idx === 'number' && ~~idx === idx
      ;

      if (pkg.allowed() || !pkg.locked) {
        // return cparray of arguments
        if (argCnt === 0) {
          return [].concat(pkgArgs);
        }
        if (argCnt === 1) {
          if (isInt) {
            // return specific argument
            return pkgArgs[idx];
          }
          if (isArray(idx)) {
            // set new arguments
            pkg.args = [].concat(idx);
            return idx;
          }
        }
        if (argCnt === 2 && isInt) {
          if (idx === pkgArgs.length - 1 && value === undefined) {
            pkgArgs.pop();
            return true;
          }
          return pkgArgs[idx] = value;
        }
      }
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
        pkg.args = protoSlice.call(arguments).slice(1);
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
          // false when pending
          // true when paused or not pending
        // when external (outside a program-function)
          // false when pending
          // false when paused
          // false when exiting outside of phase 0 (_on)
          // true when the traversal result is undefined
          // the traversal result otherwise the traversal result is returned
      if (pkg.pending) {
        return false;
      } else if (pkg.allowed()) {
        return true;
      } else if (pkg.pause || pkg.phase) {
        return false;
      } else if (pkg.result === undefined) {
        return true;
      } else {
        return pkg.result;
      } 
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
        protoSlice.call(arguments).every(function (nodeRef) {
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
        // collect remaining arguments when there is an action
        callbackArgs = noAction ? [] : protoSlice.call(args, 2),
        // capture first argument as action to take after the delay, when more than one argument is passed
        delayFnc = noAction ? 0 : args[0],
        // flag when the delay is a function
        isFnc = typeof delayFnc === 'function',
        // get node referenced by delayFnc (the first argument) - no vet check, since this would be a privileged call
        delayNodeIdx = pkg.indexOf(delayFnc),
        // use first or last argument as a time
        time = args[noAction ? 0 : 1]
      ;
      // if allowed and the the argument's are valid...
      if (pkg.allowed() && (!argLn || (time >= 0 && typeof time === 'number' && (noAction || ~delayNodeIdx || isFnc)))) {
        // flag that we've paused this flow
        pkg.pause = 1;
        // stop the tank
        pkg.tank.stop();
        // clear any timer
        clearTimeout(pkg.waitTimer);
        // set delay to truthy value, callback, or traversal call
        pkg.waitTimer = argLn ?
          setTimeout(
            function () {
              // if there is a delay action and it's a node index...
              if (!noAction && ~delayNodeIdx) {
                // if passing arguments to this target...
                if (callbackArgs.length) {
                  // prepend target to arguments
                  callbackArgs.unshift(delayNodeIdx);
                  // target this node index and pass arguments
                  pkg.proxy.target.apply(pkg.proxy, callbackArgs);
                } else {
                  // target this node index
                  pkg.proxy.target(delayNodeIdx);
                }
              } else { // otherwise, when there is no delay, or the action is a callback...
                // if there is a callback function...
                if (isFnc) {
                  // set delay callback (fired during subsequent "begin" event)
                  pkg.waitFnc = delayFnc;
                  pkg.waitArgs = callbackArgs;
                }
                // traverse towards the current target
                pkg.go(1);
              }
            },
            ~~time // number of milliseconds to wait (converted to an integer)
          ) :
          1; // set to 1 to pause indefinitely
        // indicate that this flow has been delayed
        return true;
      }
      // return whether this function caused a delay
      return false;
    };

    // retrieve the flow that owns this one, if any
    // owner may be set by the owner or child
    // owner may be removed by the owner or child
    corePkgDef.proxy.owner = function (arg) {
      var
        pkg = corePkgDef(this),
        activeFlow = activeFlows[0],
        // flag when allowed or the active flow is the owner
        ownerAccess = pkg.ownable && (pkg.allowed() || activeFlow === pkg.owner)
      ;

      if (ownerAccess) {

        if (arguments.length) {
          // replace/assign owner
          if (arg instanceof Flow && arg !== pkg.proxy) {
            pkg.owner = corePkgDef(arg);
            return arg;
          }
          // remove owner
          if (arg === false && pkg.owner) {
            pkg.owner = 0;
            return true;
          }
        } else if (pkg.owner) {
          // retrieve current owner
          return pkg.owner.proxy;
        }

        // fail passed arguments
        return false;

      }
      // test presence of an owner
      return !!pkg.owner;
    };

    /*
      Manipulate the current or master collection of captured instances,
      in the following ways.

      1) Retrieve instances:

        [simple]
          this.flows();

        [simple query]
          this.flows('somestate'); // equivalent to < states: 'somestate' >
          this.flows('some/path'); // equivalent to < paths: 'some/path' >
          this.flows(true); // all flows
          this.flows(2); // all flows at state index 2

        [advanced]
          this.flows('get', criteria); // retrieve matching instaces
          this.flows('get', 'buffer'); // retrieve bufferred instances

        Returns an array of matching instances.
        Uses flow filters by default (set by the _store tag).
        Retrieving the buffer returns all uncommitted flows.

      2) Add instances:

        [simple]
          this.flows(flow1, flow2, ...);

        [advanced]
          this.flows('add', [flow1, flow2, ...]);
          this.flows('buffer', [flow1, flow2, ... ]);

        Returns true on success. Adding is a privileged action.
        Returns false is any of the added items are not flow instances.

      3) Remove instances:

        [simple]
          this.flows('remove', true); // remove all instances
          this.flows('remove', [flow1, flow2, ...]); // remove specific instances

        [advanced]
          this.flows('remove', criteria); // remove matching instances
          this.flows('remove', 'buffer'); // remove bufferred instances

        Returns true on succcess. Removal is a privileged action.

      For retrieval and removal, a configuration object may be passed to filter which  instances are targeted.
      Below are the optional keys for criteria, along with their defaults (where applicable).

      Criteria Options
      ---------------------------

        qry_strict
          A truthy value that is false by default.
          Indicates when all criteria must be satisfied before including an instance.

        qry_invert
          A truthy value that is false by default.
          Indicates when to include non-matching instances.

        states
          One or an array of criteria for the current state.
          Selects flows where the name matches the given string.
          Selects flows where the index matches the given whole number.
          Selects flows where the name satisfies the given regular expression.

        paths
          One or an array of criteria for the current state's path.
          Selects flows where the path contains the given string.
          Selects flows where the name satisfies the given regular expression.

        programs
          One or an array of program objects.
          Selects flows compiled from the given value.

    */
    corePkgDef.proxy.flows = function (cmd, cfg) {
      var
        pkg = corePkgDef(this),
        argumentsLength = arguments.length,
        selectBufferredPkgs = cfg === 'buffer' && argumentsLength === 2,
        privileged = pkg.allowed() || pkg.owner === activeFlows[0],
        result
      ;

      // route simplified 'add'
      if (typeof cmd === 'object') {
        cmd = 'add';
        cfg = protoSlice.call(arguments);
      } else if (argumentsLength < 2) {
        // route simplified 'get'
        cmd = 'get';
        if (argumentsLength) {
          cfg = compileFilterCriteria(cmd);
        } else {
          cfg = pkg.nodes[pkg.tank.currentIndex].criteria || compileFilterCriteria(true);
        }
      }

      // validate and invoke commmand on insts
      if (
        // allow all gets except unprivileged ones searching all items
        cmd === 'get' ||
        // only remove, add, or buffer when privileged
        (privileged &&
          (cmd === 'remove' || cmd === 'add' || cmd === 'buffer')
        )
      ) {
        if (selectBufferredPkgs && (cmd === 'remove' || cmd === 'get')) {
          cfg = compileFilterCriteria(true);
        }
        result = pkg.bin[cmd](cfg, selectBufferredPkgs ? pkg.bin.tmp : 0);
        // only return match count to unprivileged calls
        if (cmd === 'get' && !privileged) {
          return result.length;
        }
        return result;
      }

      return false;
    };

    // return an object with status information about the flow and it's current state
    corePkgDef.proxy.status = function (metric) {
      var
        // get the package instance
        pkg = corePkgDef(this),
        // alias the current node
        currentNode = pkg.nodes[pkg.tank.currentIndex],
        obj = {},
        all = !arguments.length
      ;

      // callback-function for retrieving the node index
      function getPathFromIndex(idx) {
        return pkg.nodes[idx].path;
      }

      if (all || metric === 'trust') {
        obj.trust = !!pkg.trust;
      }

      if (all || metric === 'permit') {
        obj.permit = !!pkg.allowed();
      }

      if (all || metric === 'loops') {
        obj.loops = Math.max((pkg.calls.join().match(new RegExp('\\b' + pkg.tank.currentIndex + '.' + pkg.phase, 'g')) || []).length - 1, 0);
      }

      if (all || metric === 'paused') {
        obj.paused = !!pkg.pause;
      }

      if (all || metric === 'pending') {
        obj.pending = !!pkg.pending;
      }

      if (all || metric === 'targets') {
        obj.targets = pkg.targets.map(getPathFromIndex);
      }

      if (all || metric === 'trail') {
        obj.trail = pkg.trail.map(getPathFromIndex);
      }

      if (all) {
        return obj;
      } else {
        return obj[metric];
      }
    };

    return Flow;
  }

  // initialize and expose Flow, based on the environment
  if (inAMD) {
    define(initFlow);
  } else if (inCJS) {
    module.exports = initFlow(require, exports, module);
  } else if (!scope.Flow) {
    scope.Flow = initFlow();
  }
}(
  typeof define == 'function',
  typeof exports != 'undefined',
  Array, Math, Object, RegExp, this
);