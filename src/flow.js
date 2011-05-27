/*
 * Flow v0.2.2.3
 * http://github.com/bemson/Flow/
 *
 * Copyright 2011, Bemi Faison
 * Released under the MIT License
 */
(function (window) {
	var sys = {
			// signature object
			fkey: {},
			// unique number
			tick: new Date() * 1,
			rxp: {
				oneAlpha: /\w/, // at least one alpha-numeric character
				absPath: /^\/\//, // tostring of map function
				typeObjFnc: /^(?:object|function)$/,
				nodeNameBad: /^toString$|^\d|[\/\|]|^[_@\[]/,
				relativePathFlags: /^(?:(?:\.{1,2}|[@\[][^\/]+)\/?)+/,
				gateOkAction: /^[cg]/,
				gateBadAlias: /^args|go|target|wait$/,
				gateOkAlias: /^destroy|type$/
			},
			// allows getting type as array
			typeOf: function (obj) {
				var type = typeof obj;
				return type === 'object' && Object.prototype.toString.call(obj) === '[object Array]' ? 'array' : type;
			},
			isValidFlowId: function (id) {
					return typeof id === 'string' && sys.rxp.oneAlpha.test(id)
			},
			isFnc: function (v) {
				return typeof v === 'function'
			},
			superId: '..//', // special id for the super node
			flows: {},
			activeFlows: [], // array of active flows
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
					vars: 'vars',
					root: 'root',
					pendable: 'pendable',
					restrict: 'restrict'
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
						if (ref instanceof GSet && ref._gset().type === 1 && ref.type() === 'Flow') obj = ref._gset(sys.fkey);
						// if a Flow, return the flow
						if (ref instanceof fCnst) obj = ref;
					break;

					case 'function':
						if (ref.hasOwnProperty('toString') && sys.rxp.absPath.test(ref.toString()) && (obj = ref(sys.fkey)) instanceof fCnst) return obj;
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
	sys.proxies.Flow = new GSet(
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
					// if executing and either the flow is not pending, or paused with parent flows...
					if (flow.exec && (!flow.childFlows.length || (!flow.parentFlows.length && flow.delay.active))) {
						// unregister id
						delete sys.flows[flow.id];
						// set new id
						flow.id = id;
						// register id
						sys.flows[flow.id] = flow;
						// flag success
						return 1;
					}
					// (otherwise) flag inability to change the flow id
					return 0;
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
									// returns false  when the flow is dead or locked
									return flow.dead ? !1 : (key === sys.fkey ? flow : ((flow.exec || (flow.nodes[flow.currentIdx].allowTgt(node) && !flow.locked)) ? flow.target(node, [].slice.call(arguments)) : !1));
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
			// STATUS METHODS //
			status: [
				function () {
					var flow = this,
						cache = flow.cache.proxy,
						nodes = flow.nodes,
						node = flow.nodes[flow.currentIdx],
						cnst = function () {},
						tmp, i, j; // loop vars

					// if there is no status cache, create one
					if (!cache.status) cache.status = {};

					// if there is no status.simple cache...
					if (!cache.status.simple) {
						cache.status.simple = {
							internal: !!flow.exec,
							depth: node.depth.length - 1,
							phase: flow.phase,
							restriction: node.restrict || '',
							location: node.id,
							index: node.idx,
							state: node.name,
							pendable: !!node.pendable
						};
					}
					// begin prototype with simple cache
					cnst.prototype = cache.status.simple;

					// pending - no cache
					tmp = flow.getPending();
					for (i = 0; tmp[i]; i++) {
						tmp[i] = tmp[i].id;
					}
					cnst.prototype.pending = tmp;

					// if there is no traversal cache...
					if (!cache.status.traversal) {
						cache.status.traversal = {
							paused: !!flow.delay.active,
							loops: ((',' + flow.nodestack.join()).match(new RegExp(',(' + node.idx + ')\\b','g')) || []).length
						};
						tmp = [];
						j = flow.nodestack.length;
						for (i = 0; i < j; i++) {
							tmp.push(nodes[flow.nodestack[i]].id);
						}
						cache.status.traversal.history = tmp;
						tmp = flow.getRoute();
						// get path of each node
						for (i = 0; tmp[i]; i++) {
							tmp[i] = tmp[i].id;
						}
						cache.status.traversal.targets = tmp;
					}
					for (i in cache.status.traversal) {
						if (cache.status.traversal.hasOwnProperty(i)) cnst.prototype[i] = cache.status.traversal[i];
					}

					// return clone of status values
					return new cnst();
				}
			],
			lock: [
				'locked',
				0,
				function (v) {
					var flow = this;
					// if in a flow function...
					if (flow.exec) {
						flow.locked = !!v;
						return 1;
					}
					// (otherwise) ignore call
					return 0;
				}
			],
			query: function () {
				var flow = this,
					args = arguments, i = 0,
					node, nodes = [];
				for (; node = flow.findNode(args[i]); i++) {
					nodes.push(node.id);
				}
				// return the node id or false
				return (nodes.length && nodes.length === args.length) ? (nodes.length > 1 ? nodes : nodes[0]) : !1;
			},
			// DATA METHODS //
			// Manage flow arguments
			// arguments() -> return arguments array
			// arguments(integer) -> return value at given integer, or undefined when number is invalid
			// arguments(integer, value) -> return true after setting value
			// arguments(integer, null) -> return true after removing last index
			// arguments(array) -> returns true after replacing all arguments
			args: function () {
				var flow = this,
					args = arguments,
					a1 = args[0],
					a2 = args[1],
					a1Ok = a1 > -1 && Math.ceil(a1) === a1,
					fargs = flow.args;
				switch (args.length) {
					case 0 :
						return fargs.concat();
					break;
					
					case 1:
						switch (sys.typeOf(a1)) {
							case 'array':
								flow.args = a1.concat();
								return !0;
							break;

							case 'number':
								if (a1Ok) return fargs[a1];
							break;
						}
					break;

					default:
						// if index is valid...
						if (a1Ok) {
							// if the value is undefined for the last item...
							if (a2 === undefined && a1 === fargs.length - 1) {
								// remove last item
								fargs.splice(-1,1);
							} else { // otherwise, when not a "delete" flag...
								// set value at the given index
								fargs[a1] = a2;
							}
							// flag success
							return !0;
						}
					break;
				}
				// (ultimately) return false
				return !1;
			},
			vars: function () {
				var flow = this,
					args = arguments,
					a1 = args[0],
					a2 = args[1],
					v = typeof a1 === 'string' && sys.rxp.oneAlpha.test(a1) && flow.resolveVar(a1),
					i, rtn = !1;
				switch (args.length) {
					case 0: // get names of all vars
						rtn = [];
						for (i in flow.vars) {
							if (flow.vars.hasOwnProperty(i)) rtn.push(i);
						}
					break;

					case 1: // get the value of this var
						if (v) rtn = v.values[0];
					break;

					default:
						// if the var is valid...
						if (v) {
							// set the current value
							v.values[0] = a2;
							rtn = !0;
						}
					break;
				}
				// return result
				return rtn;
			},
			destroy: function () {
				// init vars
				var flow = this;
				// if not dead... (why did I protect child flows?)
				if (!flow.dead) {
					// remove self from flows
					delete sys.flows[flow.id];
					// set dead flag
					flow.dead = 1;
					// clear delay (if any)
					flow.clearDelay();
					// inform parents that this flow is done
					flow.informParentFlows();
				}
				// return dead status
				return !!flow.dead;
			},
			// TRAVERSAL METHODS //
			// pause flow
			// wait() -> pause indefinitely
			// wait(time) -> for the given period of time
			// wait(fnc, time) -> execute the call back after the given period of time
			wait: function () {
				var flow = this,
					args = arguments,
					cur = flow.nodes[flow.currentIdx],
					cache = flow.cache.proxy,
					argLn = args.length,
					M = Math, // reduce lookups
					fnc = argLn > 1 ? args[0] : 0,
					node, // stub to test when fnc is a node reference
					fncOk = !fnc || typeof fnc === 'function' || ((node = flow.findNode(fnc)) && cur.allowTgt(node)),
					time = M.ceil(M.abs(args[argLn - 1])),
					timeOk = !isNaN(time),
					rtn = 1;
				// if there are targets or staged waypoints to reach, and the argument's are valid (node is not false)...
				if ((flow.targets.length || flow.stage.waypoints.length) && (!argLn || (timeOk && fncOk && node !== !1))) {
					// if reset traversal cache
					if (cache.status) {
						delete cache.status.traversal;
					}
					// clear existing delay
					flow.clearDelay();
					// if fnc was a node, make a function that targets it, as the callback
					if (node) fnc = function () {flow.target(node)};
					// set delay to truthy value or delayed traverse call
					flow.delay.active = argLn ? window.setTimeout(function () {
							// se callback next callback
							flow.delay.callback = fnc;
							// clear delay
							flow.delay.active = 0;
							// attempt traversal - invokes callback
							flow.traverse();
						}, time) : 1;
					// flag that the flow will be (or has been) delayed
					rtn = 0;
				}
				// return boolean flag of success or failure
				return !rtn;
			},
			// get/set traversal target - clears route
			// target(path, args) - return result of main function, true (when omitted), or false when the flow was paused or pending
			target: function (ref) {
				var flow = this,
					cache = flow.cache.proxy,
					node = flow.findNode(ref);
				// if a valid node...
				if (node && flow.nodes[flow.currentIdx].allowTgt(node)) {
					// reset traversal cache
					if (cache.status) {
						delete cache.status.traversal;
					}
					// return traversal result for valid node
					return flow.target(node, [].slice.call(arguments, 1));
				}
				// (otherwise) return false
				return !1;
			},
			// continue traversal
			// go() - resume traversal
			// go(waypoints) - when a target exists, waypoints are injected into the route - with no target, the last waypoint is used
			go: function () {
				var flow = this,
					cache = flow.cache.proxy,
					cur = flow.nodes[flow.currentIdx],
					args = arguments,
					argLn = args.length,
					tgtLn = flow.targets.length,
					node,
					points = [],
					i = 0;
				// while waypoints are valid...
				for (; (node = flow.findNode(args[i])) && cur.allowTgt(node); i++) {
					// add to points
					points.push(node);
				}
				// if waypoints were omitted, or waypoints were given and valid...
				if (!argLn || argLn === points.length) {
					// reset traversal cache
					if (cache.status) {
						delete cache.status.traversal;
					}
					// clear any delays
					flow.clearDelay();
					// if there are targets or waypoints...
					if (tgtLn || points.length) {
						// if there are waypoints, stage them
						if (points.length) {
							flow.stage.waypoints = points;
						}
						// traverse towards a target
						flow.traverse();
						// flag that the flow moved or will move for the given waypoints, or false when there are childFlows preventing movement
						return argLn ? !0 : !flow.childFlows.length;
					}
				}
				// return false
				return !1;
			}
		},
		// gate - deny dead or locked instances (outside of an execution)
		function () {
			var flow = this,
				ctx = GSet.getContext(arguments);
			// allow calls when to "id", not dead and either executing or unlocked, or the alias is vars, or the action is "get" or "custom" and not a prohibited method
			return sys.rxp.gateOkAlias.test(ctx.alias) || ( // allow ok aliases OR
				!flow.dead && ( // deny when dead OR
				flow.exec || // allow when executing
				!flow.locked || // allow when unlocked
					sys.rxp.gateOkAction.test(ctx.action) && // allow when get/custom action AND
					!sys.rxp.gateBadAlias.test(ctx.alias) // not a dissapproved method
				)
			)
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
		// flag when flow methods can not be called outside the map
		flow.locked = !1;
		// flags when this flow is actively executing functions
		flow.exec = 0;
		// pause/delay object - contains flags active and callback
		flow.delay = {};
		flow.phase = '';
		// nodes in path of target during each traversal (until target is met)
		flow.nodestack = [];
		// variables and arguments
		flow.vars = {};
		flow.args = [];
		// method cache
		flow.cache = {
			findNode: {},
			proxy: {}
		};
		// related flows that can impact execution
		flow.childFlows = { // indexed hash of child flows that have not completed execution
			indice: {},
			length: 0
		};
		flow.parentFlows = []; // queue of flows to inform when this flow hits a target
		// space for storing traversal flags
		flow.stage = {waypoints:[]};
		sys.flows[flow.id] = flow;
		flow.nodes = [];
		flow.nodeIds = {}; // maps node id with index
		// create master node and append given tree
		new sys.objects.Node(flow, new sys.objects.Node(flow), tree); // create node tree
	};
	sys.objects.Flow.prototype = {
		target: function (node, data) {
			var flow = this;
			// clear delay
			flow.clearDelay();
			// clear targets
			flow.targets = [];
			// set arguments
			flow.args = data;
			// stage new waypoint
			flow.stage.waypoints = [node];
			// flag that our target has not been hit
			flow.stage.hitTarget = 0;
			// return traversal attempt
			return flow.traverse();
		},
		traverse: function () {
			var flow = this, // alias self
				node, // current node
				cb, // stub for callback function
				next, // next movement flags
				hasFnc; // flags when a phase function exists

			// exit when executing or pending, return false when pending
			if (flow.exec || flow.childFlows.length) return !flow.childFlows.length;
			// if there is a callback function (from delay that has timed out or been unblocked from a pending childflow)...
			if (flow.delay.callback) {
				// capture callback
				cb = flow.delay.callback;
				// nullify callback - prevent infinite loop
				flow.delay.callback = 0;
				// fire callback function
				flow.execute(cb);
				// return false or result of recursive call based on delay
				return flow.delay.active ? 0 : flow.traverse();
			}
			// if status cache is present, clear traversal cache
			if (flow.cache.proxy.status) {
				delete flow.cache.proxy.status;
			}
			// commit route changes from stage - sets targets
			flow.commitStage();
			// while not dead, paused, or pending, and there are targets...
			while (!flow.dead && !flow.delay.active && !flow.childFlows.length && flow.targets.length) {
				// reset phase
				flow.phase = 0;
				// reset hasFnc
				hasFnc = 0;
				// get index of this target
				flow.targetIdx = flow.targets[0].idx;
				// get current node
				node = flow.nodes[flow.currentIdx];
				// get next move to reach the target
				next = flow.getNextMove(node, flow.nodes[flow.targetIdx]);
				// if moving...
				if (!next.none) {
					// set phase and context based on movement
					if (next.right || next.left) {
						if (node.inContext) {
							flow.phase = sys.meta.fncs.out;
						} else if (next.right) {
							flow.phase = sys.meta.fncs.over;
						}
						node.inContext = 0;
						flow.stage.currentIdx = next.right ? node.nextIdx : node.previousIdx;
					}
					if (next.up) {
						flow.phase = sys.meta.fncs.out;
						node.inContext = 0;
						flow.stage.currentIdx = node.parentIdx;
					}
					if (next.down) {
						// if not already in context, set phase - prevents repetition
						if (!node.inContext) flow.phase = sys.meta.fncs['in'];
						node.inContext = 1;
						flow.stage.currentIdx = node.firstChildIdx;
					}
				} else { // otherwise, when on the target node...
					// set phase to "in" or "main", based on whether we're in context
					flow.phase = sys.meta.fncs[node.inContext ? 'main' : 'in'];
					// flag to remove this target when we're already in context of this node
					flow.stage.hitTarget = node.inContext;
					// flag that we're now in context of this node (if we weren't already)
					node.inContext = 1;
				}
				// if there is a phase...
				if (flow.phase) {
					// if there is an outNode, descope it's vars
					if (flow.outNode) flow.outNode.descopeVars();
					// clear the out node
					flow.outNode = 0;
					// if phase is in, increase scope it's vars
					if (flow.phase === sys.meta.fncs['in']) node.scopeVars();
					// if there is a phase function...
					if (hasFnc = node.fncs.hasOwnProperty(flow.phase)) {
						// if the out phase, designate as new outNode (descopes on next round, in case traversal is delayed)
						if (flow.phase === sys.meta.fncs.out) flow.outNode = node;
						// capture result from executing phase function - send args to final "main" phase
						flow.result = flow.execute(node.fncs[flow.phase], (flow.targets.length === 1 && flow.phase === sys.meta.fncs.main) ? flow.args : []);
					} else if (flow.phase === sys.meta.fncs.out) { // or, when phase is out...
						// descope vars for this node (now)
						node.descopeVars();
					}
				}
				// if not dead, delayed nor pending, commit stage updates
				if (!flow.dead && !flow.delay.active && !flow.childFlows.length) flow.commitStage();
			}
			// cement route
			flow.targets = flow.getRoute();
			// clear waypoints
			flow.stage.waypoints = [];
			// clear nodestack
			flow.nodestack = [];
			// if not dead, no more targets, inform parents this flow has reached it's target
			if (!flow.dead && !flow.targets.length) flow.informParentFlows();
			// return result after final main function (or true when no function exists or returns undefined), otherwise false (also when dead)
			return !flow.targets.length && !flow.dead ? (hasFnc && flow.result !== undefined ? flow.result : !0) : !1;
		},
		execute: function (fnc, args) {
			// init vars
			var flow = this, // alias self
				node = flow.nodes[flow.currentIdx], // current node
				rslt; // result of function
			// clear proxy method cache
			flow.cache.proxy = {};
			// flag that we're executing
			flow.exec = 1;
			// if this node is pendable..
			if (node.pendable) {
				// if there is an active flow...
				if (sys.activeFlows.length) {
					// capture the id of the activeFlow, as this flow's parent
					flow.parentFlows.push(sys.activeFlows[0].id);
					// add this flow as a child to the parent
					sys.activeFlows[0].addChildFlow(flow.id);
				}
				// add self to active flows
				sys.activeFlows.unshift(flow);
			}
			// return result of invoking fnc, with given or empty args
			rslt = fnc.apply(flow.getGSet(), args || []);
			// if this node is pending, remove from stack of active flows
			if (node.pendable) sys.activeFlows.shift();
			// flag that this Flow is done
			flow.exec = 0;
			// clear proxy method cache (again)
			flow.cache.proxy = {};
			// return result of execution
			return rslt;
		},
		commitStage: function (force) {
			var flow = this,
				plist, i = 0, pflow,
				stage = flow.stage,
				tgts, phase = flow.phase,
				phases = sys.meta.fncs,
				destIdx;
			// get array of targets - sets valid flag
			flow.targets = flow.getRoute();
			// alias targets
			tgts = flow.targets;
			// if there are targets...
			if (tgts.length) {
				// get destination index
				destIdx = tgts[tgts.length - 1].idx;
				// if there is no nothing in the nodestack, or the phase is "in" or 'over", or when "out" this node is not already in the nodestack...
				if (!flow.nodestack.length ||
					(
						phase && 
						flow.currentIdx !== flow.nodestack[flow.nodestack.length - 1] && 
						(
							phase === phases.over ||
							phase === phases.out ||
							(phase === phases['in'] && (flow.currentIdx !== destIdx))
						)
					)
				) flow.nodestack.push(flow.currentIdx);
			}
			// if the stage is valid - unchanged by traversal methods...
			if (stage.valid) {
				// use the next position, resolved by the last traversal
				if (stage.currentIdx != null) flow.currentIdx = stage.currentIdx;
				// if the target was hit...
				if (stage.hitTarget) {
					// remove the target, completed by the last traversal
					tgts.shift();
					// if no more targets exist...
					if (!tgts.length) {
						// clear arguments
						flow.args = [];
						// reset targetIdx
						flow.targetIdx = null;
						// clear phase
						flow.phase = '';
					}
				}
			}
			// reset stage vars
			flow.stage = {
				fnc: 0,
				valid: 1,
				currentIdx: null,
				hitTarget: 0,
				waypoints: []
			};
		},
		getNextMove: function (cur, tgt) {
			var flow = this,
				dir = tgt.idx - cur.idx,
				move = {};
				if (dir) {
					// if these nodes have the same parent...
					if (cur.parentIdx === tgt.parentIdx) {
						move[dir > 0 ? 'right' : 'left'] = 1;
					} else if (cur.depth.length === tgt.depth.length) { // or, when their depths match...
						move.up = 1;
					} else if (tgt.path.indexOf(cur.path) === 0) { // or, when this node contains the target...
						move.down = 1;
					} else if (dir > 0) { // or, when moving forward...
						// if the parent contains the target...
						if (tgt.path.indexOf(flow.nodes[cur.parentIdx].path) === 0) { // or, when the parent contains the target...
							move.right = 1;
						} else {
							move.up = 1;
						}
					} else { // when moving backwards...
						// if the parent contains the target...
						if (tgt.idx !== cur.parentIdx && tgt.path.indexOf(flow.nodes[cur.parentIdx].path) === 0) {
							move.left = 1;
						} else {
							move.up = 1;
						}
					}
				} else { // otherwise, when not making a move...
					// flag that no move will be made
					move.none = 1;
				}
				// return move object
				return move;
		},
		// return array of nodes based on current target, waypoints, and phase
		getRoute: function () {
			var flow = this,
				inMain = flow.phase === sys.meta.fncs.main,
				wp = flow.stage.waypoints.concat(),
				wpLn = wp.length,
				tgts = flow.targets,
				rte = tgts.concat(); // copy targets

				// if there are waypoints...
				if (wpLn) {
					// if there are no targets...
					if (!tgts.length) {
						// set route to waypoints
						rte = wp;
					} else { // otherwise, when there are targets...
						// if the last waypoint matches the current or the second target (based on the phase), remove the matching waypoint
						if (wp[wpLn - 1] === rte[inMain ? 1 : 0]) wp.pop();
						// if in main phase...
						if (inMain) {
							// insert waypoints after first target
							rte = [].concat(rte[0],wp,rte.slice(1));
						} else { // otherwise, when not in main...
							// prepend waypoints
							rte = wp.concat(rte);
						}
					}
				}
				// flag when the target has changed (invalidating the stage)
				flow.stage.valid = rte[0] === tgts[0];
				return rte;
		},
		// return paused descendant flows
		getPending: function (list, track, flowList) {
			var flow = this,
				ary = list || [],
				idx = track || {},
				ids = flowList || {},
				id, kids = flow.childFlows, kid;
			// flag that this flow has been searched
			ids[flow.id] = 1;
			// if this flow has children...
			if (kids.length) {
				for (id in kids.indice) {
					// if not inherited, child flow count is valid, and the flow is valid...
					if (kids.indice.hasOwnProperty(id) && kids.indice[id] > 0 && (kid = sys.flows[id])) {
						// if flow is paused and not already indexed...
						if (kid.delay.active && !idx.hasOwnProperty(kid.id)) idx[kid.id] = ary.push(kid);
						// if this flow's has not been searched, get paused children
						if (!ids.hasOwnProperty(kid.id)) kid.getPending(ary, idx, ids);
					}
				}
			}
			return ary;
		},
		addChildFlow: function (id) {
			var flow = this,
				kids = flow.childFlows;
			// if this childFlow has no index, init at 0
			if (!kids.indice.hasOwnProperty(id)) kids.indice[id] = 0;
			// increment number of child flows with this id
			kids.indice[id]++;
			// increment total number
			kids.length++;
		},
		removeChildFlow: function (id) {
			var flow = this,
				kids = flow.childFlows;
			// if there are kids with this id...
			if (kids.length && kids.indice.hasOwnProperty(id) && kids.indice[id] > 0) {
				// decrement index
				kids.indice[id]--;
				// decrement total
				kids.length--;
				// if there are no more children and we're not delayed, continue traversing
				if (!kids.length && !flow.delay.active) flow.traverse();
			}
		},
		informParentFlows: function () {
			var flow = this,
				i = 0,
				parents = flow.parentFlows,
				parent,
				list;
			// if there are parents...
			if (parents.length) {
				// copy parent id's
				list = parents.concat();
				// empty parents array
				parents.length = 0;
				// with each parent flow...
				for (; list[i]; i++) {
					// if the parent exists, tell it to reduce it's child count
					if (parent = sys.flows[list[i]]) parent.removeChildFlow(flow.id);
				}
			}
		},
		// retrieve or create Var instance with this key
		resolveVar: function (key) {
			var flow = this;
			return flow.vars.hasOwnProperty(key) ? flow.vars[key] : new sys.objects.Var(flow, key);
		},
		getGSet: function () {
			return new GSet(this, sys.proxies.Flow, sys.fkey);
		},
		findNode: function (ref) {
			var flow = this,
				cur = flow.nodes[flow.currentIdx],
				node = !1,
				qry,
				flags, // flags for parsing string references
				s = '/';
			switch (typeof ref) {
				case 'number':
					node = flow.nodes[+ref];
				break;

				case 'object':
					// if a proxy Node, return the node
					if (ref instanceof GSet && ref._gset().type === 1 && ref.type() === 'Node') node = ref._gset(sys.fkey);
					// if a Node, return the node
					if (ref instanceof sys.objects.Node) node = ref;
				break;

				case 'string':
				case 'function':
					qry = ref = ref.toString();
					// if the superid...
					if (ref === sys.superId) {
						node = flow.nodes[0];
					} else if (ref.length && (ref.length < 3 || !/\/{2,3}$/.test(ref))) { // otherwise, when not empty and doesn't end in two or three slashes...
						// if an absolute node reference...
						if (ref.substr(0,2) === '//') {
							// append last slash when missing
							if (ref.charAt(ref.length - 1) !== s) ref += s;
							// set node to match in flow.nodeIds
							node = flow.nodes[flow.nodeIds[ref]];
						} else { // otherwise, when not an absolute node path...
							// prefix query with the current index or current node's root index, based on whether the ref begins with a '/'
							qry = (ref.charAt(0) === s ? cur.rootIdx : cur.idx) + qry;
							// if result of this unique string query has not been cached...
							if (!flow.cache.findNode.hasOwnProperty(qry)) {
								// get flags for relative paths (remove self-references)
								flags = ref.match(sys.rxp.relativePathFlags);
								// if there are path flags...
								if (flags) {
									// remove process flags from reference
									ref = ref.substr(flags[0].length);
									// remove end flag and isolate individual process flags
									flags = flags[0].replace(/\/$/,'').split(s);
								} else { // otherwise, when there are no path flags...
									// set flags to default array
									flags = [];
								}
								// capture related node in cache
								flow.cache.findNode[qry] = cur.getRelatedNode(flags, ref);
							}
							// use cached result
							node = flow.cache.findNode[qry];
						}
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
			if (flow.delay.active !== null) {
				// remove delay function
				flow.delay.callback = 0;
				// clear potential timeout pointer
				window.clearTimeout(flow.delay.active);
				// nullify delay and set delay-presence flag
				flow.delay.active = d = null;
			}
			// return true if there was a delay to clear
			return !d;
		}
	}

	sys.objects.Var = function (flow, key) {
		var v = this;
		v.flow = flow;
		v.key = key;
		v.values = [undefined]; // initial value is undefined
		// add self to flow's vars
		flow.vars[key] = v;
	};
	sys.objects.Var.prototype = {
		descope: function () {
			var v = this;
			// remove scope from values
			v.values.shift();
			// if no more scope levels exist, remove self-reference from flow
			if (!v.values.length) delete v.flow.vars[v.key];
			// flag that this instance was descoped
			return 1;
		},
		scope: function () {
			var v = this;
			// copy current value as the new value (first value)
			v.values.unshift(v.values[0]);
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
			name = '_flow';
		}

		node.flow = flow;
		node.idx = flow.nodes.push(node) - 1;
		node.children = [];
		node.childrenNames = {};
		node.fncs = {};
		node.vars = {};
		node.pendable = !parent ? 1 : parent.pendable; // flow-root is pending, otherwise copy pending flag
		node.name = name || '_root';
		node.isRoot = !name || !parent;
		node.restrict = parent ? parent.restrict : 0;
		node.rootIdx = node.isRoot ? node.idx : parent.rootIdx;
		node.depth = parent ? parent.depth.concat(name ? name : '') : [''];
		node.path = node.depth.join('/') + '/';
		node.pathPrefix = node.idx > 1 ? node.path : '//';
		node.id = parent ? node.path : sys.superId; // set to special id for super node
		flow.nodeIds[node.id] = node.idx;

		if (parent) {
			node.parentIdx = parent.idx;
			node.localChildIdx = parent.children.push(node) - 1;
			parent.lastChildIdx = node.idx;
			parent.childrenNames[node.name] = node.idx;
			// if not the first child...
			if (node.localChildIdx) {
				node.previousIdx = parent.children[node.localChildIdx - 1].idx;
				parent.children[node.localChildIdx - 1].nextIdx = node.idx;
			} else { // otherwise, when the first child...
				parent.firstChildIdx = node.idx;
			}
		}

		if (sys.isFnc(def)) {
			node.fncs[fncs.main] = def;
		} else { // states must be functions
			for (i in def) {
				if (def.hasOwnProperty(i)) {
					// if a component...
					if (i.charAt(0) === meta.prefix) {
						metaName = i.substring(1);
						// if this is a meta function...
						if (fncs[metaName] && sys.isFnc(def[i])) {
							// add to node functions, use metaName
							node.fncs[metaName] = def[i];
						} else if (keys[metaName] && !sys.isFnc(def[i])) { // otherwise, when this is a meta key (not a function)...
							// based on the key
							switch (keys[metaName]) {
								case keys.vars : // variable keys
									node.sanitizeAddVarDef(def[i]);
								break;

								case keys.root : // root flag
									// if isRoot is true, set rootIdx to self
									if (node.isRoot = !!def[i]) node.rootIdx = node.idx;
								break;

								case keys.pendable : // pending flag
									// allow/deny pending in this and descendant states
									node.pendable = !!def[i];
								break;

								case keys.restrict : // restrict flag
									// if retrict is truthy, set restricted paths to self
									if (def[i]) node.restrict = node.path;
								break;
							}
						} else {
							// throw error - unknown meta
						}
					} else if (sys.rxp.typeObjFnc.test(typeof def[i]) && !sys.rxp.nodeNameBad.test(i)) { // or, an object with a legal legal node name...
						// create child nodes
						new sys.objects.Node(flow, node, def[i], i);
					}
				}
			}
		}
		node.localPath = parent ? node.id.substr(Math.max(flow.nodes[node.rootIdx].id.length - 1,1)) : '/';
	};
	sys.objects.Node.prototype = {
		allowTgt: function (tgt) {
			var node = this;
			return node.flow.exec || !node.restrict || (tgt.path.length > node.restrict.length && !tgt.path.indexOf(node.restrict));
		},
		// add single variable - supports cfg can be a string or object
		addVarDef: function (cfg) {
			var node = this,
				cnt = 0, // number of vars created
				i; // loop vars
			// if cfg is an object...
			if (typeof cfg === 'object') {
				for (i in cfg) {
					if (cfg.hasOwnProperty(i)) {
						node.vars[i] = {name: i, value: cfg[i], useValue: 1};
						cnt++;
					}
				}
			} else if (sys.rxp.oneAlpha.test(cfg)) { // or, when a valid variable name...
					node.vars[cfg]= {name: cfg, useValue: 0};
					cnt++;
			}
			// return number of vars created
			return cnt;
		},
		// set variables
		/*
		any number of args can exist in the following following formats:
		1) a string as a variable name ''
		2) an array of strings as variable names ['','']
		3) an object with pairs, representing the variable name and value {key:'',key:''}
		4) an array of objects with pairs for variable name and value [{key:'', key:''},{key:'',key:''}]
		*/
		sanitizeAddVarDef: function () {
			var node = this, // alias self
				args = [].slice.call(arguments), // get arguments as an array
				i = 0, j = args.length, // loop vars
				cnt = 0; // variable names added
			for (; i < j; i++) {
				switch (sys.typeOf(args[i])) {
					case 'array' :
						cnt += node.sanitizeAddVarDef.apply(node,args[i]);
					break;

					case 'string' :
					case 'object' :
						cnt += node.addVarDef(args[i]);
					break;

					default:
						// throw error? - invalid var definition
				}
			}
			// return number of vars added
			return cnt;
		},
		scopeVars: function () {
			var node = this,
				flow = node.flow,
				i;
			for (i in node.vars) {
				if (node.vars.hasOwnProperty(i)) {
					// if the node exists in the flow...
					if (flow.vars.hasOwnProperty(i)) {
						flow.vars[i].scope();
					} else { // otherwise, when the node does not exist...
						// resolve node
						flow.resolveVar(i);
					}
					// if there is a default value, set var value
					if (node.vars[i].useValue) flow.vars[i].values[0] = node.vars[i].value;
				}
			}
		},
		descopeVars: function () {
			var node = this,
				flow = node.flow,
				i;
			for (i in node.vars) {
				// if not inherited and the node exists in the flow, descope variable
				if (node.vars.hasOwnProperty(i) && flow.vars.hasOwnProperty(i)) flow.vars[i].descope();
			}
		},
		getRelatedNode: function (flags, path) {
			var node = this,
				flow = node.flow,
				parentNode = flow.nodes[node.parentIdx],
				nextNode, flagCnt,
				i = 0,
				flag,
				s = '/';
			if (flags.length) {
				// remove and capture the next flag and split by pipe
				flag = flags.shift();
				// set flag to collection of options
				flag = (/^\[.+\]$/.test(flag)) ? flag.slice(1,-1).split('|') : [flag];
				// get flag count
				flagCnt = flag.length;
				// while no next index is resolved and when we run out of flag possibilities...
				while (nextNode == null && i < flagCnt) {
					// if this flag begins with an @ or is a bunch of periods...
					if (/^@|^\.+$/.test(flag[i])) {
						// if the first character is a pound, remove it...
						if (flag[i].charAt(0) === '@') flag[i] = flag[i].substr(1);
						// based on this flag...
						switch (flag[i]) {
							case 'child':
								nextNode = node.firstChildIdx;
							break;

							case 'next':
								nextNode = node.nextIdx;
							break;

							case 'oldest':
								if (parentNode) nextNode = parentNode.lastChildIdx;
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

							case 'program': // root of program
								nextNode = 1;
							break;

							case 'flow': // phantom node
								nextNode = 0;
							break;

							case 'youngest':
								if (parentNode) nextNode = parentNode.firstChildIdx;
							break;

							case 'self':
							case '.':
								nextNode = node.idx;
							break;
						}
					} else { // otherwise, when not a relative flag...
						// get index of child with this name - will be undefined if not present
						nextNode = node.childrenNames[flag[i]];
					}
					// increment i
					i++;
				}
				// target next node
				node = flow.nodes[nextNode];
				// return this node's method result, if it's valid
				return node ? node.getRelatedNode(flags, path) : !1;
			} else { // otherwise, when there are no flags to process...
				// if path is a valid string...
				if (path.length) {
					// if not an absolute id...
					if (path.charAt(0) !== s) {
						// prepend this node's prefix path
						path = node.pathPrefix + path;
					} else if (path.charAt(1) !== s) { // or, when a if not a super path...
						// prepend this node's root - use single slash when root is 1 or 0
						path = (node.rootIdx > 1 ? flow.nodes[node.rootIdx].path.slice(0,-1) : s) + path;
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

	window.Flow = window.Flow || function () {
		var flow = this,
			args = arguments,
			argLn = args.length,
			id = args[0],
			idOk = typeof id === 'string',
			i, noMap, tree;
		// if not called with a new operator...
		if (!(flow.hasOwnProperty && flow instanceof arguments.callee)) {
			// if no arguments...
			if (!argLn) {
				id = [];
				for (i in sys.flows) {
					if (sys.flows.hasOwnProperty(i)) id.push(i);
				}
				// return list of flow id's available
				return id;
			}
			// (otherwise) return the flow reference or false
			return (flow = sys.getFlow(id)) ? flow.getGSet() : !1;
		}
		// if no arguments...
		if (!argLn) throw new Error('Flow: missing tree');
		// if 3 args given...
		if (argLn > 2) {
			tree = args[1];
			noMap = args[2];
		} else if (argLn > 1) { // or, when 2 args given...
			if (!idOk) {
				id = 0;
				noMap = args[1];
			}
			tree = args[idOk ? 1 : 0];
		} else { // otherwise, when one arg given...
			// clear id
			id = 0;
			tree = args[0];
		}
		// if tree is not an object, throw error - invalid argument
		if (typeof tree !== 'object') throw new Error('Flow: invalid tree');
		// capture proxy of new Flow instance
		flow = (new sys.objects.Flow((id && !sys.flows.hasOwnProperty(id) && sys.isValidFlowId(id)) ? id : (sys.tick++).toString(20), tree)).getGSet();
		// return proxy or map (default), based on noMap flag
		return noMap ? flow : flow.map();
	};

})(this);