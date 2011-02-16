/**
* Flow v0.2.0
* http://github.com/bemson/Flow/
*
* MIT License, Copyright 2011, Bemi Faison
**/
(function (window) {
	var sys = {
			// signature object
			fkey: {},
			// unique number
			tick: new Date() * 1,
			rxp: {
				flowref: /^([^@]+?)(?:@(\d+))?$/,
				flowid: /\w/, // at least one alpha-numeric character
				mapAsFlow: /^\/\/(.*\/)?$/, // tostring of map function
				env: /\S/,
				badNodeName: /^toString$|\/|^[_#]/,
				badNodeId: /^[_#]/,
				nodeAlias: /^#(\w+)$/,
				relativePathFlags: /^(?:(?:\.|#[\w\|]+)\/?)+/
			},
			// allows getting type as array
			typeOf: function (obj) {
				var type = typeof obj;
				return type === 'object' && Object.prototype.toString.call(obj) === '[object Array]' ? 'array' : type;
			},
			isValidFlowId: function (id) {
					return typeof id === 'string' && sys.rxp.flowid.test(id)
			},
			isFnc: function (v) {
				return typeof v === 'function'
			},
			gvs: {
				vetNode: ['function','string']
			},
			superId: '..//', // special id for the super node
			flows: {},
			objects: {},
			proxies: {},
			meta: {
				fncs: {
					main: 'main',
					'in': 'in',
					out: 'out',
					over: 'over'
				},
				keys: {
					env: 'env',
					root: 'root'
				},
				prefix: '_'
			},
			// return flow with this id
			getFlow: function (ref) {
				var obj = 0,
					fCnst = sys.objects.Flow;
				switch (typeof ref) {
					case 'object':
						// if a proxy Flow, return the flow
						if (ref instanceof Proxy && ref._gset().type === 1 && ref.type() === 'Flow') obj = ref._gset(sys.fkey);
						// if a Flow, return the flow
						if (ref instanceof fCnst) obj = ref;
					break;

					case 'function':
						if (ref.hasOwnProperty('toString') && sys.rxp.mapAsFlow.test(ref.toString()) && (obj = ref(sys.fkey)) instanceof fCnst) return obj;
					break;

					case 'string':
						// if valid flow id and it exists
						if (sys.flows.hasOwnProperty(ref) && sys.isValidFlowId(ref)) obj = sys.flows[ref];
					break;
				}
				return obj;
			}
		};

	// define template for flow execution environment
	sys.proxies.Flow = new Proxy(
		// source (placeholder object)
		0,
		// scheme
		{
			// PROPERTY METHODS //
			type: 'Flow',
			id: [
				'id',
				function (id) {
					return !sys.flows.hasOwnProperty(id) && sys.isValidFlowId(id);
				},
				function (id) {
					var flow = this;
					delete sys.flows[flow.id];
					flow.id = id;
					sys.flows[flow.id] = flow;
					return !0;
				}
			],
			map: [
				function () {
					// init vars
					var flow = this,
						_addPtr = function (node, ptr) {
							// init vars
							var fnc = function (key) {
									// returns the flow, when this map-function is passed as a reference
									// returns false  when the flow is dead
									return flow.dead ? !1 : (key === sys.fkey ? flow : flow.target(node, arguments));
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
			],
			phase: [
				'phase'
			],
			kill: function () {
				// init vars
				var flow = this;
				// if not dead...
				if (!flow.dead) {
					// remove self from flows
					delete sys.flows[flow.id];
					// set dead flag
					flow.dead = 1;
				}
				// falg that the flow is dead
				return !!flow.dead;
			},
			node: function (ref) {
				var flow = this,
					node = arguments.length && ref !== '' ? flow.findNode(ref) : flow.nodes[flow.currentIdx];
					return node ? node.id : !1;
			},
			name: [
				function () {
					var flow = this;
					return flow.nodes[flow.currentIdx].name;
				}
			],
			// return array of all destinations - considers uncommitted waypoints
			route: [
				function () {
					var flow = this,
						points = flow.waypoints.length ? flow.waypoints.concat(flow.nodes[flow.targetIdx]) : flow.targets.concat(),
						i = 0;
					// get path of each node
					for (; points[i]; i++) {
						points[i] = points[i].id;
					}
					return points;
				}
			],
			history: [
				function () {
					return this.nodestack.concat();
				}
			],
			// DATA METHODS //
			// Manage flow arguments
			// arguments() -> return copy of arguments array
			// arguments(integer) -> return value at given integer, or undefined when number is invalid
			// arguments(integer, value) -> return true after setting value
			// arguments(integer, null) -> return true after removing last index
			args: function () {
				var flow = this,
					args = arguments,
					a1 = args[0],
					a2 = args[1],
					a1Ok = a1 > -1 && Math.ceil(a1) === a1;
				switch (args.length) {
					case 0 :
						return flow.args.concat();
					break;
					
					case 1:
						switch (sys.typeOf(a1)) {
							case 'array':
								flow.args = a1.concat();
								return !0;
							break;

							case 'number':
								if (a1Ok) return flow.args[a1];
							break;
						}
					break;

					default:
						// if index is valid...
						if (a1Ok) {
							// if the value is null for the last item...
							if (a2 === null && a1 === flow.args.length - 1) {
								// remove last item
								flow.args.splice(-1,1);
							} else { // otherwise, when not a "delete" flag...
								// set value at the given index
								flow.args[a1] = a2;
							}
							// flag success
							return !0;
						}
					break;
				}
				// (ultimately) return false
				return !1;
			},
			env: function () {
				var flow = this,
					args = arguments,
					a1 = args[0],
					a2 = args[1],
					env = typeof a1 === 'string' && sys.rxp.env.test(a1) && flow.resolveEnv(a1),
					i, vars = [];
				switch (args.length) {
					case 0: // get names of all vars
						for (i in flow.envs) {
							if (flow.envs.hasOwnProperty(i)) vars.push(i);
						}
						return vars;
					break;

					case 1: // get the value of this var
						if (env) return env.values[0];
					break;

					default:
						// if an env exists, set the current scope's value
						if (env) env.values[0] = a2;
						// flag success
						return !0;
					break;
				}
				// (ultimately) return false
				return !1;
			},
			// TRAVERSAL METHODS //
			// pause flow
			// wait() -> pause indefinitely
			// wait(time) -> for the given period of time
			// wait(fnc, time) -> execute the call back after the given period of time
			wait: function () {
				var flow = this,
					args = arguments,
					argLn = args.length,
					M = Math, // reduce lookups
					fnc = argLn > 1 ? args[0] : 0,
					fncOk = !fnc || typeof fnc === 'function',
					time = M.ceil(M.abs(args[argLn - 1])),
					timeOk = !isNaN(time),
					rtn = 1;
				// if argument signature is valid...
				if (!argLn || (timeOk && fncOk)) {
					// clear existing delay
					flow.clearDelay();
					// set delay to truthy value or timeout pointer with given or default function
					flow.delay = argLn ?
						window.setTimeout(argLn - 1 ?
							function () {
								flow.execute(fnc);
								if (!flow.delay) flow.traverse();
							} :
							function () {
								flow.traverse();
							},
							time
						) :
						1;
					// flag that the flow will be (or has been) delayed
					rtn = 0;
				}
				// (otherwise) return false
				return !rtn;
			},
			target: function (ref) {
				var flow = this,
					node;
				// if passed arguments...
				if (arguments.length) {
					node = flow.findNode(ref);
					// return traversal result for valid node
					return node ? flow.target(node, [].slice.call(arguments, 1)) : !1;
				} else { // otherwise, when not given args...
					// return empty string or id of final target node
					return flow.targetIdx == null ? '' : flow.targets[flow.targets.length - 1].id;
				}
			},
			// continue traversal
			// next() - resume traversal
			// next(waypoints) - when a target exists, waypoints are injected into the route - with no target, the last waypoint is used
			next: function () {
				var flow = this,
					args = arguments,
					argLn = args.length,
					tgtLn = flow.targets.length,
					node,
					points = [],
					i = 0,
					inMain = flow.phase === sys.meta.fncs.main;
				// with each waypoint...
				for (; node = args[i] && flow.findNode(args[i]); i++) {
					// add waypoint
					points.push(node);
				}
				// if waypoints were omitted or are valid...
				if (!argLn || argLn === points.length) {
					// if there are targets or waypoints...
					if (tgtLn || points.length) {
						// if there are waypoints, add waypoints
						  // all but the last when it matches the current or next target (based on the phase)
						if (points.length) flow.waypoints = points.slice(0, (points[points.length - 1] === flow.targets[!inMain || tgtLn < 2 ? 0 : 1]) ? -1 : points.length);
						// if there are no targets, set targets to last waypoint
						if (!tgtLn) flow.targets = [flow.waypoints.pop()];
						// return result of traversal
						return flow.traverse();
					}
				}
				// return false
				return !1;
			},
			exit: function () {
				var flow = this;
				return flow.target(flow.nodes[0]);
			}
		},
		// gate - deny dead instances
		function () {
			return !this.dead;
		},
		// signature
		sys.fkey
	);

	sys.objects.Flow = function (id, tree) {
		var flow = this;
		flow.id = id;
		flow.tree = tree; // capture original tree - for modification later?
		flow.currentIdx = 0;
		flow.targetIdx = null;
		flow.targets = [];
		// flag when this flow is useless
		flow.dead = !1;
		// flags when this flow is actively executing functions
		flow.active = 0;
		// pause/delay pointer
		flow.delay = 0;
		flow.args = [];
		flow.waypoints = [];
		flow.phase = '';
		// nodes in path of target during each traversal (until target is met)
		flow.nodestack = [];
		// environment variables and globals, managed by flow
		flow.envs = {};
		// space for storing traversal flags
		flow.stage = {};
		sys.flows[flow.id] = flow;
		flow.nodes = [];
		flow.nodeIds = {'/':0}; // maps node id with index
		// create master node and append given tree
		new sys.objects.Node(flow, new sys.objects.Node(flow), tree); // create node tree
	};
	sys.objects.Flow.prototype = {
		target: function (node, args) {
			var flow = this;
			// in scope of flow...
			with (flow) {
				// invalidate the current stage
				stage.valid = 0;
				// reset properties
				targets = [node];
				args = args;
				waypoints = [];
			}
			// return traversal attempt
			return flow.traverse();
		},
		traverse: function () {
			var flow = this, // alias self
				node, // current node
				r = flow.nodes.length * 3, // recursion protection
				hasFnc; // flags when a phase function exists
			// exit when executing
			if (flow.executing) return !0;
			// clear delay
			flow.clearDelay();
			// commit changes to the stage - if any
			flow.commitStage();
			// while not paused and there are targets...
			while (!flow.delay && flow.targets.length && r--) {
				// prepend waypoints
				flow.targets.unshift.apply(flow.targets, flow.waypoints);
				// reset waypoints
				flow.waypoints = [];
				// reset phase
				flow.phase = 0;
				// reset hasFnc
				hasFnc = 0;
				// get index of this target
				flow.targetIdx = flow.targets[0].idx;
				// get current node
				node = flow.nodes[flow.currentIdx];
				// capture traversal direction
				flow.direction = flow.targetIdx - flow.currentIdx;
				// if not on the target node...
				if (flow.direction) {
					// if moving forward...
					if (flow.direction > 0) {
						// if the parent's next index is less than the target...
						if (node.idx && flow.nodes[node.parentIdx].nextIdx <= flow.targetIdx) {
							// go to "leftIdx" when a meta exists for "backwards-over"
							// set to parent's next as currentIdx
							flow.stage.currentIdx = flow.nodes[node.parentIdx].nextIdx;
							// set phase to out ?
							flow.phase = sys.meta.fncs.out;
							// flag that we're out of context (or will be)
							node.inContext = 0;
						} else if (node.nextIdx <= flow.targetIdx) { // or, when the next node is lte the target...
							// set next currentIdx to the sibling node
							flow.stage.currentIdx = node.nextIdx;
							// set phase to "over" or "out" based on context
							flow.phase = sys.meta.fncs[node.inContext ? 'out' : 'over'];
							// flag that we're out of context (or will be)
							node.inContext = 0;
						} else { // otherwise, when next doesn't exist or is greater than the target...
							// set next currentIdx to the first child
							flow.stage.currentIdx = node.firstChildIdx;
							// if not in context, set phase to in
							if (!node.inContext) flow.phase = sys.meta.fncs.in;
							// flag that we're in context of this node
							node.inContext = 1;
						}
					} else { // otherwise, when moving backward...
						// set next currentIdx to the parent or younger sibling, based on parent's index
						flow.stage.currentIdx = node.parentIdx >= flow.targetIdx ? node.parentIdx : node.previousIdx;
						// if in context, set phase to "out"
						if (node.inContext) flow.phase = sys.meta.fncs.out;
						// flag that we're out of context (or will be)
						node.inContext = 0;
					}
				} else { // otherwise, when on the target node...
					// set phase to "in" or "main", based on whether we're in context
					flow.phase = sys.meta.fncs[node.inContext ? 'main' : 'in'];
					// flag to remove this target when we're already in context of this node
					flow.stage.hitTarget = node.inContext;
					// flag that we're now in context of this node (if we weren't already)
					node.inContext = 1;
				}
				// if not the root node and there is a phase...
				if (node.idx && flow.phase) {
					// if there is an outNode, descope it's envs
					if (flow.outNode) flow.outNode.descopeEnvs();
					// clear the out node
					flow.outNode = 0;
					// if phase is in, increase scope it's envs
					if (flow.phase === sys.meta.fncs['in']) node.scopeEnvs();
					// if there is a phase function...
					if (hasFnc = node.fncs.hasOwnProperty(flow.phase)) {
						// if the out phase, designate as new outNode (descopes on next round, in case traversal is delayed)
						if (flow.phase === sys.meta.fncs.out) flow.outNode = node;
						// capture result from executing phase function - send args to final "main" phase
						flow.result = flow.execute(node.fncs[flow.phase], (flow.targets.length === 1 && flow.phase === sys.meta.fncs.main) ? flow.args : []);
					} else if (flow.phase === sys.meta.fncs.out) { // or, when phase is out...
						// descope envs for this node (now)
						node.descopeEnvs();
					}
					// if not the main pahse, add node id to nodestack
					if (flow.phase !== sys.meta.fncs.main) flow.nodestack.push(node.id);
				}
				// if not delayed, commit stage updates
				if (!flow.delay) flow.commitStage();
			}
			// if too much recursion...
			if (!r) return 'too much recusion!';
			// return result after final main function (or true when no function exists), otherwise false
			return !flow.targets.length ? (hasFnc ? flow.result : !0) : !1;
		},
		execute: function (fnc, args) {
			// init vars
			var flow = this, // alias self
				rslt; // result of function
			// clear wait
			flow.clearDelay();
			// flag that we're executing
			flow.executing = 1;
			// return result of invoking fnc, with given or empty args
			rslt = fnc.apply(flow.getProxy(), args || []);
			// done executing
			flow.executing = 0;
			// return result of execution
			return rslt;
		},
		commitStage: function (force) {
			var flow = this,
				stage = flow.stage;
			// if the stage is valid...
			if (stage.valid) {
				// use the next position, resolved by the last traversal
				if (stage.currentIdx != null) flow.currentIdx = stage.currentIdx;
				// if the target was hit...
				if (stage.hitTarget) {
					// remove the target, completed by the last traversal
					flow.targets.shift();
					// if no more targets exist...
					if (!flow.targets.length) {
						// reset nodestack
						flow.nodestack = [];
						// reset targetIdx
						flow.targetIdx = null;
						// clear phase
						flow.phase = '';
					}
				}
			}
			// reset stage vars
			flow.stage = {
				valid: 1,
				currentIdx: null,
				hitTarget: 0
			};
		},
		// retrieve or create Env instance with this key
		resolveEnv: function (key) {
			var flow = this;
			return flow.envs.hasOwnProperty(key) ? flow.envs[key] : new sys.objects.Env(flow, key);
		},
		getProxy: function () {
			return new Proxy(this, sys.proxies.Flow, sys.fkey);
		},
		findNode: function (ref) {
			var flow = this,
				cur = flow.nodes[flow.currentIdx],
				node,
				flags, // flags for parsing string references
				s = '/';
			switch (typeof ref) {
				case 'number':
					node = flow.nodes[+ref];
				break;

				case 'object':
					// if a proxy Node, return the node
					if (ref instanceof Proxy && ref._gset().type === 1 && ref.type() === 'Node') node = ref._gset(sys.fkey);
					// if a Node, return the node
					if (ref instanceof sys.objects.Node) node = ref;
				break;

				case 'string':
				case 'function':
					ref = ref.toString();
					// if not an empty string or the special id...
					if (ref && ref !== sys.superId) {
						// get flags for relative paths (remove self-references)
						flags = ref.match(sys.rxp.relativePathFlags);
						// if there are path flags...
						if (flags) {
							// remove process flags from reference
							ref = ref.substr(flags[0].length);
							// isolate individual process flags - remove pounds
							flags = flags[0].replace(/^#|(\/)#|\/$/g,'$1').split(s);
						} else { // otherwise, when there are no path flags...
							// set flags to default array
							flags = [];
						}
						// get related node
						node = cur.getRelatedNode(flags, ref);
					}
				break;
			}
			return node;
		},
		clearDelay: function () {
			// init vars
			var flow = this, // alias self
				d = 1; // capture when the delay was cleared
			// if there is a delay...
			if (flow.delay !== null) {
				// if not a function, assume a timeout and clear it
				if (typeof flow.delay !== 'function') window.clearTimeout(flow.delay);
				// nullify delay and set delay-presence flag
				flow.delay = d = null;
			}
			// return true if there was a delay to clear
			return !d;
		}
	}

	sys.objects.Env = function (flow, key) {
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
			i,metaName,
			meta = sys.meta,
			fncs = meta.fncs,
			keys = meta.keys;

		// if no parent...
		if (!parent) {
			// init vars for super node
			def = {};
			name = '_super';
		}

		node.flow = flow;
		node.idx = flow.nodes.push(node) - 1;
		if (parent) {
			node.parentIdx = parent.idx;
			node.localChildIdx = parent.children.push(node) - 1;
			parent.lastChildIdx = node.idx;
			// if not the first child...
			if (node.localChildIdx) {
				node.previousIdx = parent.children[node.localChildIdx - 1].idx;
				parent.children[node.localChildIdx - 1].nextIdx = node.idx;
			} else { // otherwise, when the first child...
				parent.firstChildIdx = node.idx;
			}
		}

		node.children = [];
		node.fncs = {};
		node.envs = {};
		node.name = name || '_root';
		node.isRoot = !name || !parent;
		node.rootIdx = node.isRoot ? node.idx : parent.rootIdx;
		node.depth = parent ? parent.depth.concat(name ? name : '') : [''];
		node.id = parent ? node.depth.join('/') + '/' : sys.superId; // set to special id for super node
		flow.nodeIds[node.id] = node.idx;

		if (sys.isFnc(def)) {
			node.fncs[fncs.main] = def;
		} else {
			for (i in def) {
				if (def.hasOwnProperty(i)) {
					if (i.charAt(0) === meta.prefix) {
						metaName = i.substring(1);
						// if this is a meta function...
						if (fncs[metaName] === metaName && sys.isFnc(def[i])) {
							// add to node functions
							node.fncs[metaName] = def[i];
						} else if (keys[metaName] === metaName && !sys.isFnc(def[i])) { // otherwise, when this is a meta key (not a function)...
							// based on the key
							switch (metaName) {
								case keys.env : // environment keys
									node.sanitizeAddEnvDef(def[i]);
								break;

								case keys.root : // root flag
									// force first node to be a root
									node.isRoot = !!def[i];
									// set rootIdx to self
									node.rootIdx = node.idx;
								break;
							}
						} else {
							// throw error - unknown meta
						}
					} else if (!sys.rxp.badNodeName.test(i)) { // when not an illegal node name
						// create child nodes
						new sys.objects.Node(flow, node, def[i], i);
					}
				}
			}
		}
		node.localPath = parent ? node.id.substr(Math.max(flow.nodes[node.rootIdx].id.length - 1,1)) : '/';
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
		},
		getRelatedNode: function (flags, path) {
			var node = this,
				flow = node.flow,
				parentNode = flow.nodes[node.parentIdx],
				nextNode,
				i = 0,
				flag,
				s = '/';
			if (flags.length) {
				// remove and capture the next flag and split by pipe
				flag = flags.shift();
				// set flag to collection of options
				flag = (/^[\w\|]+$/.test(flag)) ? flag.split('|') : [flag];
				// get flag count
				flagCnt = flag.length;
				// while no next index is resolved and when we run out of flag possibilities...
				while (nextNode == null && i < flagCnt) {
					// based on this flag...
					switch (flag[i]) {
						case 'child':
							nextNode = node.firstChildIdx;
						break;

						case 'next':
							nextNode = node.nextIdx;
						break;

						case 'oldest':
							nextNode = parentNode ? parentNode.lastChildIdx : -1;
						break;

						case 'parent':
						case '..':
							nextNode = node.parentIdx;
						break;

						case 'previous':
							nextNode = node.previousIdx;
						break;

						case 'root': // local root of flow branch
							nextNode = node.rootIdx;
						break;

						case 'super': // root of flow's first node
							nextNode = 1;
						break;

						case 'youngest':
							nextNode = parentNode ? parentNode.firstChildIdx : -1;
						break;

						case 'self':
						case '.':
							nextNode = node.idx;
						break;
					}
					// increment i
					i++;
				}
				// target next node
				node = flow.nodes[nextNode];
				// return this node's method result, if it's valid
				return node ? node.getRelatedNode(flags, path) : 0;
			} else { // otherwise, when there are no flags to process...
				// if path is a valid string...
				if (path.length) {
					// if not an absolute id...
					if (path.charAt(0) !== s) {
						// prepend this node's super path
						path = node.id + path;
					} else if (path.charAt(1) !== s) { // or, when a if not a super path...
						// prepend this node's root
						path = flow.nodes[node.rootIdx].id.slice(0,-1) + path;
					}
					// if last character is not a slash, append one (for convenience)
					if (path.charAt(path.length - 1) !== s) path += s;
					// return node with this id or false
					return flow.nodeIds.hasOwnProperty(path) && flow.nodes[flow.nodeIds[path]];
				} else { // otherwise, when there is no path to append...
					// return this node
					return node;
				}
			}
		}
	};

	window.Flow = function () {
		var that = this,
			args = arguments,
			id = args[0],i, flow,
			tree = args.length > 1 ? args[1] : id;
		// if not called with a new operator...
		if (that.hasOwnProperty && !(that instanceof arguments.callee)) {
			// if no arguments...
			if (!args.length) {
				id = [];
				for (i in sys.flows) {
					if (sys.flows.hasOwnProperty(i)) id.push(i);
				}
				// return list of flow id's available
				return id;
			}
			// (otherwise) return the flow reference or false
			return (flow = sys.getFlow(id)) ? flow.getProxy() : !1;
		}
		// if no arguments...
		if (!args.length) {
			throw new Error('Flow: missing tree');
		}
		// if tree is not an object
		if (typeof tree !== 'object') {
			// throw error - invalid argument
			throw new Error('Flow: invalid tree');
		}
		// (otherwise) return map of flow
		return (new sys.objects.Flow((!sys.flows.hasOwnProperty(id) && sys.isValidFlowId(id)) ? id : (sys.tick++).toString(20), tree)).getProxy().map();
	};

})(this);