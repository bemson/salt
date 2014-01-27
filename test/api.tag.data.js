describe( '_data tag', function () {

  var salt;

  it( 'should set members to `.data` when entering a tagged state', function () {
    salt = new Salt({
      _data: ['foo']
    });
    salt.data.should.not.haveOwnProperty('foo');
    salt.go(1);
    salt.data.should.haveOwnProperty('foo');
  });

  it( 'should restore the previous member value when exiting a tagged state', function () {
    var
      val1 = {},
      val2 = {}
    ;
    salt = new Salt({
      _data: {foo: val1},
      a: {
        _data: 'foo'
      }
    });

    salt.go(1);
    salt.data.foo.should.equal(val1);

    salt.go('//a/');
    salt.data.foo.should.equal(val1);
    salt.data.foo = val2;

    salt.go(1);
    salt.data.foo.should.equal(val1);
  });

  it( 'should use (arrays of) strings as member names', function () {
    salt = new Salt({
      a: {
        _data: 'foo'
      },
      b: {
        _data: ['bar', 'zee']
      }
    });
    salt.data.should.not.haveOwnProperty('foo');
    salt.data.should.not.haveOwnProperty('bar');
    salt.data.should.not.haveOwnProperty('zee');
    salt.go('//a');
    salt.data.should.haveOwnProperty('foo');
    salt.data.should.not.haveOwnProperty('bar');
    salt.data.should.not.haveOwnProperty('zee');
    salt.go('//b');
    salt.data.should.haveOwnProperty('bar');
    salt.data.should.haveOwnProperty('zee');
  });

  it( 'should use object keys as member names', function () {
    salt = new Salt({
      a: {
        _data: {foo: 1}
      },
      b: {
        _data: {bar: 1, zee: 1}
      }
    });
    salt.data.should.not.haveOwnProperty('foo');
    salt.data.should.not.haveOwnProperty('bar');
    salt.data.should.not.haveOwnProperty('zee');
    salt.go('//a');
    salt.data.should.haveOwnProperty('foo');
    salt.data.should.not.haveOwnProperty('bar');
    salt.data.should.not.haveOwnProperty('zee');
    salt.go('//b');
    salt.data.should.haveOwnProperty('bar');
    salt.data.should.haveOwnProperty('zee');
  });

  it( 'should use strings and object-keys, in an array, as member names', function () {
    salt = new Salt({
      a: {
        _data: ['foo']
      },
      b: {
        _data: ['bar', {zee: 1}]
      }
    });
    salt.data.should.not.haveOwnProperty('foo');
    salt.data.should.not.haveOwnProperty('bar');
    salt.data.should.not.haveOwnProperty('zee');
    salt.go('//a');
    salt.data.should.haveOwnProperty('foo');
    salt.data.should.not.haveOwnProperty('bar');
    salt.data.should.not.haveOwnProperty('zee');
    salt.go('//b');
    salt.data.should.haveOwnProperty('bar');
    salt.data.should.haveOwnProperty('zee');
  });

  it( 'should use the previous value or `undefined` for strings', function () {
    var num = 10;
    salt = new Salt({
      _data: {foo: num},
      a: {
        _data: ['foo', 'bar']
      }
    });
    salt.go('//');
    salt.data.foo.should.equal(num);

    salt.go('//a/');
    salt.data.foo.should.equal(num);
    expect(salt.data.bar).to.equal(undefined);
  });

  it( 'should use the paired value for object-keys', function () {
    var val = {};
    salt = new Salt({
      _data: {foo: val}
    });
    salt.data.should.not.haveOwnProperty('foo');
    salt.go('//');
    salt.data.should.haveOwnProperty('foo');
    salt.data.foo.should.equal(val);
  });


});