describe( 'Flow#callbacks()', function () {

  var
    flow,
    callback,
    val
  ;

  before(function () {
    val = {};
  });

  it( 'should return a curried call to `.target()`', function () {
    var
      flow = new Flow(),
      spyTarget = sinon.spy(flow, 'target'),
      callback = flow.callbacks()
    ;
    callback.should.be.a('function');
    callback();
    spyTarget.should.have.been.calledOnce;
    flow.target.restore();
  });

  it( 'should navigate to the given "query"', function () {
    var
      queryIdx = 1,
      flow = new Flow(function () {
        return val;
      }),
      callback = flow.callbacks(queryIdx)
    ;
    flow.state.index.should.equal(0);
    callback().should.equal(val);
    flow.state.index.should.equal(queryIdx);
  });

  it( 'should use `.go()` when the "waypoints" flag is truthy', function () {
    var
      flow = new Flow(),
      spyGo = sinon.spy(flow, 'go'),
      callback = flow.callbacks(0, true)
    ;
    callback();
    spyGo.should.have.been.calledOnce;
    flow.go.restore();
  });

  it( 'should ignore permissions when the "blessed" flag is truthy', function () {
    var
      flow = new Flow({
        _perms: '!world',
        _on: function () {
          callback = flow.callbacks(0, 0, true);
        }
      }),
      spyTarget = sinon.spy(flow, 'target'),
      callback
    ;
    flow.state.perms.world.should.be.ok;
    flow.go(1);
    flow.state.index.should.equal(1);
    flow.state.perms.world.should.not.be.ok;
    flow.go(0).should.not.be.ok;
    callback();
    flow.state.index.should.equal(0);
    spyTarget.should.have.been.calledOnce;
    flow.target.restore();
  });

  it( 'should ignore the "blessed" flag if used outside the Flow program', function () {
    var
      flow = new Flow({
        _perms: '!world'
      }),
      spyTarget = sinon.spy(flow, 'target'),
      callback = flow.callbacks(0, false, true)
    ;
    flow.state.perms.world.should.be.ok;
    flow.go(1);
    flow.state.index.should.equal(1);
    flow.state.perms.world.should.not.be.ok;
    flow.go(0).should.not.be.ok;
    callback();
    flow.state.index.should.not.equal(0);
    spyTarget.should.have.been.calledOnce;
    flow.target.restore();
  });

  it( 'should cache callbacks to the same state', function () {
    var
      flow = new Flow(),
      cb1 = flow.callbacks('//a'),
      cb2 = flow.callbacks('//a'),
      cb3 = flow.callbacks('//b')
    ;
    cb1.should.equal(cb2);
    cb3.should.not.equal(cb1);
  });

});