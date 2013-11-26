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
/* global define, require, module */
!function (inAMD, inCJS, Array, Math, Object, RegExp, scope, undefined) {

  // dependent module initializer
  function initFlow(require) {

    var
      Flow = ((inCJS || inAMD) ? require('Panzer') : scope.Panzer).create(),
      rand_string = (Math.ceil(Math.random() * 5000) + 3000).toString(18),
      corePkgDef = Flow.pkg('core'),
      staticUnusedArray = [],
      protoSlice = Array.prototype.slice,
      RxpProto = RegExp.prototype,
      i, // loop vars
      isArray = (typeof Array.isArray === 'function') ?
        Array.isArray :
        function (obj) {
          return obj instanceof Array;
        },
      tokenPrefix = '@',
      defaultPermissions = {world: true, owner: true, sub: true},
      // regexps
      r_queryIsTokenized = new RegExp('[\\.\\|' + tokenPrefix + ']'),
      r_validAbsolutePath = /^\/\/(?:\w+\/)+/,
      r_trimSlashes = /^\/+|\/+$/g,
      r_hasNonAlphanumericCharacter = /\W/,
      r_hasAlphanumericCharacter = /\w/,
      r_rxpIsForPath = /^\/.*\/.*\//,
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
      criteriaCache = {},
      // in reverse-order of complexity
      criteriaKeys = [
        'has',
        'within',
        'on',
        'from',
        'is'
      ],
      criteriaKeysLength = criteriaKeys.length,
      coreTags = {
        // Specifies when a state is the base for rooted queries.
        _root: function (tagName, exists, tags, node, parentNode, pkg, idx) {
          if (idx < 2 || (exists && tags._root)) {
            node.rootIndex = idx;
          } else {
            node.rootIndex = parentNode.rootIndex;
          }
        },
        // Specifies when a state may not be exited with external calls.
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
        // Specify cascading permissions when a state is entered and exited
        _perms: function (tagName, exists, tags, node, parentNode, pkg) {
          var perms;
          if (exists) {
            perms = perms_parse(tags[tagName], parentNode.lp);
            if (perms) {
              node.perms = node.lp = perms;
            }
          } else if (parentNode) {
            node.perms = 0;
            node.lp = parentNode.lp;
          } else {
            // initialize perms in the null node
            pkg.perms = [node.perms = node.lp = defaultPermissions];
          }
        },
        // Defines the path to update an owning flow - if any.
        _owner: function (tagName, exists, tags, node, parentNode, pkg) {
          node.oGate = 0;

          if (exists) {
            pkg.ownable =
            node.oGate =
              1;
            node.ping = tags._owner;
          } else if (parentNode) {
            node.ping = parentNode.ping;
          } else {
            node.ping = -1;
          }
        },
        // Define alias for this state, to use in queries.
        _name: function (tagName, exists, tags, node, parentNode, pkg, idx) {
          if (
            exists && tags._name && typeof tags._name === 'string' &&
            !r_queryIsTokenized.test(tags._name) && r_hasAlphanumericCharacter.test(tags._name)
          ) {
            pkg.tokens[tags._name] = {
              i: idx,
              f: 0
            };
            node.alias = tags._name;
          } else {
            node.alias = '';
          }
        },
        // Define criteria for preserving instances created while traversing this branch.
        _capture: function (tagName, exists, tags, node, parentNode, pkg) {
          if (exists) {
            node.caps = subs_sanitizeCriteria(tags._capture);
          } else if (parentNode) {
            node.caps = parentNode.caps;
          } else {
            node.caps = 0;
            pkg.caps = [];
          }
        },
        // Define data names and values for a branch.
        //
        // _data: 'foo'
        // _data: ['foo']
        // _data: {foo: 'bar'}
        // _data: ['foo', {zoo:'baz'}]
        _data: function (tagName, exists, tags, node) {
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
        // Specifies a branch to navigate after targeting this state.
        _sequence: function (tagName, exists, tags, node, parentNode) {
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
        // Specifies when a paused state will prevent parent flow's from completing their navigation.
        _pendable: function (tagName, exists, tags, node, parentNode) {
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
        _on: function (tagName, exists, tags, node) {
          var
            tagValue = tags[tagName]
          ;
          if (exists && typeof tagValue === 'function') {
            node.fncs[traversalCallbackOrder[tagName]] = tagValue;
          }
        },
        // Specifies where to direct the flow at the end of a sequence for a given branch
        _tail: function (tagName, exists, tags, node, parentNode, pkg) {
          var
            tagValue,
            tailData
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
        },
        // Specifies when a branch should be invisible to external queries
        _conceal: function (tagName, exists, tags, node, parentNode, pkg, idx) {
          node.conceal = -1;
          if (exists && idx > 1) {
            if (tags._conceal) {
              node.conceal = idx;
            }
          } else if (parentNode) {
            node.conceal = parentNode.conceal;
          }
        }
      },
      // tags that depend on other tags or require cleanup
      corePostTags = {
        // Clean up lastWalk flag
        _sequence: function (tagName, exists, tags, node) {
          delete node.lastWalk;
        },
        // Specifies where to direct the flow at the end of a sequence for a given branch
        _tail: function (tagName, exists, tags, node, parentNode, pkg) {
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
        // ensure node alias was not overridden
        _name: function (tagName, exists, tags, node, parentNode, pkg, idx) {
          var alias = node.alias;
          if (idx === 0) {
            node.alias = 'null';
          } else if (idx === 1) {
            node.alias = 'program';
          } else if (alias && pkg.tokens[alias].i !== idx) {
            node.alias = '';
          }
        },
        // Process callbacks that are redirects
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
        },
        _perms: function (tagName, exists, tags, node) {
          delete node.lp;
        }
      },
      // actions to take when entering and exiting a node
      nodeScopeActions = {
        // ping owner
        0: function (node, pkg) {
          // notify owner before entering and after exiting this node
          if (node.oGate && ~node.ping) {
            pkg.pingOwner(node.ping);
          }
        },
        // scope data
        1: function (node, pkg, add) {
          var
            data = pkg.proxy.data,
            dataCfgs = node.dcfgs,
            dataCfgLn = dataCfgs.length,
            dataCfgIdx = 0,
            dataCfg,
            dataName,
            dataTrackingObject,
            scopeAction
          ;
          // exit when there are no configurations for this node
          if (!node.dcfgs.length) {
            return;
          }
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
        },
        // permissions stack
        2: function (node, pkg, add) {
          shared_nodeStackHandler(pkg.perms, node.perms, add);
        },
        // capture criteria stack
        3: function (node, pkg, add) {
          shared_nodeStackHandler(pkg.caps, node.caps, add);
        }
      },
      nodeScopeActionsLength = 4,
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

    function isFlow(thing) {
      return thing instanceof Flow;
    }

    // add or remove from stack when there is an item
    function shared_nodeStackHandler(stack, item, add) {
      if (item) {
        if (add) {
          stack.unshift(item);
        } else {
          stack.shift();
        }
      }
    }

    function sharedNullFunction() {}

    function subs_addInsts (collection, subInsts, pkg) {
      var
        node = pkg.nodes[pkg.tank.currentIndex],
        i = 0,
        subInst,
        subId,
        totalAdded = 0
      ;
      for (; subInst = subInsts[i]; i++) {
        subId = subInst.tank.id;
        if (!collection.hasOwnProperty(subId)) {
          totalAdded++;
          collection[subId] = {
            inst: subInst,
            cap: node
          };
        }
      }
      return totalAdded;
    }

    function subs_removeInsts (collection, subInsts) {
      var
        i = subInsts.length,
        subInst,
        subId,
        totalRemoved = 0
      ;
      while (i--) {
        subInst = subInsts[i];
        subId = subInst.tank.id;
        if (collection.hasOwnProperty(subId)) {
          totalRemoved++;
          delete collection[subId];
        }
      }
      return totalRemoved;
    }

    function subs_getInsts (collection, criteria) {
      var
        criteriaKey,
        criteriaKeyIdx,
        criteriaOption,
        criteriaOptions,
        criteriaOptionIdx,
        criteriaOptionsLength,
        subSet,
        subSetId,
        matches = []
      ;
      nextSubset:
      for (subSetId in collection) {
        if (collection.hasOwnProperty(subSetId)) {
          // get subSet to test
          subSet = collection[subSetId];
          // reset criteria key index
          criteriaKeyIdx = criteriaKeysLength;
          nextCriteria:
          while (criteriaKeyIdx--) {
            // get the criteria key
            criteriaKey = criteriaKeys[criteriaKeyIdx];
            // setup criteria option loop vars
            criteriaOptions = criteria[criteriaKey];
            criteriaOptionsLength = criteriaOptions.length;
            // if this key has options...
            if (criteriaOptionsLength) {
              for (criteriaOptionIdx = 0; criteriaOptionIdx < criteriaOptionsLength; criteriaOptionIdx++) {
                criteriaOption = criteriaOptions[criteriaOptionIdx];
                // if this criteria option has not not compiled...
                if (criteriaOptionIdx >= criteriaOptions.made) {
                  // capture and replace option at index with compiled version
                  criteriaOption = criteriaOptions[criteriaOptionIdx] = subs_compileCriteriaOption(criteriaKey, criteriaOption, typeof criteriaOption);
                  // flag that this option is now compiled
                  criteriaOptions.made++;
                }
                // test result of compiled criteria option's function
                // pass in the subset, and criteria object
                if (criteriaOption.f(subSet, criteriaOption)) {
                  // add subset instance to matches
                  matches[matches.length] = subSet.inst;
                  // continue to the next criteria, since it's been satisfied
                  continue nextCriteria;
                }
              }
              // since no options of this criteria were satisfied, skip to the next subSet in the collection
              continue nextSubset;
            }
          }
        }
      }
      return matches;
    }

    function subs_sanitizeCriteria(raw) {
      var
        criteria,
        criteriaKey,
        criteriaKeyIdx,
        criteriaCacheId,
        rxpOldToJSON,
        typeofRaw,
        isRegExp,
        specifiesCriteria
      ;

      // if raw is null or undefined...
      if (raw === null || raw === undefined) {
        // set to false (capture nothing)
        raw = false;
      }

      // get type or raw value
      typeofRaw = typeof raw;

      // if not an object, or does not have "is" criteria...
      if (typeofRaw !== 'object' || !raw.hasOwnProperty('is')) {
        if (RxpProto.hasOwnProperty('toJSON')) {
          // capture existing .toJSON() method
          rxpOldToJSON = RxpProto.toJSON;
        }
        // augment .toJSON() for any array's with nested RegExp's
        RxpProto.toJSON = subs_stainRxpInJSON;
        // get cache id for this criteria - prefix to avoid native collisiions
        criteriaCacheId = 'c' + JSON.stringify(raw);
        // reset .toJSON() for RegExp's
        if (rxpOldToJSON) {
          RxpProto.toJSON = rxpOldToJSON;
        } else {
          delete RxpProto.toJSON;
        }

        if (criteriaCache.hasOwnProperty(criteriaCacheId)) {
          // exit when this criteria has already been sanitized
          return criteriaCache[criteriaCacheId];
        }
      }

      // define criteria to return
      criteria = {buffer: -1};

      // handle short-forms
      if (typeofRaw === 'boolean' && raw) {
        // `true` means match all sub-instances at or within this index
        criteria.on = ['/'];
        criteria.on.made = 0;
      } else if (
        // calculate here - only when necessary
        (isRegExp = raw instanceof RegExp) ||
        (typeofRaw === 'string' && raw) ||
        (typeofRaw === 'number' && raw === ~~raw)
      ) {
        criteria.on = [raw];
        criteria.on.made = 0;
      } else if (typeofRaw === 'object' && !isRegExp) {
        // sanitize known criteria from the raw object
        criteriaKeyIdx = criteriaKeysLength;
        while(criteriaKeyIdx--) {
          criteriaKey = criteriaKeys[criteriaKeyIdx];
          if (raw.hasOwnProperty(criteriaKey)) {
            // extract object criteria, as a set of options (i.e., an array)
            criteria[criteriaKey] = isArray(raw[criteriaKey]) ? protoSlice.call(raw[criteriaKey]) : [raw[criteriaKey]];
            criteria[criteriaKey].made = 0;
            specifiesCriteria = 1;
          }
        }
      }

      // ensure all criteria are present
      criteriaKeyIdx = criteriaKeysLength;
      while (criteriaKeyIdx--) {
        criteriaKey = criteriaKeys[criteriaKeyIdx];
        if (!criteria.hasOwnProperty(criteriaKey)) {
          // use default empty option list (no need to track compiled options)
          criteria[criteriaKey] = staticUnusedArray;
        }
      }

      // sanitize buffer
      if (raw.hasOwnProperty('buffer')) {
        // capture all, when only option is buffer
        if (!specifiesCriteria) {
          criteria.on = ['/'];
          criteria.on.made = 0;
        }
        if (raw.buffer !== -1) {
          criteria.buffer = raw.buffer ? 1 : 0;
        }
      }

      if (criteriaCacheId) {
        // add sanitized criteria to cache
        criteriaCache[criteriaCacheId] = criteria;
      }

      return criteria;
    }

    // pre-cache the criteria compilation of `true`
    subs_sanitizeCriteria(true);

    // compilation will usually involve searching a set or string with a regexp or string
    function subs_compileCriteriaOption(criteriaKey, value, typeofValue) {
      var
        isRegExp = value instanceof RegExp,
        option = {
          v: value,
          f: sharedNullFunction
        }
      ;
      if (criteriaKey === 'has') {
        // compile "has" criteria
        if (isRegExp) {
          option.f = subs_filter_searchSetRxp;
          option.g = subs_filter_getSubInstMember;
          if (r_rxpIsForPath.test(value)) {
            option.m = 'pAry';
          } else {
            option.m = 'sAry';
          }
        } else if (value && typeofValue === 'string') {
          option.g = subs_filter_getSubInstMember;
          if (~value.indexOf('/')) {
            option.f = subs_filter_searchSet;
            option.m = 'pAry';
            // wrap in slashes to match whole sub-paths
            if (option.v.charAt(0) !== '/') {
              option.v = '/' + option.v;
            }
            if (option.v.substr(-1) !== '/') {
              option.v += '/';
            }
          } else {
            option.f = subs_filter_matchSet;
            option.m = 'sAry';
          }
        } else if (
          typeofValue === 'number' &&
          value >= 0 &&
          value === ~~value
        ) {
          option.f = subs_filter_has_index;
        }
      } else if (criteriaKey === 'from') {
        // compile "from" criteria
        if (isRegExp) {
          if (r_rxpIsForPath.test(value)) {
            option.f = subs_filter_searchRxp;
            option.g = subs_filter_from_path;
          } else {
            option.f = subs_filter_searchSetRxp;
            option.g = subs_filter_from_pathParts;
          }
        } else if (value && typeofValue === 'string') {
          if (~value.indexOf('/')) {
            option.f = subs_filter_search;
            option.g = subs_filter_from_path;
            // wrap in slashes to match whole sub-paths
            if (option.v.charAt(0) !== '/') {
              option.v = '/' + option.v;
            }
            if (option.v.substr(-1) !== '/') {
              option.v += '/';
            }
          } else {
            option.f = subs_filter_matchSet;
            option.g = subs_filter_from_pathParts;
          }
        } else if (
          typeofValue === 'number' &&
          value >= 0 &&
          value === ~~value
        ) {
          option.f = subs_filter_match;
          option.g = subs_filter_from_index;
        }
      } else if (criteriaKey === 'is') {
        // compile "is" criteria
        option.f = subs_filter_is;
      } else if (criteriaKey === 'on') {
        // compile "on" criteria
        if (isRegExp) {
          option.f = subs_filter_searchRxp;
          if (r_rxpIsForPath.test(value)) {
            option.g = subs_filter_getStateProperty;
            option.m = 'path';
          } else {
            option.g = subs_filter_getStateProperty;
            option.m = 'name';
          }
        } else if (value && typeofValue === 'string') {
          if (~value.indexOf('/')) {
            option.f = subs_filter_search;
            option.g = subs_filter_getStateProperty;
            option.m = 'path';
            // wrap in slashes to match whole sub-paths
            if (option.v.charAt(0) !== '/') {
              option.v = '/' + option.v;
            }
            if (option.v.substr(-1) !== '/') {
              option.v += '/';
            }
          } else {
            option.f = subs_filter_match;
            option.g = subs_filter_getStateProperty;
            option.m = 'name';
          }
        } else if (
          typeofValue === 'number' &&
          value >= 0 &&
          value === ~~value
        ) {
          option.f = subs_filter_match;
          option.g = subs_filter_getStateProperty;
          option.m = 'index';
        }
      } else if (criteriaKey === 'within') {
        // compile "within" criteria
        if (isRegExp) {
          if (r_rxpIsForPath.test(value)) {
            option.f = subs_filter_searchRxp;
            option.g = subs_filter_within_path;
          } else {
            option.f = subs_filter_searchSetRxp;
            option.g = subs_filter_within_pathParts;
          }
        } else if (value && typeofValue === 'string') {
          if (~value.indexOf('/')) {
            option.f = subs_filter_search;
            option.g = subs_filter_within_path;
            // wrap in slashes to match whole sub-paths
            if (option.v.charAt(0) !== '/') {
              option.v = '/' + option.v;
            }
            if (option.v.substr(-1) !== '/') {
              option.v += '/';
            }
          } else {
            option.f = subs_filter_matchSet;
            option.g = subs_filter_within_pathParts;
          }
        } else if (
          typeofValue === 'number' &&
          value > -1 &&
          value === ~~value
        ) {
          option.f = subs_filter_within_index;
        }
      }
      return option;
    }

    // sub-instance helper functions

    // prepend regex with random string
    function subs_stainRxpInJSON() {
      return rand_string + this;
    }

    // generic needle search a string
    // expects params.v to be the needle
    // expects params.g to be a function that gets the haystack
    function subs_filter_search(subSet, params) {
      return ~params.g(subSet, params).indexOf(params.v);
    }

    // generic regexp search a string
    // expects params.v to be the regexp
    // expects params.g to be a function that gets the string
    function subs_filter_searchRxp(subSet, params) {
      return params.v.test(params.g(subSet, params));
    }

    // generic regexp search over set of strings
    // expects params.v to be the regexp
    // expects params.g to be a function that gets the set
    function subs_filter_searchSetRxp(subSet, params) {
      var
        set = params.g(subSet, params),
        setIdx = set.length,
        rxp = params.v
      ;
      while (setIdx--) {
        if (rxp.test(set[setIdx])) {
          return 1;
        }
      }
    }

    // generic string set search
    // expects params.v to be the needle
    // expects params.g to be a function that gets the set
    function subs_filter_searchSet(subSet, params) {
      var
        set = params.g(subSet, params),
        setIdx = set.length,
        hay,
        match = params.v
      ;
      while (setIdx--) {
        hay = set[setIdx];
        if (~hay.indexOf(match)) {
          return 1;
        }
      }
    }

    // generic match between values
    // expects params.v to be the match
    // expects params.g to be a function that gets the comparison value
    function subs_filter_match(subSet, params) {
      return params.v === params.g(subSet, params);
    }

    // generic string set match
    // expects params.v to be the match
    // expects params.g to be a function that gets the set
    function subs_filter_matchSet(subSet, params) {
      var
        set = params.g(subSet, params),
        setIdx = set.length,
        match = params.v
      ;
      while (setIdx--) {
        if (set[setIdx] === match) {
          return 1;
        }
      }
    }

    // returns property of subInst
    // expects params.m to be a member of the sub-instance
    function subs_filter_getSubInstMember(subSet, params) {
      return subSet.inst[params.m];
    }

    // returns property of subInst
    // expects params.m to be a member of the sub-instance
    function subs_filter_getStateProperty(subSet, params) {
      var subInst = subSet.inst;
      return subInst.nodes[subInst.tank.currentIndex][params.m];
    }

    // criteria "is" filter functions

    function subs_filter_is(subSet, params) {
      // the sub-instance must be sourced by the parameterized value
      return subSet.inst.nodes[1].value === params.v;
    }

    // criteria "has" filter functions

    // returns true when params.v is within the given index
    function subs_filter_has_index(subSet, params) {
      return params.v < subSet.inst.nodes.length;
    }

    // criteria "from" filter functions

    // returns subSet capture path
    function subs_filter_from_path(subSet) {
      return subSet.cap.path;
    }

    // returns subSet capture path as an array of states
    // returns an empty array when the path is the null or program state
    function subs_filter_from_pathParts(subSet) {
      var captureNode = subSet.cap;
      if (captureNode.index > 1) {
        return captureNode.path.slice(2, -1).split('/');
      }
      return staticUnusedArray;
    }

    // returns index that sub-instance was capture
    function subs_filter_from_index(subSet) {
      return subSet.cap.index;
    }

    // returns path of current state's parent
    function subs_filter_within_path(subSet) {
      var
        subInst = subSet.inst,
        currentNode = subInst.nodes[subInst.tank.currentIndex]
      ;
      if (~currentNode.parentIndex) {
        return subInst.nodes[currentNode.parentIndex].path;
      }
      return '';
    }

    // returns path parts of current state's parent path
    function subs_filter_within_pathParts(subSet) {
      var
        subInst = subSet.inst,
        currentNode = subInst.nodes[subInst.tank.currentIndex]
      ;
      if (currentNode.parentIndex > 1) {
        return subInst.nodes[currentNode.parentIndex].path.slice(2, -1).split('/');
      }
      return staticUnusedArray;
    }

    // returns true when the sub-instance's current node is within the given state index
    function subs_filter_within_index(subSet, params) {
      var
        subInst = subSet.inst,
        nodes = subInst.nodes,
        currentNode = nodes[subInst.tank.currentIndex],
        targetNode = nodes[params.v]
      ;
      if (targetNode) {
        return currentNode.within(targetNode);
      }
    }

    // shallow object merge
    function extend(base) {
      var
        argumentIdx = 1,
        source,
        member
      ;
      for (; source = arguments[argumentIdx]; argumentIdx++) {
        for (member in source) {
          if (source.hasOwnProperty(member)) {
            base[member] = source[member];
          }
        }
      }
      return base;
    }

    function perms_parse(option, lastPerms) {
      var
        perms,
        deny,
        typeofOption = typeof option,
        optionIdx,
        optionLength,
        key
      ;
      if (typeofOption === 'object' && isArray(option)) {
        optionLength = option.length;
        for (optionIdx = 0; optionIdx < optionLength; optionIdx++) {
          lastPerms = perms_parse(option[optionIdx], lastPerms);
        }
      } else if (
        typeofOption === 'string' ||
        typeofOption === 'object' ||
        typeofOption === 'boolean'
      ) {
        perms = extend({}, lastPerms);
        if (typeofOption === 'string' && option) {
          deny = option.charAt(0) === '!';
          if (deny) {
            option = option.substr(1);
          }
          perms[option] = !deny;
        } else if (typeofOption === 'boolean') {
          for (key in perms) {
            if (perms.hasOwnProperty(key)) {
              perms[key] = option;
            }
          }
        } else {
          extend(perms, option);
        }
        return perms;
      }
      // return new or old lastPerms
      return lastPerms;
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
          _on: state
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
        sourceStateType = typeof sourceState,
        importTagValue,
        importPath
      ;

      if (sourceStateType === 'string') {
        importPath = sourceState;
      } else if (
        sourceStateType === 'object' &&
        sourceState.hasOwnProperty('_import')
      ) {
        importTagValue = sourceState._import;
        // determine whether we're importing a path or an (external) object
        if (typeof importTagValue === 'object') {
          if (importTagValue instanceof Flow) {
            importTagValue = corePkgDef(importTagValue).nodes[1].value;
          }
          baseState = corePkgDef.prepNode(importTagValue, importTagValue) || importTagValue;
        } else {
          importPath = importTagValue;
        }
      }

      // verify and resolve new program path
      if (
        importPath &&
        !importedPaths.hasOwnProperty(importPath) &&
        r_validAbsolutePath.test(importPath)
      ) {
        baseState = import_getStateByAbsolutePath(importPath, program);
      }

      // merge resolved state
      if (baseState) {
        if (sourceStateType === 'string') {
          // use base state directly
          resolvedState = import_mergeStates_convertToObject(baseState);
        } else if (sourceStateType === 'object') {
          // merge base state with this state
          resolvedState = import_mergeStates(baseState, sourceState);
        }
      }
      return resolvedState;
    }

    function sharedRedirectEventHandler() {
      var
        flow = this,
        pkg = corePkgDef(flow)
      ;
      flow.go(pkg.nodes[pkg.tank.currentIndex].reds[pkg.phase]);
    }

    // collection of active package-trees - exposed to support package integration
    corePkgDef.actives = [];

    // pattern for identifying tag keys
    corePkgDef.attrKey = /^_/;

    // pattern for identifying invalid state names
    corePkgDef.badKey = /^\d|^\W|[^a-zA-Z\d\-_\+=\(\)\*\&\^\%\$\#\!\~\`\{\}\"\'\:\;\?\, ]+|^toString$/;

    corePkgDef.prepTree = function (orig) {
      import_cacheTagKeyTests();

      if (isFlow(orig)) {
        // when given a Flow instance, return the original instance's program
        return corePkgDef(orig).nodes[1].value;
      }
    };

    corePkgDef.prepNode = function ( state, program ) {
      var
        finalState,
        tmpState = state
      ;
      // resolve all top-level imports for this state - avoid shallow-recursion
      // this is similar to sub-classing
      while (tmpState = import_resolveBase(tmpState, program, {})) {
        finalState = tmpState;
      }

      return finalState;
    };

    // initialize the package instance with custom properties
    // only argument is the object passed after the program when calling "new Flow(program, extraArg)"
    corePkgDef.init = function () {
      var
        pkg = this,
        activeFlow = activeFlows[0],
        sharedProxyDataMember = {},
        sharedProxyStateMember = {
          name: '_null',
          path: '..//',
          depth: 0,
          index: 0,
          pendable: true,
          alias: 'null'
        },
        nodes = pkg.nodes,
        nodeCount = nodes.length,
        i, j,
        node, parentNode, tagName,
        pkgId
      ;

      // init sub-instances hashes
      pkg.bin = {};
      pkg.tin = {};
      // sub-instance "has" criteria search helpers
      pkg.nStr =
      pkg.pStr =
        '|';
      pkg.sAry = [];
      pkg.pAry = [];
      // define initial vars member
      pkg.vars = {};
      // collection of custom query tokens
      pkg.tokens = {};
      // collection of custom callback queries
      pkg.cq = {};
      // collection of arguments for traversal functions
      pkg.args = [];
      // collection of node calls made while traversing
      pkg.calls = [];
      // collection of lock states - begin with unlocked
      pkg.locks = [0];
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
      // indicates when this flow is in the stack of navigating flows
      pkg.active = 0;
      // flag when being invoked by a blessed function
      pkg.blessed = 0;
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

        // index this node path
        pkg.nids[node.path] = i;

        if (i > 1) {
          // add to delimited string of names (for sub-instances "has" matching)
          pkg.nStr += node.name + '|';
          pkg.sAry[pkg.sAry.length] = node.name;
        }
        // add to delimited string of paths (for sub-instances "has" matching)
        pkg.pStr += node.path + '|';
        pkg.pAry[pkg.pAry.length] = node.path;

        // prep for tag compilation
        node.pkg = pkg;
        node.fncs = [0,0,0,0,0];
        node.reds = [];

        // run core tags
        for (j = 0; j < coreTagKeyCount; j++) {
          tagName = coreTagKeys[j];
          coreTags[tagName](tagName, node.attrs.hasOwnProperty(tagName), node.attrs, node, parentNode, pkg, i);
        }

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

        // auto capture to the active flow's temporary store
        if (activeFlow.caps[0]) {
          subs_addInsts(activeFlow.tin, [pkg], activeFlow);
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
          nodes = pkg.nodes,
          nids = pkg.nids,
          qryNode,
          simpleQuery,
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
                  resolvedIndex = -1;
                  // fail when an empty string
                  if (!token) {
                    break resolution;
                  }
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
          targetIdx = pkg.indexOf(qry, node)
        ;

        // if the target index exists (speed?)...
        if (~targetIdx) {
          if (!node) {
            // use the current node, when node is omitted
            node = pkg.nodes[pkg.tank.currentIndex];
          }
          // return the target index or -1, based on whether the target is valid, given the trust status of the package or the restrictions of the current node
          return node.canTgt(pkg.nodes[targetIdx]) ? targetIdx : -1;
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

      // flag when the caller given caller matches and has permission
      is: function () {
        var
          pkg = this,
          activeId,
          activeFlow = activeFlows[0],
          argumentIdx = arguments.length
        ;
        // short-circuit permissions when caller is SELF
        while (argumentIdx--) {
          switch (arguments[argumentIdx]) {
            case 'self':
              if (pkg.blessed || pkg === activeFlow) {
                return 1;
              }
            break;
            case 'owner':
              if (pkg.perms[0].owner && pkg.owner === activeFlow) {
                return 1;
              }
            break;
            case 'sub':
              if (activeFlow && (pkg.bin.hasOwnProperty((activeId = activeFlow.tank.id)) || pkg.tin.hasOwnProperty(activeId))) {
                return 1;
              }
            break;
            case 'world':
              if (pkg.perms[0].world && !pkg.is('sub', 'owner', 'self')) {
                return 1;
              }
            break;
          }
        }
        return 0;
      },

      // direct owning flow to the given state
      pingOwner: function (stateQuery) {
        var
          pkg = this,
          proxy = pkg.proxy,
          owner = pkg.owner
        ;
        if (owner) {
          owner.proxy.target(stateQuery, proxy, proxy.status(), extend({}, proxy.state));
        }
      },

      // set private members
      setPrivs: function () {
        var
          pkg = this,
          proxy = pkg.proxy
        ;

        // preserve untrusted vars member (if any)
        if (proxy.hasOwnProperty('vars')) {
          pkg.tvars = proxy.vars;
        }

        // preserve untrusted args member (if any)
        if (proxy.hasOwnProperty('args')) {
          pkg.targs = proxy.args;
        }
        // set "private" vars member
        proxy.vars = pkg.vars;        
        // set "private" args member
        proxy.args = pkg.args;
      },

      // unset vars member
      delPrivs: function () {
        var
          pkg = this,
          proxy = pkg.proxy
        ;
        // set and delete vars member
        if (proxy.vars !== pkg.vars && typeof proxy.vars === 'object') {
          pkg.vars = proxy.vars;
        }
        // set and delete args member
        if (proxy.args !== pkg.args && isArray(proxy.args)) {
          pkg.args = proxy.args;
        }
        if (pkg.hasOwnProperty('tvars')) {
          // restore public vars member
          proxy.vars = pkg.tvars;
          delete pkg.tvars;
        } else {
          // remove "private" vars member
          delete proxy.vars;
        }
        if (pkg.hasOwnProperty('targs')) {
          // restore public args member
          proxy.args = pkg.targs;
          delete pkg.targs;
        } else {
          // remove "private" args member
          delete proxy.args;
        }
      }

    };

    // do something when the tank starts moving
    corePkgDef.onBegin = function () {
      var
        pkg = this
      ;

      // add to the private and public flow stack
      activeFlows.unshift(pkg);
      corePkgDef.actives.unshift(pkg.proxy);
      pkg.active = 1;

      pkg.preMove();
      // prevent going forward when pended by another flow
      if (pkg.pending) {
        pkg.tank.stop();
      }
    };

    corePkgDef.onNode = function (evtName, currentNodeIndex) {
      var
        pkg = this,
        state = pkg.proxy.state,
        currentNode = pkg.nodes[currentNodeIndex]
      ;

      // set nodal info
      state.name = currentNode.name;
      state.index = currentNode.index;
      state.depth = currentNode.depth;
      state.path = currentNode.path;
      state.pendable = currentNode.pendable;
      state.alias = currentNode.alias;

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

      node.scope(entering);
    };

    corePkgDef.onEngage = function () {
      var pkg = this;

      pkg.setPrivs();
    };

    corePkgDef.onRelease = function () {
      var pkg = this;

      pkg.delPrivs();
    };

    // do something when the tank traverses a node
    corePkgDef.onTraverse = function (evtName, phase) {
      var
        pkg = this,
        tank = pkg.tank,
        node = pkg.nodes[tank.currentIndex]
      ;

      pkg.phase = phase;

      // capture when this node was a tank target
      if (!~tank.targetIndex) {
        pkg.tgtTrail = pkg.targets.shift();
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
    corePkgDef.onTraversing = function () {
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
    corePkgDef.onTraversed = function () {
      var
        pkg = this,
        proxy = pkg.proxy,
        node = pkg.nodes[pkg.tank.currentIndex]
      ;

      // capture qualifying instances and empty the tin
      if (node.caps) {
        subs_addInsts(pkg.bin, subs_getInsts(pkg.tin, node.caps), pkg);
      }
      pkg.tin = {};

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
      // use altered args if present
      if (proxy.args !== pkg.args && isArray(proxy.args)) {
        pkg.args = proxy.args;
      }
      if (typeof proxy.vars === 'object') {
        pkg.vars = proxy.vars;
      }
      proxy.vars = pkg.vars;
    };

    // do something when the tank stops
    corePkgDef.onEnd = function () {
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

          // inform owner that we've stopped
          if (~node.ping) {
            pkg.pingOwner(node.ping);
            // exit if owners end up directing this flow
            if (pkg.paused || pkg.pending || pkg.targets.length) {
              return;
            }
          }

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
        pkg.active = 0;
      }
    };

    // Node prototype methods

    // handle various asepcts of entering and exiting a node
    corePkgDef.node.scope = function (entering) {
      var
        node = this,
        pkg = node.pkg,
        actionIdx = nodeScopeActionsLength
      ;

      while (actionIdx--) {
        nodeScopeActions[actionIdx](node, pkg, entering);
      }
    };

    // add method to determine if another node can be targeted from this node
    corePkgDef.node.canTgt = function (targetNode) {
      var
        node = this,
        pkg = node.pkg,
        // alias the restrict node (if any)
        restrictingNode = node.pkg.nodes[this.restrict],
        // alias the ingress node of the target
        targetIngressNode = node.pkg.nodes[targetNode.ingress]
      ;

      // return true if this node is within it's restrictions (if any), or when we're within, targeting, or on the target's ingress node (if any)
      return pkg.is('sub', 'owner', 'self') ||
        (
          (
            // check if the target is within the restricting node - if any
            !restrictingNode ||
            targetNode.within(restrictingNode)
          ) &&
          (
            // check if the target is within (or is) an ingress node
            !targetIngressNode ||
            node === targetIngressNode ||
            targetNode === targetIngressNode ||
            this.within(targetIngressNode)
          ) &&
          // deny when the target node is hidden
          !~targetNode.conceal
        )
      ;
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
    corePkgDef.proxy.callbacks = function (qry, waypoint, bless) {
      var
        pkg = corePkgDef(this),
        customCallback,
        cacheId
      ;

      if (qry === true) {
        qry = pkg.tank.currentIndex;
      }

      waypoint = +!!waypoint;
      bless = +!!bless && pkg.is('self');

      cacheId = '' + qry + waypoint + bless;

      if (pkg.cq.hasOwnProperty(cacheId)) {
        return pkg.cq[cacheId];
      }

      customCallback = function () {
        var
          rslt,
          setBlessed
        ;
        if (bless && !pkg.blessed) {
          setBlessed = 1;
          pkg.blessed = 1;
        }
        if (waypoint) {
          rslt = pkg.proxy.go(qry);
        } else {
          rslt = pkg.proxy.target.apply(pkg.proxy, [qry].concat(protoSlice.call(arguments)));
        }
        if (setBlessed) {
          pkg.blessed = 0;
        }
        return rslt;
      };

      // return cached custom callback
      return pkg.cq[cacheId] = customCallback;
    };

    corePkgDef.proxy.query = function () {
      var
        pkg = corePkgDef(this),
        nodes = [],
        nodeRef,
        argumentIdx = arguments.length,
        resolvedIndex
      ;
      if (argumentIdx) {
        while (argumentIdx--) {
          nodeRef = arguments[argumentIdx];
          resolvedIndex = pkg.vetIndexOf(nodeRef);
          if (~resolvedIndex) {
            nodes.push(pkg.nodes[resolvedIndex].path);
          } else {
            return false;
          }
        }
        return nodes.length === 1 ? nodes[0] : nodes.reverse();
      }
      return false;
    };

    // access and edit the locked status of a flow
    corePkgDef.proxy.perms = function (options) {
      var
        pkg = corePkgDef(this),
        argumentsLength = arguments.length
      ;

      if (argumentsLength) {
        // if allowed to change permissions...
        if (pkg.is('sub', 'owner', 'self')) {
          if (argumentsLength > 1) {
            options = protoSlice.call(arguments);
          }
          pkg.perms[0] = perms_parse(options, pkg.perms[0]);
          return true;
        }
        // (otherwise) flag inability to change permissions
        return false;
      }
      // return copy of current permissions
      return extend({}, pkg.perms[0]);
    };

    // add method to program api
    corePkgDef.proxy.target = function (qry) {
      var
       // alias this package
        pkg = corePkgDef(this),
        // resolve a node index from qry, or nothing if allowed or unlocked
        tgtIdx = (pkg.is('world', 'sub', 'owner', 'self')) ? pkg.vetIndexOf(qry) : -1;

      // if the destination node is valid, and the flow can move...
      if (~tgtIdx) {
        // capture arguments after the tgt
        pkg.args = protoSlice.call(arguments).slice(1);
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
          // false when pending
          // true when paused or not pending
        // when external (outside a program-function)
          // false when pending
          // false when paused
          // false when exiting outside of phase 0 (_on)
          // true when the traversal result is undefined
          // the traversal result otherwise the traversal result is returned
      if (pkg.pending || pkg.pause || pkg.phase) {
        return false;
      } else if (pkg.active || pkg.result === undefined) {
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
    corePkgDef.proxy.go = function () {
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
        pkg.is('world', 'sub', 'owner', 'self') &&
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
        result = pkg.go() || wasPaused;
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
      if (pkg.is('sub', 'owner', 'self') && (!argLn || (time >= 0 && typeof time === 'number' && (noAction || ~delayNodeIdx || isFnc)))) {
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
                pkg.go();
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
    corePkgDef.proxy.owner = function (owner) {
      var
        argumentsLength = arguments.length,
        pkg = corePkgDef(this),
        readAccess = pkg.is('owner', 'self'),
        writeAccess = readAccess || !pkg.owner
      ;

      if (argumentsLength) {
        if (writeAccess) {
          // change owner to something other than itself
          if (isFlow(owner) && owner !== pkg.proxy) {
            pkg.owner = corePkgDef(owner);
            return owner;
          }
          // remove this flow's owner
          if (owner === false) {
            pkg.owner = 0;
            return true;
          }
        }
        return false;
      } else if (readAccess) {
        return pkg.owner.proxy;
      } else {
        return !!pkg.owner;
      }
    };

    corePkgDef.proxy.subs = function (rawCriteria) {
      var
        pkg = corePkgDef(this),
        args = protoSlice.call(arguments),
        argLn = args.length,
        allowed = pkg.is('sub', 'owner','self'),
        tin = pkg.tin,
        bin = pkg.bin,
        criteria,
        results,
        i
      ;

      // remove sub-instances

      if (argLn > 1 && rawCriteria === 'remove') {
        if (!allowed) {
          // deny unauthorized removal attempts
          return 0;
        }
        // focus on remaining arguments
        args.shift();
        if (isFlow(args[0])) {
          i = args.length;
          // get core package instances
          while (i--) {
            if (!(args[i] = corePkgDef(args[i]))) {
              // fail when not a flow instance
              return 0;
            }
          }
          // remove these sub-instances from the bin and tin
          return subs_removeInsts(bin, args) + subs_removeInsts(tin, args);
        } else if (argLn > 1) {
          if (argLn === 2 && args[0] === null && pkg.caps[0]) {
            // use branch criteria
            criteria = pkg.caps[0];
          } else {
            // sanitize criteria
            criteria = subs_sanitizeCriteria(args[0]);
          }
          // remove from the targeted collections
          if (!~criteria.buffer) {
            return subs_removeInsts(tin, subs_getInsts(tin, criteria)) + subs_removeInsts(bin, subs_getInsts(bin, criteria));
          } else if (criteria.buffer) {
            return subs_removeInsts(tin, subs_getInsts(tin, criteria));
          } else {
            return subs_removeInsts(bin, subs_getInsts(bin, criteria));
          }
        }
        return 0;
      }

      // add sub-instances

      if (isFlow(rawCriteria)) {
        if (!allowed) {
          // deny unauthorized additions
          return 0;
        }
        i = argLn;
        // get core package instances
        while (i--) {
          if (!(args[i] = corePkgDef(args[i]))) {
            // fail when not adding a flow instance or adding self
            return 0;
          }
        }
        // remove from tin and add to bin
        subs_removeInsts(tin, args);
        return subs_addInsts(bin, args, pkg);
      }

      // retrieve sub-instances

      if (rawCriteria === null && pkg.caps[0]) {
        // use branch criteria
        criteria = pkg.caps[0];
      } else if (argLn) {
        // retrieve subs with the given criteria
        criteria = subs_sanitizeCriteria(rawCriteria);
      } else {
        // retrieve all sub-instances using precompiled default
        criteria = criteriaCache.ctrue;
      }
      // search the collections identified by the criteria
      if (!~criteria.buffer) {
        results = subs_getInsts(tin, criteria).concat(subs_getInsts(bin, criteria));
      } else if (criteria.buffer) {
        results = subs_getInsts(tin, criteria);
      } else {
        results = subs_getInsts(bin, criteria);
      }
      i = results.length;
      if (allowed) {
        // return matching proxies
        while (i--) {
          results[i] = results[i].proxy;
        }
        return results;
      }
      // return number of results
      return i;
    };

    // return an object with status information about the flow and it's current state
    corePkgDef.proxy.status = function (metric) {
      var
        // get the package instance
        pkg = corePkgDef(this),
        obj = {},
        all = !arguments.length
      ;

      // callback-function for retrieving the node index
      function getPathFromIndex(idx) {
        return pkg.nodes[idx].path;
      }

      if (all || metric === 'active') {
        obj.active = !!pkg.active;
      }

      if (all || metric === 'loops') {
        obj.loops = Math.max((pkg.calls.join().match(new RegExp('\\b' + pkg.tank.currentIndex + '.' + pkg.phase, 'g')) || []).length - 1, 0);
      }

      if (all || metric === 'paused') {
        obj.paused = !!pkg.pause;
      }

      if (all || metric === 'phase') {
        obj.phase = pkg.active ? traversalCallbackOrder[pkg.phase].substr(1) : '';
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
    module.exports = initFlow(require);
  } else if (!scope.Flow) {
    scope.Flow = initFlow();
  }
}(
  typeof define == 'function',
  typeof exports != 'undefined',
  Array, Math, Object, RegExp, this
);