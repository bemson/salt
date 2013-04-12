describe( 'Flow#callbacks()', function () {

  var
    flow,
    spyTarget,
    arg
  ;

  before(function () {
    flow = new Flow({
      a: {
        b: {}
      },
      c: {}
    });
    spyTarget = sinon.spy(flow, 'target');
    arg = {};
  });

  beforeEach(function () {
    flow.go(0);
    spyTarget.reset();
  });

  it( 'should return a network of curried Flow#target() calls, matching the program structure', function () {
    var
      arg = {},
      network = flow.callbacks()
    ;

    flow.status().path.should.equal('..//');
    spyTarget.should.not.have.been.called;

    network.should.be.a('function');
    network(arg);
    spyTarget.should.have.been.calledOnce;
    spyTarget.should.have.been.calledWithExactly(1, arg);
    flow.status().path.should.equal('//');

    network.a.should.be.a('function');
    network.a.b.should.be.a('function');
    network.c.should.be.a('function');

    network.a.b(arg);
    spyTarget.should.have.been.calledTwice;
    spyTarget.should.have.been.calledWithExactly(3, arg);
    flow.status().path.should.equal('//a/b/');
  });

  it( 'should return a sub-network when given an absolute query', function () {
    var
      arg = {},
      subnetwork = flow.callbacks('//a/')
    ;

    subnetwork.should.be.a('function');
    subnetwork.b.should.be.a('function');

    subnetwork(arg);
    spyTarget.should.have.been.calledOnce;
    spyTarget.should.have.been.calledWithExactly(2, arg);
  });

  it( 'should return a sub-network for the current branch when passed `true`', function () {
    flow.go('//a/');
    var subnetwork = flow.callbacks(true);

    subnetwork.should.be.a('function');
    subnetwork.b.should.be.a('function');
    subnetwork.b(arg);
    spyTarget.should.have.been.called;
    spyTarget.should.have.been.calledWithExactly(3, arg);
  });

  it( 'should return a (network of) function with local .toString() methods, for use as queries', function () {
    var
      network = flow.callbacks(),
      query = '.',
      curriedQuery = flow.callbacks(query)
    ;
    network.should.itself.respondTo('toString');
    curriedQuery.should.itself.respondTo('toString');
    flow.query(network).should.be.ok;
    flow.query(curriedQuery).should.be.ok;
  });

  it( 'should return a cached and curried Flow#target() call for non-absolute queries', function () {
    var
      query = '@next|@child',
      curriedQuery = flow.callbacks(query)
    ;

    curriedQuery.should.be.a('function');
    curriedQuery(arg);
    spyTarget.should.have.been.called;
    spyTarget.should.have.been.calledWithExactly(query, arg);

    curriedQuery.should.equal(flow.callbacks(query));
  });

  it( 'should not expose any network of calls for non-absolute queries', function () {
    var
      query = '@next|@child',
      curriedQuery = flow.callbacks(query),
      props = [],
      prop
    ;

    curriedQuery.should.be.a('function');

    for (prop in curriedQuery) {
      if (prop !== 'toString' && curriedQuery.hasOwnProperty(prop)) {
        props.push(prop);
      }
    }
    props.length.should.equal(0);
  });

});