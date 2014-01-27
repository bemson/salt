describe( 'Salt#data', function () {

  var salt;

  beforeEach(function () {
    salt = new Salt({
      _data: 'foo',
      a: {
        _data: {foo: 10}
      }
    });
  });

  it( 'should initially be an empty object', function () {
    salt.data.should.be.empty;
  });

  it( 'should have members present and set according to the current state\'s _data tag', function () {
    salt.data.should.not.have.ownProperty('foo');
    salt.go(1);
    salt.data.should.have.ownProperty('foo');
    expect(salt.data.foo).to.equal(undefined);
    salt.go('//a/');
    salt.data.foo.should.equal(10);
    salt.go(1);
    expect(salt.data.foo).to.equal(undefined);
    salt.go(0);
    salt.data.should.not.have.ownProperty('foo');
  });

  it( 'should have manually added members restored when a given state is exited', function () {
    var obj = {};
    salt.data.should.not.have.ownProperty('foo');
    salt.data.foo = obj;
    salt.go('//a/');
    salt.data.foo.should.equal(10);
    salt.go(0);
    salt.data.foo.should.equal(obj);
  });

  it( 'should restore user-deleted members when exiting a state', function () {
    salt.data.should.not.have.ownProperty('foo');
    salt.go('//a/');
    salt.data.foo.should.equal(10);
    delete salt.data.foo;
    salt.go(1);
    salt.data.should.have.ownProperty('foo');
    expect(salt.data.foo).to.equal(undefined);
  });


});