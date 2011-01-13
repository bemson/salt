/**
* Flow v0.1.2
* http://github.com/bemson/Flow/
*
* Copyright 2011, Bemi Faison
* Licensed under the MIT License
**/
(function () {
	var sys = {
			// signature object
			fkey: {},
			// starting number for ids
			date: new Date() * 1,
			rxp: {
				flowref: /^([^@]+?)(?:@(\d+))?$/,
				flowid: /\w/, // at least one alphanumeric character
				env: /\S/
			},
			// allows getting type as array
			typeOf: function (obj) {
				var type = typeof obj;
				return type === 'object' && Object.prototype.toString.call(obj) === '[object Array]' ? 'array' : type;
			},
			emptyFnc: function () {},
			isFnc: function (v) {
				return typeof v === 'function'
			},
			flows: {},
			objects: {},
			proxies: {},
			meta: {
				fncs: {
					main: 'main',
					in: 'in',
					out: 'out',
					over: 'over'
				},
				keys: {
					env: 'env'
				},
				prefix: '_'
			},
			// returns node or flow based on ref and node args
			resolveRef: function (ref, rflow) {
				// init vars
				var obj, // stub for instance to return
					rp, // regular expression parts
					cnst = sys.objects[rflow ? 'Flow' : 'Node']; // alias Node constructor
				// if a possible instance...
				if (sys.isFnc(ref.hasOwnProperty)) {
					// if an instance of the target,  return as is
					if (ref instanceof cnst) return ref;
					// if a Proxy, return corresponding instance
					if (ref instanceof Proxy && ref._gset().type === 1 && ref.type() === (rflow ? 'Flow' : 'Node') && (obj = ref._gset(sys.fkey)) instanceof cnst) return obj;
				}
				// (otherwise) get parts from string
				rp = sys.isFnc(ref.toString) ? ref.toString().match(sys.rxp.flowref) : 0;
				// return flow or node, based on parts returned from regex matching, or 0
				return (rp && (obj = sys.flows.hasOwnProperty(rp[1])) && (rflow || (obj = sys.flows[obj[1]].nodes[+rp[2]]))) ? obj : 0;
			}
		};

		// define template for flow execution environment
		sys.proxies.Flow = new Proxy(
			0,
			{
				type: 'Flow',
				id: [
					'id'
				],
				arguments: function (idx, val) {
					// init vars
					var flow = this, // alias flow
						args = arguments, // alias argumenst
						fargs = flow.arguments; // alias flow arguments
					// if no arguments, return clone of arguments array
					if (!args.length) return fargs.concat([]);
					// if idx is an integer...
					if (Math.ceil(idx) === idx) {
						// if val is not null, set 
						if (args.length > 1) {
							// set index to this value
							fargs[idx] = val;
							// flag that the value was set
							return !0;
						}
						// return value of targeted idx
						return fargs[idx];
					}
				},
				env: function (key, value) {
					var flow = this,
						args = arguments,
						envObj,i,vars = [];
					// if no args are given...
					if (!args.length) {
						// with each env in this flow...
						for (i in flow.envs) {
							if (flow.envs.hasOwnProperty(i)) vars.push(i);
						}
						// return list of var names
						return vars;
					} else if (typeof key === 'string' && sys.rxp.env.test(key)) { // if key is valid...
						// resolve env instance - get existing or create new one
						envObj = flow.resolveEnv(key);
						// if setting...
						if (args.length > 1) {
							// set last scoped value
							envObj.values[0] = value;
							return !0;
						} else { // otherwise, when getting...
							// return value
							return envObj.values[0];
						}
					} else {
						// throw error - invalid environment key
						// needed for valid-syntax?
						return !1;
					}
				},
				// flag when this flow is paused
				paused: [
					function () {
						// flag when paused
						return !!this.delay;
					}
				],
				// stop this flow (indefinitely) - excludes main functions
				pause: function () {
					var flow = this;
					return flow.phase !== sys.meta.fncs.main && flow.wait();
				},
				// pause flow for a given period of time with a given callback - scoped (again) to this flow
				// can't delay while in main function, without fnc argument
				wait: function (time, fnc) {
					var flow = this,
						inMain = flow.phase === sys.meta.fncs.main;
					return (!arguments.length || (Math.ceil(time) === time && ((!fnc && !inMain) || sys.isFnc(fnc)))) ? flow.wait.apply(flow,arguments) : !1;
				},
				// resume this flow towards it's current target - exclude main functions
				resume: function () {
					var flow = this;
					return flow.phase !== sys.mea.fncs.main && flow.next();
				},
				// get phase string
				phase: [
					'phase'
				],
				// return function list
				map: [
					function () {
					return this.getMap();
					}
				],
				// return the name of current node in the flow
				nodeName: [
					function () {
						var flow = this;
						return flow.nodes[flow.currentIdx].name;
					}
				],
				// exit this flow
				exit: function () {
					var flow = this;
					return flow.next(flow.nodes[0]) && !0;
				},
				// go to the current node
				targetSelf: function () {
					var flow = this;
					return flow.next(flow.nodes[flow.currentIdx], arguments);
				},
				// go to root node
				targetRoot: function () {
					var flow = this;
					return flow.next(flow.nodes[1], arguments);
				},
				// go to the next sibling
				targetNext: function () {
					var flow = this,
						node = flow.nodes[flow.currentIdx],
						tgt = flow.nodes[node.nextIdx];
					// return result of targeting the next node, or false when none exists
					return tgt ? flow.next(tgt, arguments) : !1;
				},
				// go to the previous sibling
				targetPrevious: function () {
					var flow = this,
						node = flow.nodes[flow.currentIdx],
						tgt = flow.nodes[node.previousIdx];
					return tgt ? flow.next(tgt, arguments) : !1;
				},
				// go to first child
				targetChild: function () {
					var flow = this,
						node = flow.nodes[flow.currentIdx],
						tgt = flow.nodes[node.childIdx];
					return tgt ? flow.next(tgt, arguments) : !1;
				},
				// go to parent
				targetParent: function () {
					var flow = this,
						node = flow.nodes[flow.currentIdx],
						tgt = flow.nodes[node.parentIdx && node.parentIdx];
						return tgt ? flow.next(tgt, arguments) : !1;
				},
				// go to first sibling
				targetYoungest: function () {
					var flow = this,
						node = flow.nodes[flow.currentIdx],
						parent = flow.nodes[node.parentIdx];
					return flow.next(flow.nodes[parent.childIdx], arguments);
				},
				// go to last sibling
				targetOldest: function () {
					var flow = this,
						node = flow.nodes[flow.currentIdx],
						parent = flow.nodes[node.parentIdx];
					return flow.next(flow.nodes[parent.children[parent.children.length - 1]]);
				},
				// flags when the given node is the current position
				isCurrent: function (ref) {
					var flow = this,
						node = sys.resolveRef(ref);
						return node && flow.currentIdx === node.idx;
				},
				// flags when the given node is the traversal target
				isTarget: function (ref) {
					var flow = this,
						node = sys.resolveRef(ref);
					// return when the current node is this node
					return node && flow.targetIdx === node.idx;
				},
				// flags when the flow is traversing the root
				onRoot: function () {
						return this.currentIdx === 1;
				},
				// flags when the flow is at the traversal target
				onTarget: function () {
					var flow = this;
					return flow.targetIdx === flow.currentIdx;
				},
				// flags when the given node is apart of the traversal path
				wasTarget: function (ref) {
					var flow = this,
						node = sys.resolveRef(ref);
					// return when the given node has been traversed
					return node && flow.nodestack.indexOf(node.idx) !== -1;
				}
			}
		);

		sys.objects.Flow = function (id, tree) {
			var flow = this;
			flow.id = id;
			flow.tree = tree; // capture original tree - for modification later?
			flow.currentIdx = flow.targetIdx = 0;
			// flags when the target's _main function has been called
			flow.targetMet = 0;
			// flags when this flow is actively executing functions
			flow.active = 0;
			// pause/delay pointer
			flow.delay = 0;
			flow.arguments = [];
			// nodes in path of target during each traversal (until target is met)
			flow.nodestack = [];
			// environment variables and globals, managed by flow
			flow.envs = {};
			sys.flows[flow.id] = flow;
			flow.nodes = [{fncs:{}, childIdx:1, idx:0, children:[], name:'_super'}]; // start with faux node pointing to first child of real tree
			new sys.objects.Node(flow, flow.nodes[0], tree); // create node tree
		};
		sys.objects.Flow.prototype = {
			// tree path iterator - args is an arguments object
			next: function (tgtNode, args) {
				var flow = this, // alias self
					node = flow.nodes[flow.currentIdx], // node to test and/or execute
					i, // loop vars
					nxtIdx, // next index
					hasFnc; // capture when this node has the targeted function
				// if a node is given...
				if (tgtNode) {
					// set new target index
					flow.targetIdx = tgtNode.idx;
					// capture or reset arguments
					flow.arguments = (args && args.length) ? [].slice.call(args) : [];
				}
				// clear phase
				flow.phase = '';
				// clear delay
				flow.clearWait();
				// if not actively executing, and we've either set a new target or have yet to reach the current target's main function...
				if (!flow.active && (tgtNode || !flow.targetMet)) {
					// reset targetMet flag
					flow.targetMet = 0;
					// capture execution direction - 0 = on target, >0 = forward, <0 = backward
					flow.direction = flow.targetIdx - flow.currentIdx;
					// if not on the target node...
					if (flow.direction) {
						// if moving forward...
						if (flow.direction > 0) {
							// if the parent's next index is less than the target
							if (node.idx && flow.nodes[node.parentIdx].nextIdx <= flow.targetIdx) {
								// go to "leftIdx" when a meta exists for "backwards-over"
								// set parent's next as currentIdx
								nxtIdx = flow.nodes[node.parentIdx].nextIdx;
								nxtIdx = node.parentIdx;
								// set phase to out ?
								flow.phase = sys.meta.fncs.out;
								// flag that we're out of context (or will be)
								node.inContext = 0;
							} else if (node.nextIdx <= flow.targetIdx) { // or, when the next node is lte the target...
								// set next currentIdx
								nxtIdx = node.nextIdx;
								// set phase to "over" or "out" based on context
								flow.phase = sys.meta.fncs[node.inContext ? 'out' : 'over'];
								// flag that we're out of context (or will be)
								node.inContext = 0;
							} else { // otherwise, when next doesn't exist or is greater than the target...
								// set next currentIdx
								nxtIdx = node.childIdx;
								// if not in context, set phase to in
								if (!node.inContext) flow.phase = sys.meta.fncs.in;
								// flag that we're in context of this node
								node.inContext = 1;
							}
						} else { // or, when moving backwards...
							// set next currentIdx, based on parent
							nxtIdx = node.parentIdx >= flow.targetIdx ? node.parentIdx : node.previousIdx;
							// if in context, set phase to "out"
							if (node.inContext) flow.phase = sys.meta.fncs.out;
							// flag that we're out of context (or will be)
							node.inContext = 0;
						}
					} else { // otherwise, when we're on the target node...
						// set phase to "in" or "main", based on whether we're in context
						flow.phase = sys.meta.fncs[node.inContext ? 'main' : 'in'];
						// set targetMet if we're already in context
						flow.targetMet = node.inContext;
						// flag that we're now in context of this node
						node.inContext = 1;
					}
					// flag that we're active
					flow.active = 1;
					// if not the root node and there is a phase...
					if (node.idx && flow.phase) {
						// if phase is in, increase scope of node envs
						if (flow.phase === sys.meta.fncs.in) node.scopeEnvs();
						// if there is a nodeOut node and it's greater than the current node, descope envs for that node
						if (flow.outNode && flow.outNode.idx > node.idx) flow.outNode.descopeEnvs();
						// reset out node
						flow.outNode = 0;
						// if there is a phase function...
						if (hasFnc = node.fncs.hasOwnProperty(flow.phase)) {
							// if the out phase, set the flow's outNode property
							if (flow.phase === sys.meta.fncs.out) flow.outNode = node;
							// execute phase function - capture result
							flow.result = flow.execute(node.fncs[flow.phase], flow.phase !== sys.meta.fncs.main ? [] : flow.arguments);
						} else if (flow.phase === sys.meta.fncs.out) { // or, when phase was out...
							// descope envs for this node (now)
							node.descopeEnvs();
						}
					}
					// flag that we're no longer active
					flow.active = 0;
				}
				// add node index to nodestack - just the index for now (maybe arguments and environments later)
				flow.nodestack.push(node.idx);
				// if a next index is chosen, set as currentIdx
				if (nxtIdx != null) flow.currentIdx = nxtIdx;
				// if not active or delayed, and target not met and not paused, return result of recursive call
				if (!flow.active && !flow.delay && !flow.targetMet) return flow.next();
				// if the target has been met, reset node history
				if (flow.targetMet) flow.nodestack = [];
				// return the result after main function, othewise return whether the target has been met
				return hasFnc && flow.targetMet ? flow.result : !!flow.targetMet;
			},
			execute: function (fnc, args) {
				// init vars
				var flow = this; // alias self
				// clear wait
				flow.clearWait();
				// retrun result of invoking fnc, with given or empty args
				return fnc.apply(new Proxy(flow, sys.proxies.Flow, sys.fkey), args || []);
			},
			// retrieve or create Env instance with this key
			resolveEnv: function (key) {
				var flow = this;
				return flow.envs.hasOwnProperty(key) ? flow.envs[key] : new sys.objects.Env(flow, key);
			},
			wait: function (time, fnc) {
				// init vars
				var flow = this; // alias self
				// clear wait
				flow.clearWait();
				// resolve time as an integer
				time = parseInt(time);
				// set delay to any truthy value or a timeout-pointer, based on time argument
				flow.delay = time ? window.setTimeout(fnc ? function () {
					flow.execute(fnc);
					// if delay was not reset, resume traversal
					if (!flow.delay) flow.next();
				} : function () {
					// resume traversal (clears delay)
					flow.next()
				}, time) : 1;
				// flag that the flow has been delayed
				return !0;
			},
			clearWait: function () {
				// init vars
				var flow = this, // alias self
					d = 1; // capture when there is a delay to clear
				// if there is a delay...
				if (flow.delay) {
					// clear timeout
					window.clearTimeout(flow.delay);
					// nullify delay and set delay-presence flag
					flow.delay = d = 0;
				}
				// return whether a delay flag was cleared
				return !d;
			},
			getMap: function () {
				// init vars
				var flow = this,
					_addPtr = function (node, ptr) {
						// init vars
						var fnc = function () {
								return flow.next(node, arguments)
							};
						fnc.toString = function () {
							return node.id
						};
						if (ptr) {
							ptr[node.name] = fnc
						} else {
							ptr = fnc
						}
						// if there is a sibling index, get pointer for the next
						if (node.nextIdx) _addPtr(flow.nodes[node.nextIdx],ptr);
						// if there are children, get pointer for the first
						if (node.children.length) _addPtr(flow.nodes[node.children[0].idx], node.name ? fnc : ptr);
						// return ptr
						return ptr;
					};
				// return pointer from second (starting) node
				return _addPtr(flow.nodes[1]);
			}
		}

		sys.objects.Env = function (flow, key, noscope) {
			var env = this;
			env.flow = flow;
			env.key = key;
			env.values = [undefined]; // initial value is undefined
			// add self to flow's env
			flow.envs[key] = env;
		};
		sys.objects.Env.prototype = {
			descope: function () {
				var env = this;
				// remove scope from values
				env.values.shift();
				// if no more scope levels exist, remove self-reference from flow
				if (!env.values.length) delete env.flow.envs[env.key];
				// flag that this instance was descoped
				return 1;
			},
			scope: function () {
				var env = this;
				// copy current value as the new value (first value)
				env.values.unshift(env.values[0]);
				// flag that this instance was scoped
				return 1;
			}
		};

		sys.objects.Node = function (flow, parent, def, name) {
			var node = this,
				i,meta, metas = sys.meta;

			node.flow = flow;
			node.idx = flow.nodes.push(node) - 1;
			node.parentIdx = parent.idx;
			node.localChildIdx = parent.children.push(node) - 1;
			// if not the first child...
			if (node.localChildIdx) {
				node.previousIdx = parent.children[node.localChildIdx - 1].idx;
				parent.children[node.localChildIdx - 1].nextIdx = node.idx;
			}

			node.children = [];
			node.fncs = {};
			node.envs = {};
			node.name = name || '_root';
			node.id = flow.id + '@' + node.idx;

			if (sys.isFnc(def)) {
				node.fncs[sys.meta.fncs.main] = def;
			} else {
				for (i in def) {
					if (def.hasOwnProperty(i)) {
						if (i.charAt(0) === sys.meta.prefix) {
							meta = i.substring(1);1
							// if this is a meta function...
							if (sys.meta.fncs[meta] === meta && sys.isFnc(def[i])) {
								// add to node functions
								node.fncs[meta] = def[i];
							} else if (sys.meta.keys[meta] === meta && !sys.isFnc(def[i])) { // otherwise, when this is a meta key (not a function)...
								// based on the key
								switch (meta) {
									case metas.keys.env : // environment keys
										node.sanitizeAddEnvDef(def[i]);
									break;
								}
							} else {
								// throw error - unknown meta
							}
						} else {
							// create child nodes
							new sys.objects.Node(flow, node, def[i], i);
							// capture index of the first child
							if (!node.childIdx) node.childIdx = node.idx + 1;
						}
					}
				}
			}
		};
		sys.objects.Node.prototype = {
			// add single environment variable - supports cfg can be a string or object
			addEnvDef: function (cfg) {
				var node = this,
					cnt = 0, // number of env created
					i; // loop vars
				// if cfg is an object...
				if (typeof cfg === 'object') {
					for (i in cfg) {
						if (cfg.hasOwnProperty(i)) {
							node.envs[i] = {name: i, value: cfg[i], useValue: 1};
							cnt++;
						}
					}
				} else if (sys.rxp.env.test(cfg)) { // or, when a valid environment name - any string with a non-space character...
						node.envs[cfg]= {name: cfg, useValue: 0};
						cnt++;
				}
				// return number of vars created
				return cnt;
			},
			// set environment variables
			/*
			any number of args can exist in the following following formats:
			1) a string as an environment variable name ''
			2) an array of strings as environment variable names ['','']
			3) an object with pairs, representing the variable name and value {key:'',key:''}
			4) an array of objects with pairs for variable name and value [{key:'', key:''},{key:'',key:''}]
			*/
			sanitizeAddEnvDef: function () {
				var node = this, // alias self
					args = [].slice.call(arguments), // get arguments as an array
					i = 0, j = args.length, // loop vars
					cnt = 0; // variable names added
				for (; i < j; i++) {
					switch (sys.typeOf(args[i])) {
						case 'array' :
							cnt += node.sanitizeAddEnvDef.apply(node,args[i]);
						break;

						case 'string' :
						case 'object' :
							cnt += node.addEnvDef(args[i]);
						break;

						default:
							// throw error? - invalid env definition
					}
				}
				// return number of vars added
				return cnt;
			},
			scopeEnvs: function () {
				var node = this,
					flow = node.flow,
					i;
				for (i in node.envs) {
					if (node.envs.hasOwnProperty(i)) {
						// if the node exists in the flow...
						if (flow.envs.hasOwnProperty(i)) {
							flow.envs[i].scope();
						} else { // otherwise, when the node does not exist...
							// resolve node
							flow.resolveEnv(i);
						}
						// if there is a default value, set env value
						if (node.envs[i].useValue) flow.envs[i].values[0] = node.envs[i].value;
					}
				}
			},
			descopeEnvs: function () {
				var node = this,
					flow = node.flow,
					i;
				for (i in node.envs) {
					// if not inherited and the node exists in the flow, descope environ
					if (node.envs.hasOwnProperty(i) && flow.envs.hasOwnProperty(i)) flow.envs[i].descope();
				}
			}
		};

		window.Flow = function () {
			var that = this,
				args = arguments,
				id = typeof args[0] === 'string' && args[0].length && !sys.flows.hasOwnProperty(args[0]) && args[0].indexOf('@') < 0 && sys.rxp.flowid.test(args[0]) ? args[0] : (sys.date++).toString(20),
				tree = args.length > 1 ? args[1] : args[0];
			if (that.hasOwnProperty && !(that instanceof arguments.callee)) {
				// throw error - must call with new operator
			}
			if (typeof tree !== 'object') {
				// throw error - map is invalid
			}
			return (new sys.objects.Flow(id, tree)).getMap();
		};
		// return proxy of flow instance
		Flow.getFlow = function (ref) {
			var flow = sys.resolveRef(ref,1);
			return !!flow && new Proxy(flow, sys.proxies.Flow, sys.fkey)
		};
})();