(function () {
	var sys = {
			// signature object
			fkey: {},
			// starting number for ids
			date: new Date() * 1,
			rxp: {
				flow: /^(\w+)@(\d+)$/,
				node: /^\w+@(\d+)$/
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
					req: 'req',
					end: 'env'
				},
				prefix: '_'
			},
			resolveFlow: function (fref) {
				// init vars
				var flow, // stub for flow instance or string parts
					cnst = sys.objects.Flow; // shortcut Flow object constructor
				// if a possible instance...
				if (fref.hasOwnProperty) {
					// if an Flow instance,  return as is
					if (fref instanceof cnst) return fref;
					// if a Proxy instance, return corresponding Flow instance
					if (fref instanceof Proxy && fref._gset().type === 1 && fref.type() === 'Flow' && (flow = fref._gset(sys.fkey)) instanceof cnst) return flow;
				}
				// (otherwise) get parts of fref string
				flow = fref.toString ? fref.toString().match(sys.rxp.flow) : 0;
				// return flow instance or 0, based on whether the flow index exists
				return (flow && sys.flows.hasOwnProperty(flow[1])) ? sys.flows[flow[1]] : 0;
			},
			resolveNode: function (fid) {
				// init vars
				var fparts = fid.toString ? fid.toString().match(sys.rxp.flow) : 0, // get parts of flow reference
					flow = fparts && sys.flows[fparts[1]]; // target flow (if any)
				// return flow instance or 0, based on whether the flow index exists
				return (flow && fparts[2] < flow.nodes.length) ? flow.nodes[fparts[2]] : 0;
			}
		};
		window.sys = sys;
		// define template for public flow instance
		sys.proxies.FlowPublic = new Proxy(
			0,
			{
				define: function () {
					return Flow.define.apply(Flow,arguments);
				}
			}
		);
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
				env: function (key, val) {
					// init vars
					var flow = this, // alias flow
						env = flow.env, // alias env
						isSet = args.length > 1,
						args = arguments; // alias arguments
					// if no arguments, return current environment
					if (!args.length) return flow.env;
					if (isSet) {
						if (typeof key === 'string') {
							env[key] = val;
							return !0;
						}
					} else if (env.hasOwnProperty(key)) {
						return env[key];
					}
					return !1;
				},
				// flag when this flow is paused
				paused: [
					function () {
						// flag when paused
						return !!this.delay;
					}
				],
				// stop this flow (indefinitely)
				pause: function () {
					return this.wait();
				},
				// pause flow for a given period of time with a given callback - scoped (again) to this flow
				wait: function (time, fnc) {
					var flow = this;
					return (!arguments.length || (Math.ceil(time) === time && (!fnc || sys.isFnc(fnc)))) ? flow.wait.apply(flow,arguments) : !1;
				},
				// resume this flow towards it's current target
				resume: function () {
					return this.next();
				},
				// target next sibling
				next: function () {
					var flow = this,
						node = flow.nodes[flow.currentIdx].nextIdx;
					return !!node && flow.next(node);
				},
				// target previous sibling
				previous: function () {
					var flow = this,
						node = flow.nodes[flow.currentIdx].previousIdx;
					return !!node && flow.next(node);
				},
				// target child node
				down: function () {
					var flow = this,
						node = flow.nodes[flow.currentIdx].childIdx;
					return !!node && flow.next(node);
				},
				// target parent node
				up: function () {
					var flow = this,
						node = flow.nodes[flow.currentIdx].parentIdx;
					return !!node && flow.next(node);
				},
				// get phase string
				phase: [
					'phase'
				],
				// return function list
				getMap: function () {
					return this.getMap();
				},
				// exit this flow
				exit: function () {
					var flow = this;
					return flow.next(flow.nodes[0]);
				}
			}
		);

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
			// environmental variables
			flow.env = {};
			flow.id = (sys.date++).toString(20);
			sys.flows[flow.id] = flow;
			flow.nodes = [{fncs:{}, childIdx:1, idx:0, children:[], name: 'super'}]; // start with faux node pointing to first child of real tree
			new sys.objects.Node(flow, flow.nodes[0], nodes); // create node tree
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
					node = flow.nodes[flow.currentIdx]; // node to test and/or execute
				// if a node is given...
				if (tgtNode) {
					// set new target index
					flow.targetIdx = tgtNode.idx;
					// capture or reset arguments
					flow.arguments = (args) ? [].slice.call(typeof args !== 'object' ? [args] : args) : [];
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
							// if next is lte the target...
							if (node.nextIdx <= flow.targetIdx) {
								// set next currentIdx
								flow.currentIdx = node.nextIdx;
								// set phase to "over" or "out" based on context
								flow.phase = sys.meta.fncs[node.inContext ? 'out' : 'over'];
								// flag that we're out of context (or will be)
								node.inContext = 0;
							} else { // otherwise, when next doesn't exist or is greater than the target...
								// set next currentIdx
								flow.currentIdx = node.childIdx;
								// if not in context...
								if (!node.inContext) {
									// set phase to in
									flow.phase = sys.meta.fncs.in;
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
								flow.phase = sys.meta.fncs.out;
							}
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
					if (flow.phase) {
						console.log('executing "',flow.phase,'" function of  "',node.name,'"');
					} else {
						console.log('processing the "',node.name,'" node');
					}
					// flag that we're not active
					flow.active = 1;
					// if there is a function for the phase, execute - use arguments for main phase only
					if (flow.phase && node.fncs.hasOwnProperty(flow.phase)) flow.execute(node.fncs[flow.phase], flow.phase !== sys.meta.fncs.main ? [] : flow.arguments);
					// flag that we're no longer active
					flow.active = 0;
				}
				// if not active or delayed, and target not met and not paused, return result of recursive call
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
					//if (args) flow.arguments = [].slice.call(typeof args !== 'object' ? [args] : args);
					// execute function - use some sort of scope
					fnc.apply(new Proxy(flow, sys.proxies.Flow, sys.fkey), args || []);
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
				flow.delay = time ? window.setTimeout(fnc ? function () {flow.execute(fnc)} : function () {
					console.log('auto-resuming after delay!!');
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
								return flow.next(node,arguments)
							};
						fnc.toString = function () {
							return node.id;
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
			}
		}

		sys.objects.Node = function (flow, parent, def, name) {
			var node = this,
				i,meta;

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
			node.name = name || 'root';
			node.id = flow.id + '@' + node.idx;

			if (sys.isFnc(def)) {
				node.fncs[sys.meta.fncs.main] = def;
			} else {
				for (i in def) {
					if (def.hasOwnProperty(i)) {
						if (i.charAt(0) === sys.meta.prefix) {
							meta = i.substring(1);1
							if (sys.meta.fncs[meta] === meta && sys.isFnc(def[i])) {
								node.fncs[meta] = def[i];
							} else {
								// throw error - illegal prefix / unknown meta?
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

		window.Flow = function (map) {
			var that = this;
			if (that.hasOwnProperty && !(that instanceof arguments.callee)) {
				// throw error - must call with new operator
			}
			if (typeof map !== 'object') {
				// throw error - map is invalid
			}
			return (new sys.objects.Flow(map)).getMap();
		};
		// return public proxy of a flow instance
		Flow.getController = function (fref) {
			var flow = sys.resolveFlow(fref);
			return !!flow && new Proxy(flow, sys.proxies.Flow, sys.fkey);
		};
})();
