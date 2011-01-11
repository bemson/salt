ProxyTest = TestCase('ProxyTest');

ProxyTest.prototype = {
	testPresence: function () {
		assertNotNull('Proxy is available', Proxy);
	},
	testExceptions: function () {
		assertException('No new', function () {
			var x = Proxy();
		});
		assertException('No source', function () {
			var x = new Proxy();
		});
		assertException('Null source', function () {
			var x = new Proxy(null);
		});
		assertException('Undefined source', function () {
			var x = new Proxy(undefined);
		});
	},
	testImpliedMaps: function () {
		var src = {c:5},
			pxy = new Proxy(src,{
				a: 123,
				b: [[1,2,3]],
				c: [],
				d: [] // fail?
			}),
			chrt = pxy._gset();
		assertTrue('implied charter', chrt.a === 1 && chrt.b === 1 && chrt.c === 0 && chrt.d === 0);
		assertSame('static number',123,pxy.a());
		assertArray('static array',pxy.b());
		assertNotNull('full gets',pxy.c());
		assertTrue('full sets',pxy.c(10));
		assertSame('full gets',10, pxy.c());
		assertFalse('full is fake',src.hasOwnProperty('d'));
		assertTrue('fake full sets',pxy.d(10));
		assertSame('fake full gets',10, pxy.d());
		src.d = 20;
		assertSame('fake connected to src', 20, pxy.d());
	},
	testSchemeFunctions: function () {
		var src = {a:1},
			commonTests = function (value, key, phase, proxy) {
				assertSame('scope is source', this, src);
				assertSame('arguments count', 4, arguments.length);
				assertString('key is string', key);
				assertString('phase is string', phase);
				assertSame('phase is lowercased', phase.toLowerCase(), phase);
				assertInstanceOf('proxy is instance', Proxy, proxy);
			},
			pxy = new Proxy(src, {
				a: [
					function g(value, key, phase, proxy) {
						commonTests.apply(this, arguments);
						assertSame('correct phase', 'g', phase);
						assertSame('key is a', 'a', key);
						return this.a;
					},
					function v(value, key, phase, proxy) {
						commonTests.apply(this, arguments);
						assertSame('correct phase', 'v', phase);
						assertSame('key is a', 'a', key);
						return 1;
					},
					function s(value, key, phase, proxy) {
						commonTests.apply(this, arguments);
						assertSame('correct phase', 's', phase);
						assertSame('key is a', 'a', key);
						this.a = value;
						return 1;
					}
				],
				b: function () {
					assertSame('scope is source', this, src);
					assertNotSame('no custom arguments', 4, arguments.length);
					return 4;
				},
				c: [
					1,
					function v(value, key, phase, proxy) {
						commonTests.apply(this, arguments);
						assertSame('correct phase', 'v', phase);
						assertSame('key is c', 'c', key);
						return 0;
					}
				],
				d: [
					1,
					function v(value, key, phase, proxy) {
						commonTests.apply(this, arguments);
						assertSame('key is d', 'd', key);
						assertSame('correct phase', 'v', phase);
						return;
					}
				],
				e: [
					1,
					function v(value, key, phase, proxy) {
						commonTests.apply(this, arguments);
						assertSame('key is e', 'e', key);
						assertSame('correct phase', 'v', phase);
					}
				],
				f: [
					function () {},
					function () {},
					function () {}
				]
			}),
			chrt = pxy._gset();

			assertTrue('charter check',chrt.a === 0 && chrt.b === 2 && chrt.c === 0 && chrt.d === 0 && chrt.e === 0 && chrt.f === 0);
			assertNoException('no error on custom get',function () {
				assertSame('custom get works', 1, pxy.a());
			});
			assertNoException('no error on custom set',function () {
				assertTrue('custom set returns true', pxy.a(10));
			});
			assertSame('setter worked',10, src.a);
			assertSame('non-gset works', 4, pxy.b());
			assertFalse('false vet fails setting', pxy.c(2));
			assertFalse('vet fnc returning undefined vet fails setting', pxy.d(2));
			assertTrue('bad vet fnc is ignored', pxy.e(2));
			assertNoException('bad get-fnc ignored', function () {
				pxy.f();
			});
			assertNoException('bad vet-fnc ignored', function () {
				pxy.f(1);
			});
			assertTrue('bad set-fnc ignored', pxy.f(10));
	},
/*
	testNullAndPass: function () {
		var src = {any:5},
			nullValues = [0,null,false,'']
	},
	/*
	testGoodInits: function () {
		var src = {},
			charter = {
				getA: 1,
				setA: -1,
				array: 1,
				custom: 2
			},
		
	},
	testSetterVariations: function () {
		var src = {any:5, set:10},
			p = 'any',
			q = 'set',
			gvs = {
				get0: [p, 0, 0],
				get1: [p, 0, false],
				get2: [p, 0, null],
				get3: [p, 0, ''],
				get4: [p, false, false],
				get5: [p, false, 0],
				get6: [p, false, null],
				get7: [p, false, ''],
				get8: [p, null, null],
				get9: [p, null, false],
				get10: [p, null, 0],
				get11: [p, null, ''],
				get12: [p, '', ''],
				get13: [p, '', 0],
				get14: [p, '', false],
				get15: [p, '', null],
				get16: [function () {return this[p]}, 0, 0],
				get17: [function () {return this[p]}, 0, 0],
				get18: [function () {return this[p]}, 0, 0],
				set0 [0, 0, q],
				set1: [false, 0, q],
				set2: [null, 0, q],
				set3: [false, false, q],
				set4: [false, 0, q],
				set5: [false, null, q],
				set6: [null, null, q],
				set7: [null, false, q],
				set8: [null, 0, q],
				set9: [0, 0, function (v) {return this[q] = v;}],
			},
			loops = 10, i, loopName, loopFnc, loopVal = 8,
			pxy = new Proxy(src,gvs),
			fnc = function (fnc, args, scope) {
				return function () {
					fnc.apply(scope || {}, args || []);
				}
			}

		

		assertInstanceOf('Is instance', Proxy, pxy);
		assertFunction('_gset is a function', pxy._gset);

		for (i = 0; i < loops; i++) {
			loopName = 'get' + i;
			loopFnc = pxy[loopName];
			assertFunction(loopName + ' is a function', loopFnc);
			assertSame(loopName + ' gets', src[p], loopFnc());
			assertSame(loopName + ' gets via _gset', src[p], pxy._gset(loopName));
			assertException(loopName + ' does not set', fnc(loopFnc,[1]));
			assertException(loopName + ' does not set via _gset', fnc(pxy._gset,[loopName, 1]));
			loopName = 'set' + i;
			loopFnc = pxy[loopName];
			assertFunction(loopName + ' is a function', loopFnc);
			assertNoException(loopName + ' sets', fnc(loopFnc,[loopVal]));
			assertSame(loopName + ' set prop', loopVal, src[q]);
			src[q] = 10; // reset setter value
			assertNoException(loopName + ' sets', fnc(pxy._gset,[loopName,loopVal]));
			assertSame(loopName + ' set prop via _gset', loopVal, src[q]);
			src[q] = 10; // reset setter value
			assertException(loopName + ' does not get', loopFnc);
			assertException(loopName + ' does not get via _gset', fnc(pxy._gset,[loopName]));
			src[q] = 10; // reset setter value
		}
	}
	*/
};