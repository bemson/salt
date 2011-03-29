var FlowTest = TestCase('FlowTest'),
	cleanUp = function (args) {
		var flows = Flow(), i = 0, j = flows.length;
		for (; i < j; i++) {
			Flow(flows[i]).destroy();
		}
		assertSame('no flows exist', 0, Flow().length);
	},
	objTypes = {
		b: 'boolean',
		n: 'number',
		s: 'string',
		f: 'function',
		o: 'object',
		u: 'undefined'
	};

FlowTest.prototype = {
	testPresence: function () {
		assertFunction('Gset is a function', GSet);
		assertFunction('Gset has static method getContext', GSet.getContext);
		assertFunction('Flow a function', Flow);
	},
	testNamespaceForms: function () {
		var ary,
			form1, form2, form3, form4,
			id = 'foo';
		cleanUp();
		ary = Flow();
		assertArray('Flow returns array', ary);
		assertSame('Flow returns empty array', 0, ary.length);
		assertFalse('Flow returns false when given a random string', Flow((Math.random() * 200000).toString(20)));
		assertFalse('Flow returns false when given a number', Flow(1234));
		assertFalse('Flow returns false when given an array', Flow(ary));
		form1 = new Flow({});
		assertFunction('form1 response is a function', form1);
		form2 = new Flow({});
		assertFunction('form2 response is a function', form2);
		form3 = new Flow(id, {}, 1);
		assertInstanceOf('form3 response is Gset instance', GSet, form3);
		assertFunction('form3 has id method',form3.id);
		assertSame('form3 has correct id', id, form3.id());
		form4 = new Flow(id, {}, true);
		assertInstanceOf('form4 response is Gset instance', GSet, form4);
		assertFunction('form4 has id method',form4.id);
		assertNotSame('form4 is not correct id', id, form4.id());
		ary = Flow();
		assertSame('Flow call returns 4 flows', 4, ary.length);
		assertTrue('form3 destroys itself', form3.destroy());
		assertFalse('form3 returns false for id method', form3.id());
		ary = Flow();
		assertSame('Flow call returns 3 flows', ary.length, 3);
		assertNoException('destroy all flows', cleanUp);
		ary = Flow();
		assertSame('Flow call returns empty array', 0, ary.length);
	},
	testConstructorExceptions: function () {
		var id = 'foo', num = 20;
		assertException('program is omitted', function () {
			var x = new Flow();
		});
		assertException('program is a string', function () {
			var x = new Flow(id);
		});
		assertException('program is a number', function () {
			var x = new Flow(num);
		});
		assertException('id given and program is a string', function () {
			var x = new Flow(id, id);
		});
		assertException('id given and program is a number', function () {
			var x = new Flow(id, num);
		});
		assertException('3 arguments, program is invalid', function () {
			var x = new Flow(id, id, id);
		});
	},
	testPoorProgram: function () {
		var flow;
		cleanUp();
		flow = new Flow({
			toString: {},
			'@foo': {},
			'[foo': {},
			'my/state': {},
			'my|state': {},
			_XYZ: 0,
			_in: 1,
			_out: 'echo',
			_over: [],
			_main: {}
		},1);
		assertInstanceOf('flow is a Gset', GSet, flow);
		assertFunction('flow has query method', flow.query);
		assertString('query returns string for 0 index', flow.query(0));
		assertFalse('"//my|state/" exists', flow.query('//my|state/'));
		assertFalse('"//my|state/" and "//toString/" exists', flow.query('//my|state/','//toString/'));
		assertFalse('program has children', flow.query(2));
		cleanUp();
	},
	testIdleInstance: function () {
		var id = 'idle',
			flow,
			i,charter,map,
			api = {
				args: 2,
				destroy: 2,
				go: 2,
				id: 0,
				lock: 0,
				map: 1,
				query: 2,
				status: 1,
				target: 2,
				type: 1,
				vars: 2,
				wait: 2
			},
			status,
			statProps = {
				internal: objTypes.b,
				loops: objTypes.n,
				depth: objTypes.n,
				paused: objTypes.b,
				pendable: objTypes.b,
				pending: objTypes.o,
				targets: objTypes.o,
				history: objTypes.o,
				location: objTypes.s,
				index: objTypes.n,
				phase: objTypes.s,
				state: objTypes.s
			},
			str = 'foo',
			value = 'bar',
			num = 5,
			args, argsAry = [str,value,num];

		cleanUp();
		flow = new Flow(id,{},1);
		assertSame('flow with id "' + id + '" created', id, Flow()[0]);
		assertInstanceOf('flow is a Gset',GSet,flow);
		assertFunction('flow has _gset method',flow._gset);
		charter = flow._gset();
		assertObject('_gset returned object',charter);
		for (i in api) {
			if (api.hasOwnProperty(i)) {
				assertSame('api for ' + i + ' matches charter', api[i], charter[i]);
				assertFunction(i + ' is a method',flow[i]);
			}
		}
		// args
		assertArray('args is an array',flow.args());
		assertSame('args is empty', 0, flow.args().length);
		assertUndefined('args returns undefined for out of bounds index',flow.args(num));
		assertTrue('args sets value at index',flow.args(num,value));
		assertSame('args length extended to index', num + 1, flow.args().length);
		flow.args(num,undefined);
		assertSame('args removed last index when set to undefined', num, flow.args().length);
		assertTrue('args accepts array of values',flow.args(argsAry));
		for (i = 0; i < argsAry.length; i++) {
			assertSame('args index ' + i + ' matches value in replacement array', argsAry[i], flow.args(i));
		}
		flow.args([]);
		assertSame('args cleared with empty array', 0, flow.args().length);
		// go
		assertFalse('go returns false',flow.go());
		assertTrue('go returns true with valid target',flow.go(0));
		// id
		assertString('id returns string',flow.id());
		assertFalse('id returns false with argument',flow.id('foo'));
		// lock
		assertFalse('lock returns false',flow.lock());
		assertFalse('lock returns false with argument',flow.lock(1));
		// map
		map = flow.map();
		assertFunction('map returns function',map);
		assertTrue('map returns true',map());
		// query
		assertFalse('query returns false',flow.query());
		assertString('query returns string with argument',flow.query(0));
		assertArray('query returns array with arguments',flow.query(0,1));
		assertFalse('query returns false with invalid args',flow.query(str));
		// target
		assertFalse('target returns false',flow.target());
		assertTrue('target returns true with argument',flow.target(0));
		// type
		assertSame('type returns "Flow"','Flow',flow.type());
		// vars
		assertArray('vars returns array',flow.vars());
		assertSame('vars is empty array',0,flow.vars().length);
		assertUndefined('vars returns undefined for new name',flow.vars(str));
		assertSame('vars returns an array of one',1,flow.vars().length);
		assertTrue('vars returns true when setting name',flow.vars(str,value));
		assertSame('vars returns an array of one',1, flow.vars().length);
		assertSame('vars name matches value',value,flow.vars(str));
		// wait
		assertFalse('wait returns false',flow.wait());
		assertFalse('wait returns false with args',flow.wait(num));
		// status
		status = flow.status();
		assertObject('status is an object',status);
		for (i in statProps) {
			if (statProps.hasOwnProperty(i)) {
				assertTrue(i + ' is inherited',!status.hasOwnProperty(i));
				assertTrue(i + ' is a ' + statProps[i], typeof status[i] === statProps[i]);
				if (statProps[i] === objTypes.o) {
					assertArray(i + ' is an array', status[i]);
					assertSame(i + ' is empty', 0, status[i].length);
				}
			}
		}
		// internal
		assertTrue('not internal',!status.internal);
		// state
		assertString('state is a string',status.state);
		assertSame('state is "_flow"', '_flow', status.state);
		// statue
		assertBoolean('pendable is a boolean', status.pendable);
		assertTrue('flow root is pendable', status.pendable);
		// destroy
		assertTrue('destroy returns true',flow.destroy());
		assertFalse('the flow was destroyed',Flow(id));
		assertSame('no flows exist', 0, Flow().length);
		for (i in api) {
			if (api.hasOwnProperty(i) && i !== 'destroy' && i !== 'type') {
				assertFalse(i + ' returns false when destroyed', flow[i]());
				if (api[i] !== 1) {
					assertFalse(i + ' returns false with arguments, when destroyed', flow[i](num));
				}
			}
		}
		assertTrue('destroy returns true when destroyed', flow.destroy());
		assertSame('type returns "Flow" when destroyed', 'Flow', flow.type());
		cleanUp();
	},
	testMap: function () {
		var map, flow,
			value = 'foo';

			cleanUp();
			map = new Flow({
				retVal: function () {
					return value;
				},
				decoy: {
					_main: function () {
						assertTrue('calls from program return false', map.decoy.target());
						return value;
					},
					target: function () {
						return undefined;
					}
				}
			}),
			flow = Flow(map);

		assertFunction('map is a function', map);
		assertFunction('map.retVal is a function', map.retVal);
		assertFunction('map.decoy is a function', map.decoy);
		assertFunction('map.decoy.target is a function', map.decoy.target);
		assertInstanceOf('flow is a Gset', GSet, flow);
		assertFunction('query is a method', flow.query);
		assertFunction('id is a method', flow.id);
		assertSame('map and flow point to the same instance', Flow(map).id(), Flow(flow).id());
		assertSame('map toString is state path', map.toString(), flow.query(map));
		assertSame('map.retVal toString matches state path', map.retVal.toString(), flow.query(map.retVal));
		assertSame('map.decoy toString matches state path', map.decoy.toString(), flow.query(map.decoy));
		assertSame('map.decoy.target toString matches state path', map.decoy.target.toString(), flow.query(map.decoy.target));
		assertTrue('map returns true for omitted _main', map());
		assertTrue('map returns true for _main returning undefined', map.decoy.target());
		assertSame('map returns value for _main returning value', value, map.retVal());
		assertNotSame('map.decoy does not return value', value, map.decoy());
		assertSame('map rerouted to map.decoy.target', flow.status().location, flow.query(map.decoy.target));
		cleanUp();
		assertFalse('map returns false', map());
		assertFalse('map.retVal returns false', map.retVal());
		assertFalse('map.decoy returns false', map.decoy());
		assertFalse('map.decoy.target returns false', map.decoy.target());
		cleanUp();
	},
	testRecursion: function () {
		var map,
			randCnt = 20,
			randName = 'rand',
			i,
			rand = function () {
				return Math.floor(Math.random() * (randCnt));
			},
			randComponent = function () {
				this.target('//' + randName + rand());
			},
			randProgram = {
				_main: randComponent
			};
		cleanUp();
		map = new Flow({
			_main: function () {
				map.next();
			},
			next: function () {
				map();
			}
		});
		assertException('caught looping', function () {
			map();
		});

		for (i = 0; i < randCnt; i++) {
			randProgram[randName + i] = randComponent;
		}
		map = new Flow(randProgram);
		assertException('caught too many cycles', function () {
			map();
		});
		cleanUp();
	},
	testComponents: function () {
		var flow,map,
			value = 0,
			adjust = function  () {
				this.vars('sum', this.vars('sum') + (this.status().phase === 'out' ? -1 : 1));
			};
		cleanUp();
		flow = new Flow({
			_in: function () {
				var status;
				assertInstanceOf('scope of component is Gset',GSet,this);
				assertFunction('status is a method',this.status);
				assertFunction('vars is a method',this.vars);
				status = this.status();
				assertTrue('flow has targets',!!status.targets.length);
				assertSame('location is the program root', '//', status.location);
				assertSame('state is "_root"','_root',status.state);
				assertSame('index is 1', 1, status.index);
				assertTrue('there is a target', status.targets.length > 0);
				assertSame('depth is 1', 1, status.depth);
				assertSame('phase is "in"', 'in', status.phase);
			},
			over: {
				_vars: 'sum',
				_root: 1,
				_main: function () {
					this.vars('sum',20);
				},
				setOne: {
					_over: function () {
						this.vars('sum',1);
					}
				},
				ten: function () {
					this.vars('sum',this.vars('sum') + 10);
				}
			},
			step: {
				_vars: [
					{delayer: new Flow({_main: function () {this.wait()}})},
					'sum'
				],
				_pendable: 1,
				_in: function () {
					assertFunction(this.vars('delayer'));
					assertTrue(this.target('one/two/three'));
					this.vars('sum',0);
				},
				_out: function () {
					assertTrue(Flow(this.vars('delayer')).destroy());
					assertFunction(this.vars('delayer'));
					assertFalse(this.vars('delayer')());
				},
				one: {
					_in: function () {
						this.vars('delayer')();
						this.vars('sum',1);
					},
					two: {
						_pendable: 0,
						_in: function () {
							this.vars('delayer')();
							this.vars('sum',2);
						},
						three: {
							_in: function () {
								this.vars('delayer')();
								this.vars('sum',3);
							}
						}
					}
				}
			},
			count: {
				_vars: {sum: 0},
				one: {
					_in: adjust,
					_out: adjust,
					two: {
						_in: adjust,
						_out: adjust,
						three: {
							_in: adjust,
							_out: adjust,
							four: {
								_in: adjust,
								_out: adjust,
								five: {
									_in: adjust,
									_out: adjust
								}
							}
						}
					}
				}
			}
		},1);
		assertInstanceOf('flow is a Gset', GSet, flow);
		map = flow.map();
		assertFunction('map is a function', map);
		assertSame('zero vars defined', 0, flow.vars().length);

		assertTrue('go to over.ten',map.over.ten());
		assertSame('at over.ten in flow', map.over.ten.toString(), flow.status().location);
		assertSame('sum is now 11', 11, flow.vars('sum'));
		assertTrue('go to root of over', flow.target('/'));
		assertSame('sum is now 20', 20, flow.vars('sum'));
		assertTrue('go to root of flow', flow.target('//'));
		assertUndefined('sum is undefined (again)', flow.vars('sum'));

		assertUndefined('"sum" var is undefined', flow.vars('sum'));
		assertTrue('count "five"', map.count.one.two.three.four.five());
		assertSame('at five in flow', map.count.one.two.three.four.five.toString(), flow.status().location);
		assertSame('sum is now five', 5, flow.vars('sum'));
		assertTrue('reset count', map.count());
		assertSame('at count in flow', map.count.toString(), flow.status().location);
		assertSame('sum is now original value', 0, value);
		assertTrue('go to root of count', flow.target('/'));
		assertUndefined('sum is undefined (again)', flow.vars('sum'));

		assertFalse('go to step, get rerouted and delayed', map.step());
		assertSame('sum is 1', 1, flow.vars('sum'));
		assertSame('target is now three', map.step.one.two.three.toString(), flow.status().targets[0]);
		assertTrue('flow is pending', flow.status().pending.length > 0);
		assertSame('currently pended at one', map.step.one.toString(), flow.status().location);
		assertTrue('resume pending flow', Flow(flow.status().pending[0]).go());
		assertSame('flow is at now three', map.step.one.two.three.toString(), flow.status().location);
		assertSame('sum is now 3',3,flow.vars('sum'));
		assertFalse('state is not pendable', flow.status().pendable);
		assertTrue('flow went to root',flow.go(1));
		assertSame('sum still exists', 1, flow.vars().length);
		assertUndefined('sum is undefined (again)', flow.vars('sum'));
		assertSame('one flow exists',1,Flow().length);
		cleanUp();
		flow = new Flow({
			a: {
				_restrict: 1,
				b: {
					_restrict: 0
				},
				c: {},
				d: function () {
					this.wait();
				}
			},
			d: {}
		}, 1);
		assertTrue('at root of restricted flow', flow.go(1));
		assertTrue('can go to d', flow.go('d'));
		assertTrue('in a',flow.go('/a'));
		assertFalse('can not go to d from a', flow.go('/d'));
		assertFalse('can not target d from a', flow.target('/d'));
		assertTrue('can go to a/c',flow.go('c'));
		assertFalse('can not go to d from c', flow.go('/d'));
		assertFalse('can not target d from c', flow.target('/d'));
		assertTrue('can go to a/b',flow.go('../b'));
		assertFalse('can not go to d from b', flow.go('/d'));
		assertFalse('can not target d from b', flow.target('/d'));
		assertTrue('can go to a/d',flow.go('../d'));
		assertTrue('paused at d', flow.status().paused);
		assertFalse('can not wait with reference to /d from d', flow.wait('/d',100));
		assertTrue('can exploit loophole and target /d with function', flow.wait(flow.map().d, 0));
		cleanUp();
	},
	testTokens: function () {
		var flow, map;
		cleanUp();
		flow = new Flow({
			begin: {},
			middle: {},
			end: {}
		},1);
		map = flow.map();
		assertString('0 works', flow.query(0));
		assertString('map.begin works', flow.query(map.begin));
		assertString('"." works', flow.query('.'));
		assertTrue('going to root',map());
		assertString('".." works', flow.query('..'));
		assertString('@self works', flow.query('@self'));
		assertString('@parent works', flow.query('@parent'));
		assertString('@child works', flow.query('@child'));
		assertString('@oldest works', flow.query('@oldest'));
		assertString('@youngest', flow.query('@youngest'));
		assertString('@root works', flow.query('@root'));
		assertString('@program works', flow.query('@program'));
		assertString('@flow works', flow.query('@flow'));
		assertTrue('going to middle child',map.middle());
		assertSame('@youngest works',map.begin.toString(),flow.query('@youngest'));
		assertSame('@youngest works',map.end.toString(),flow.query('@oldest'));
		assertString('simple [.] works',flow.query('[.]'));
		assertString('multi [@child|@parent] works',flow.query('[@child|@parent]'));
		assertSame('progressive tokens results in program root',map.toString(),flow.query('@flow/@program/@child/@oldest/@youngest/[@child|joey|root|..|@parent]/./../@child'));
		assertSame('combo token and path result in map.middle',map.middle.toString(), flow.query('@flow/[@parent|..|state|@oldest|.]/@root/@child/[end]/@youngest/../middle'));
		cleanUp();
	},
	testHistory: function () {
		var flow, map,
			checkStatus = function (status) {
				assertTrue('targets has a length', !!status.targets.length);
				for (var i = 0, j = status.history.length; i < j; i++) {
					assertNotSame(status.state + ' is not in history',status.location, status.history[i]);
				}
			};
		cleanUp();
		flow = new Flow({
			_main: function () {
				var stat = this.status();
				if (stat.history[0] === '..//') {
					assertSame('origin of traversal is flow root', '..//', stat.history[0]);
				} else {
					assertSame('origin of traversal is map.a.b.c', map.a.b.c.toString(), stat.history[0]);
					assertSame('length of history', 3, stat.history.length);
					assertSame('last state in history is map.a', map.a.toString(), stat.history[2]);
				}
			},
			a: {
				_in: function () {
					var stat = this.status();
					checkStatus(stat);
					assertSame('origin of traversal is program root', map.toString(), stat.history[0]);
				},
				_out: function () {
					var stat = this.status();
					checkStatus(stat);
					assertSame('length of history', 2, stat.history.length);
					assertSame('last state traversed is map.a.b', map.a.b.toString(), stat.history[1]);
					assertSame('target is program', map.toString(), stat.targets[0]);
				},
				b: {
					_in: function () {
						var stat = this.status();
						checkStatus(stat);
					},
					_main: function () {
						var stat = this.status();
						checkStatus(stat);
						assertSame('length of history', 2, stat.history.length);
					},
					_out: function () {
						var stat = this.status();
						checkStatus(stat);
						assertSame('length of history', 1, stat.history.length);
						assertSame('origin of traversal is map.a.b.c', map.a.b.c.toString(), stat.history[0]);
					},
					c: {
						_in: function () {
							var stat = this.status();
							checkStatus(stat);
							assertSame('origin of traversal is map.a.b', map.a.b.toString(), stat.history[0]);
						},
						_main: function () {
							var stat = this.status();
							checkStatus(stat);
							assertSame('length of history', 1, stat.history.length);
						}
					}
				}
			}
		},1);
		map = flow.map();
		map();
		assertFalse('context is external',flow.status().internal);
		assertSame('history is empty when context is external', 0, flow.status().history.length);
		map.a.b();
		map.a.b.c();
		map();
		cleanUp();
	},
	testPending: function () {
		var flow;
		cleanUp();
		flow = new Flow('a', {
			_main: function () {
				Flow('b').go(1);
				Flow('d').go(1);
			}
		},1);
		new Flow('b', {
			_main: function () {
				Flow('c').go(1);
				this.wait();
			}
		},1);
		new Flow('c', {
			_main: function () {
				this.wait();
			}
		},1);
		new Flow('d', {
			_main: function () {
				this.wait();
			}
		},1);
		flow.go(1);
		assertTrue('a is pendable', flow.status().pendable);
		assertFalse('a is paused',flow.status().paused);
		assertSame('a has three pending flows', 3, flow.status().pending.length);
		assertSame('the first pending flow is b', 'b', flow.status().pending[0]);
		assertSame('the second pending flow is c', 'c', flow.status().pending[1]);
		assertSame('the last pending flow is d', 'd', flow.status().pending[2]);
		assertTrue('b is paused', Flow('b').status().paused);
		assertTrue('c is paused', Flow('c').status().paused);
		assertTrue('d is paused', Flow('d').status().paused);
		assertSame('b is pending because of c', 'c', Flow('b').status().pending[0]);
		assertFalse('b can not be resumed when pending', Flow('b').go());
		assertFalse('b is paused', Flow('b').status().paused);
		assertSame('b is still pending because of c', 'c', Flow('b').status().pending[0]);
		assertTrue('b has targets', !!Flow('b').status().targets.length);
		assertSame('a has two pending flows', 2, flow.status().pending.length);
		assertSame('the first pending flow is c', 'c', flow.status().pending[0]);
		assertSame('the last pending flow is d', 'd', flow.status().pending[1]);
		assertTrue('c is resumed', Flow('c').go());
		assertTrue('c has no targets', !Flow('c').status().targets.length);
		assertTrue('b has no targets', !Flow('b').status().targets.length);
		assertSame('a has one pending flow', 1, flow.status().pending.length);
		assertSame('the only pending flow is d', 'd', flow.status().pending[0]);
		assertTrue('d is paused', Flow('d').status().paused);
		assertTrue('d is destroyed', Flow('d').destroy());
		assertFalse('d no longer exists', Flow('d'));
		assertTrue('a has no targets 1', !flow.status().targets.length);
		assertTrue('a is no longer pending 1', !flow.status().pending.length);
		assertTrue('a is destroyed',flow.destroy());
		flow = new Flow('a', {
			_main: function () {
				Flow('d').go(1);
			},
			nonpending: {
				_pendable: 0,
				_main: function () {
					Flow('b').go(1);
				}
			}
		},1);
		new Flow('d',{
			_main: function () {
				this.wait();
			}
		});
		flow.go(1);
		assertTrue('a is pendable', flow.status().pendable);
		assertTrue('a is pending', !!flow.status().pending.length);
		assertFalse('a is paused', flow.status().paused);
		assertTrue('d is paused', Flow('d').status().paused);
		assertTrue('d resumes', Flow('d').go());
		assertTrue('a has no targets 2', !flow.status().targets.length);
		assertSame('a is at the program root', '//', flow.status().location);
		assertTrue('a is at flow root', flow.go(0));
		assertFalse('a does not complete going to program root', flow.target(1));
		assertSame('a is at the program root', '//', flow.status().location);
		assertSame('a is pending one child', 1, flow.status().pending.length);
		assertSame('a has a target', 1, flow.status().targets.length);
		assertTrue('d is destroyed', Flow('d').destroy());
		assertFalse('d no longer exists', Flow('d'));
		assertSame('a is at the program root', '//', flow.status().location);
		assertSame('number of child flows for a', 0, flow.status().pending.length);
		assertTrue('a is at flow root', flow.go(0));
		assertSame('a is at the flow root', '..//', flow.status().location);
		assertString('can target "nonpending" from flow-root', flow.query('nonpending'));
		assertTrue('a can complete nonpending state', flow.target('nonpending'));
		assertFalse('a is not pendable from this state', flow.status().pendable);
		assertSame('a is not pending', 0, flow.status().pending.length);
		assertTrue('b is paused', Flow('b').status().paused);
		assertSame('b is pending because of c', 'c', Flow('b').status().pending[0]);
		assertTrue('c is destroyed', Flow('c').destroy());
		assertTrue('b is no longer pending', !Flow('b').status().pending.length);
		assertTrue('b is paused', Flow('b').status().paused);
		assertTrue('b is destroyed', Flow('b').destroy());
		assertSame('one flow is left',1,Flow().length);
		assertSame('the last flow is a','a', Flow()[0]);
		cleanUp();
	},
	testTargeting: function () {
		var finalValue = 'foo', map;
		cleanUp();
		map = new Flow({
			_in: function () {
				assertSame('target is self', this.status().location, this.status().targets[0]);
				assertString('can target f', this.query('f'));
				assertTrue('changed target to f', this.target('f'));
				assertSame('target is now f', map.f.toString(), this.status().targets[0]);
			},
			a: {
				_over: function () {
					assertString('can target waypoint b', this.query('../b'));
					assertTrue('prepending waypoint b', this.go('../b'));
					assertSame('two targets', 2, this.status().targets.length);
					assertSame('next target/waypoint is b',this.query('../b'),this.status().targets[0]);
					assertSame('destination is f',this.query('../f'),this.status().targets[1]);
					assertTrue('prepending waypoint b again', this.go('../b'));
					assertSame('still two targets', 2, this.status().targets.length);
					assertSame('next target/waypoint is b',this.query('../b'),this.status().targets[0]);
					assertSame('destination is f',this.query('../f'),this.status().targets[1]);
				}
			},
			b: {
				_in: function () {
					assertSame('b is a target',this.status().location, this.status().targets[0]);
					assertTrue('c is new target', this.target('../c'));
					assertSame('one target', 1, this.status().targets.length);
				},
				_out: function () {
					assertNotSame('b is not a target',this.status().location, this.status().targets[0]);
					assertSame('c is not a target',this.query('../c'), this.status().targets[0]);
					assertTrue('prepend d',this.go('../c/d'));
					assertSame('two targets', 2, this.status().targets.length);
					assertSame('next target/waypoint is d',this.query('../c/d'),this.status().targets[0]);
				}
			},
			c: {
				_in: function () {
					assertNotSame('c is not the current target',this.status().location, this.status().targets[0]);
					assertSame('d is the current target',this.query('d'), this.status().targets[0]);
					assertSame('the destination is c', this.status().location, this.status().targets[1]);
					assertTrue('adding waypoint e before d',this.go('e'));
					assertSame('there are three targets',3,this.status().targets.length);
					assertSame('e is the current target',this.query('e'), this.status().targets[0]);
				},
				_main: function () {
					assertSame('there is one target', 1, this.status().targets.length);
					assertSame('c is the destination',this.status().location, this.status().targets[0]);
					assertTrue('appending final to current target', this.go('../final'));
					assertSame('there are two targets', 2, this.status().targets.length);
					assertSame('c is the current target/waypoint',this.status().location, this.status().targets[0]);
					assertSame('final is the destination',this.query('../final'), this.status().targets[1]);
				},
				d: {},
				e: {},
				_out: function () {
					var status = this.status();
					assertSame('final is the destination', this.query('../final'), this.status().targets[0]);
				}
			},
			f: {},
			final: function () {
				//console.log('history',this.status().history);
				return finalValue;
			}
		});
		assertSame('targeting program root returns other result', finalValue, map());
		cleanUp();
	},
	testArguments: function () {
		var flow, map, argsSent = 0, args = ['foo',1,[]], change = [0,'bar'];
		cleanUp();
		flow = new Flow({
			_main: function () {
				var i = 0, j = args.length;
				if (argsSent) {
					for (; i < j; i++) {
						assertSame('argument ' + i + ' is valid', args[i], arguments[i]);
					}
				}
			},
			change: {
				_over: function () {
					assertTrue('Flow argument augmented', flow.args(change[0],change[1]));
					this.wait();
				}
			},
			args: function (one,two,three) {
				assertSame('arg "one" is valid',change[1],one);
				assertSame('arg "two" is valid',args[1],two);
				assertSame('arg "three" is valid',args[2],three);
			}
		},1);
		map = flow.map();
		map();
		assertSame('arguments are empty',0,flow.args().length);
		argsSent = 1;
		flow.args(args);
		assertSame('arguments are full', args.length, flow.args().length);
		flow.go(1);
		assertSame('arguments are empty',0,flow.args().length);
		assertFalse('flow reached args state',map.args.apply({},args));
		assertTrue('flow is paused', flow.status().paused);
		assertSame('argument ' + change[0] + ' has changed',change[1],flow.args(change[0]));
		assertTrue('flow resumed',flow.go());
		assertSame('flow is at destination',map.args.toString(),flow.status().location);
	},
	testLoops: function () {
		var map, targetHits = 0;
		cleanUp();
		map = new Flow({
			_main: function () {
				assertSame('initial loops',0, this.status().loops);
			},
			pre: {},
			target: {
				_in: function () {
					targetHits++;
					if (this.status().loops < 2) {
						assertTrue('target hit less than three times', targetHits < 3);
						assertSame('can prepend pre',map.pre.toString(),this.query('../pre'));
						assertTrue('going to pre',this.go('../pre'));
						assertSame('waypoint is pre',map.pre.toString(),this.status().targets[0]);
						assertSame('destination is still target',this.status().location, this.status().targets[1]);
					} else {
						assertFalse('target hit less than twice', targetHits < 2);
						assertSame('targetTrack value',3,targetHits);
					}
				},
				_main: function () {
					assertSame('targetTrack value',3,targetHits);
					assertSame('looped on target twice',2,this.status().loops);
				}
			}
		});
		map();
		map.target();
		assertSame('loops is 0 when idle',0, Flow(map).status().loops);
		cleanUp();
	}
};
