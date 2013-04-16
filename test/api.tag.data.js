describe( '_data tag', function () {

  var flow;

  it( 'should set members to `.data` when entering a tagged state', function () {
    flow = new Flow({
      _data: ['foo']
    });
    flow.data.should.not.haveOwnProperty('foo');
    flow.go(1);
    flow.data.should.haveOwnProperty('foo');
  });

  it( 'should restore the previous member value when exiting a tagged state', function () {
    var
      val1 = {},
      val2 = {}
    ;
    flow = new Flow({
      _data: {foo: val1},
      a: {
        _data: 'foo'
      }
    });

    flow.go(1);
    flow.data.foo.should.equal(val1);

    flow.go('//a/');
    flow.data.foo.should.equal(val1);
    flow.data.foo = val2;

    flow.go(1);
    flow.data.foo.should.equal(val1);
  });

  it( 'should use (arrays of) strings as member names', function () {
    flow = new Flow({
      a: {
        _data: 'foo'
      },
      b: {
        _data: ['bar', 'zee']
      }
    });
    flow.data.should.not.haveOwnProperty('foo');
    flow.data.should.not.haveOwnProperty('bar');
    flow.data.should.not.haveOwnProperty('zee');
    flow.go('//a');
    flow.data.should.haveOwnProperty('foo');
    flow.data.should.not.haveOwnProperty('bar');
    flow.data.should.not.haveOwnProperty('zee');
    flow.go('//b');
    flow.data.should.haveOwnProperty('bar');
    flow.data.should.haveOwnProperty('zee');
  });

  it( 'should use object keys as member names', function () {
    flow = new Flow({
      a: {
        _data: {foo: 1}
      },
      b: {
        _data: {bar: 1, zee: 1}
      }
    });
    flow.data.should.not.haveOwnProperty('foo');
    flow.data.should.not.haveOwnProperty('bar');
    flow.data.should.not.haveOwnProperty('zee');
    flow.go('//a');
    flow.data.should.haveOwnProperty('foo');
    flow.data.should.not.haveOwnProperty('bar');
    flow.data.should.not.haveOwnProperty('zee');
    flow.go('//b');
    flow.data.should.haveOwnProperty('bar');
    flow.data.should.haveOwnProperty('zee');
  });

  it( 'should use strings and object-keys, in an array, as member names', function () {
    flow = new Flow({
      a: {
        _data: ['foo']
      },
      b: {
        _data: ['bar', {zee: 1}]
      }
    });
    flow.data.should.not.haveOwnProperty('foo');
    flow.data.should.not.haveOwnProperty('bar');
    flow.data.should.not.haveOwnProperty('zee');
    flow.go('//a');
    flow.data.should.haveOwnProperty('foo');
    flow.data.should.not.haveOwnProperty('bar');
    flow.data.should.not.haveOwnProperty('zee');
    flow.go('//b');
    flow.data.should.haveOwnProperty('bar');
    flow.data.should.haveOwnProperty('zee');
  });

  it( 'should use the previous value or `undefined` for strings', function () {
    var num = 10;
    flow = new Flow({
      _data: {foo: num},
      a: {
        _data: ['foo', 'bar']
      }
    });
    flow.go('//');
    flow.data.foo.should.equal(num);

    flow.go('//a/');
    flow.data.foo.should.equal(num);
    expect(flow.data.bar).to.equal(undefined);
  });

  it( 'should use the paired value for object-keys', function () {
    var val = {};
    flow = new Flow({
      _data: {foo: val}
    });
    flow.data.should.not.haveOwnProperty('foo');
    flow.go('//');
    flow.data.should.haveOwnProperty('foo');
    flow.data.foo.should.equal(val);
  });


});