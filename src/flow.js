if (!window.Flow) {
	function Flow() {
		var di = {
				oldFlow: this,
				args: [].slice.call(arguments),
				bs: Flow.bootstrap
			},
			sys = {
				rxp: {
					flow: /(\d+)@(\d+)/
				},
				emptyFnc: function () {},
				isFnc: function (v) {
					return typeof v === 'function'
				},
				flow: 0, // the active flow
				flows: [],
				objects: {},
				meta: {
					fncs: {
						main: 'main',
						in: 'in',
						out: 'out',
						over: 'over'
					},
					keys: {
						req: 'req',
						end: 'env'
					},
					prefix: '_'
				},
				FlowSugar: function (args,obj,inst) {
					return Flow[(inst || obj instanceof args.callee) ? 'define' : 'next'].apply(Flow, args);
				},
				resolveFlow: function (fid) {
					// init vars
					var fparts = fid.toString ? fid.toString().match(sys.rxp.flow) : 0; // get parts of flow reference
					// return flow instance or 0, based on whether the flow index exists
					return (fparts && sys.flows.length < fparts[1]) ? sys.flows[fparts[1]] : 0;
				}
			};

		sys.objects.Flow = function (nodes) {
			var flow = this;
			flow.currentIdx = flow.targetIdx = 0;
			// flags when the target's _main function has been called
			flow.targetMet;
			// flags when this flow is actively executing functions
			flow.active = 0;
			// holds pointer for timeouts
			flow.delay;
			flow.arguments = [];
			flow.id = sys.flows.push(flow) - 1;
			flow.nodes = [{fncs:{}, childIdx:1, idx:0, children:[], name: 'super'}]; // start with faux node pointing to first child of real tree
			flow.pointer;
			new sys.objects.Node(flow, flow.nodes[0], nodes); // create nodes
			// build proxy
			/*
				build proxy with Proxy so it can cloned/sanitized between executions?
			*/
			flow.proxy = {
				arguments: function (idx, val) {
					// init vars
					var args = arguments, // alias argumenst
						fargs = flow.arguments; // alias flow arguments
					// if no arguments, return clone of arguments array
					if (args.length) return fargs.concat([]);
					// if idx is a number...
					if (!isNaN(idx)) {
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
				wait: function (time, fnc) {
					// return wait attempt
					return flow.wait(time, fnc);
				},
				next: function () {
					// return result of calling next within this scope
					return flow.next();
				}
			};
		};
		sys.objects.Flow.prototype = {
			/*
			called outside of Flow to start one
			called inside of Flow to continue one?
			called outside of Flow to continue one
			when called causes the flow to execute a path
			*/
			next: function (tgtNode, args) {
				var flow = this, // alias self
					node = flow.nodes[flow.currentIdx], // node to test and/or execute
					phase; // the function to execute
				// if a node is given, set new target index
				if (tgtNode) flow.targetIdx = tgtNode.idx;
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
							// if next is lte the target...
							if (node.nextIdx <= flow.targetIdx) {
								// set next currentIdx
								flow.currentIdx = node.nextIdx;
								// set phase to "over" or "out" based on context
								phase = sys.meta.fncs[node.inContext ? 'out' : 'over'];
								// flag that we're out of context (or will be)
								node.inContext = 0;
							} else { // otherwise, when next doesn't exist or is greater than the target...
								// set next currentIdx
								flow.currentIdx = node.childIdx;
								// if not in context...
								if (!node.inContext) {
									// set phase to in
									phase = sys.meta.fncs.in;
								}
								// flag that we're in context of this node
								node.inContext = 1;
							}
						} else { // or, when moving backwards...
							// set next currentIdx, based on parent
							flow.currentIdx = node.parentIdx >= flow.targetIdx ? node.parentIdx : node.previousIdx;
							// if in context...
							if (node.inContext) {
								// set phase to "out"
								phase = sys.meta.fncs.out;
							}
							// flag that we're out of context (or will be)
							node.inContext = 0;
						}
					} else { // otherwise, when we're on the target node...
						// set phase to "in" or "main", based on whether we're in context
						phase = sys.meta.fncs[node.inContext ? 'main' : 'in'];
						// set targetMet if we're already in context
						flow.targetMet = node.inContext;
						// flag that we're now in context of this node
						node.inContext = 1;
					}
					// flag that we're not active
					flow.active = 1;
					if (phase) {
						console.log('executing "',phase,'" function in  "',node.name,'"');
					} else {
						console.log('passing thru the "',node.name,'" node');
					}
					// if there is a phase...
					if (phase) {
						// execute the function with new or given arguments
						flow.execute(node.fncs[phase], tgtNode ? args : flow.arguments);
					}
					// flag that we're not active
					flow.active = 0;
				}
				// if not active, delayed, and target not met and not paused, return result of recursive call
				if (!flow.active && !flow.delay && !flow.targetMet) return flow.next();
				// return whether we've reached the target or not
				return !!flow.targetMet;
			},
			execute: function (fnc, args) {
				// init vars
				var flow = this; // alias self
				// if fnc given...
				if (fnc) {
					// if arguments given, set as new arguments
					if (args) flow.arguments = [].slice.call(typeof args !== 'object' ? [args] : args);
					// execute function - use some sort of scope
					fnc.apply(flow.proxy, flow.arguments);
				}
			},
			wait: function (time, fnc) {
				// init vars
				var flow = this; // alias self
				// clear wait
				flow.clearWait();
				// resolve time as an integer
				time = parseInt(time);
				// set delay to any truthy value or a timeout, based on time
				flow.delay = time ? window.setTimeout(fnc ? function () {flow.execute(fnc)} : function () {flow.next()}, time) : 1;
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
			getPointer: function () {
				// init vars
				var flow = this,
					_addPtr = function (node, ptr) {
						// init vars
						var fnc = function () {
								return flow.next(node,arguments)
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
						return ptr
					};
				// return pointer from second (starting) node
				return _addPtr(flow.nodes[1]);
			},
			end: function () {
				// go to node 0 to exit the user flow
				flow.next(flow.nodes[0]);
			}
		}

		sys.objects.Node = function (flow, parent, def, name) {
			var node = this,
				i,meta;

			node.idx = flow.nodes.push(node) - 1;
			node.parentIdx = parent.idx;
			node.localChildIdx = parent.children.push(node) - 1;
			if (node.localChildIdx) {
				node.previousIdx = parent.children[node.localChildIdx - 1].idx;
				parent.children[node.localChildIdx - 1].nextIdx = node.idx;
			}

			node.children = [];
			node.fncs = {};
			node.name = name || 'root';
			node.id = flow.id + '@' + node.idx;

			node.pointer = function () {
				flow.next(node);
			};
			node.pointer.toString = function (f) {
				return node.id;
			};

			if (flow.pointer) {
				parent.pointer[name] = node.pointer;
			} else {
				flow.pointer = node.pointer
			}

			if (sys.isFnc(def)) {
				node.fncs[sys.meta.target] = def;
			} else {
				for (i in def) {
					if (def.hasOwnProperty(i)) {
						if (i.charAt(0) === sys.meta.prefix) {
							meta = i.substring(1);
							if (sys.meta.fncs[meta] === meta && sys.isFnc(def[i])) {
								node.fncs[meta] = def[i];
							} else {
								// throw error - illegal prefix / unknown meta
							}
						} else {
							// create child nodes
							new sys.objects.Node(flow, node, def[i], i);
							// if the first child's index has not been captured, capture
							if (!node.childIdx) node.childIdx = node.idx + 1;
						}
					}
				}
			}
		};

		Flow = function () {
			return sys.FlowSugar(arguments,this);
		};
		Flow.define = function (tree) {
			return (new sys.objects.Flow(tree)).getPointer();
		};
		Flow.wait = function (fid, time, fnc) {
			// init vars
			var flow = sys.resolveFlow(fid); // resolve the flow from the fid argument
			// return result of delaying this flow
			return (flow && flow.delay) ? flow.wait(time, fnc) : !1;
		};
		// same as calling next() on the target flow
		Flow.resume = function (fid) {
			// init vars
			var flow = sys.resolveFlow(fid); // resolve the flow from the fid argument
			// return result of resuming the flow
			return flow ? flow.next() : !1;
		};
		Flow.exit = function (fid) {
			// init vars
			var flow = sys.resolveFlow(fid); // resolve the flow from the fid argument
			// return result of exiting the target flow
			return flow ? flow.exit() : !1;
		};

		Flow.bootstrap = di.bs || {};
		if (Flow.bootstrap.exposeSys) {
			Flow._private = sys;
		}
		Flow.initialized = !0;

		di.inst = di.oldFlow instanceof arguments.callee;
		if (!di.inst && Flow.hasOwnProperty(di.args[1]) && sys.isFnc(di.args[0].callee)) {
			di.method = di.args[1];
		}
		if (di.method) {
			return Flow[di.method].apply(Flow, di.args[0]);
		} else {
			return sys.FlowSugar(arguments, di.oldFlow, di.inst);
		}
	}
	// bootstrap options for Flow
	Flow.bootstrap = {
		exposeSys: !1 // expose the sys variable
	};
	['define','next','wait','getPointer'].forEach(
		function (method) {
			Flow[method] = function () {return Flow(arguments,method)};
		}
	);
	Flow.initialized = !1;
}
