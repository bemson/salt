describe( 'Flow#data', function () {

  var flow;

  beforeEach(function () {
    flow = new Flow({
      _data: 'foo',
      a: {
        _data: {foo: 10}
      }
    });
  });

  it( 'should initially be an empty object', function () {
    flow.data.should.be.empty;
  });

  it( 'should have members present and set according to the current state\'s _data tag', function () {
    flow.data.should.not.have.ownProperty('foo');
    flow.go(1);
    flow.data.should.have.ownProperty('foo');
    expect(flow.data.foo).to.equal(undefined);
    flow.go('//a/');
    flow.data.foo.should.equal(10);
    flow.go(1);
    expect(flow.data.foo).to.equal(undefined);
    flow.go(0);
    flow.data.should.not.have.ownProperty('foo');
  });

  it( 'should have manually added members restored when a given state is exited', function () {
    var obj = {};
    flow.data.should.not.have.ownProperty('foo');
    flow.data.foo = obj;
    flow.go('//a/');
    flow.data.foo.should.equal(10);
    flow.go(0);
    flow.data.foo.should.equal(obj);
  });

  it( 'should restore user-deleted members when exiting a state', function () {
    flow.data.should.not.have.ownProperty('foo');
    flow.go('//a/');
    flow.data.foo.should.equal(10);
    delete flow.data.foo;
    flow.go(1);
    flow.data.should.have.ownProperty('foo');
    expect(flow.data.foo).to.equal(undefined);
  });


});