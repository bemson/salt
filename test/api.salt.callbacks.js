describe( 'Salt#callbacks()', function () {

  var
    salt,
    callback,
    val
  ;

  before(function () {
    val = {};
  });

  it( 'should return a curried call to `.get()`', function () {
    var
      salt = new Salt(),
      spyTarget = sinon.spy(Salt.pkg('core').proxy, 'get'),
      callback = salt.callbacks()
    ;
    callback.should.be.a('function');
    callback();
    spyTarget.should.have.been.calledOnce;
    salt.get.restore();
  });

  it( 'should navigate to the given "query"', function () {
    var
      queryIdx = 1,
      salt = new Salt(function () {
        return val;
      }),
      callback = salt.callbacks(queryIdx)
    ;
    salt.state.index.should.equal(0);
    callback().should.equal(val);
    salt.state.index.should.equal(queryIdx);
  });

  it( 'should use `.go()` when the "waypoints" flag is truthy', function () {
    var
      salt = new Salt(),
      spyGo = sinon.spy(Salt.pkg('core').proxy, 'go'),
      callback = salt.callbacks(0, true)
    ;
    callback();
    spyGo.should.have.been.calledOnce;
    salt.go.restore();
  });

  it( 'should ignore permissions when the "blessed" flag is truthy', function () {
    var
      salt = new Salt({
        _perms: '!world',
        _on: function () {
          callback = salt.callbacks(0, 0, true);
        }
      }),
      spyTarget = sinon.spy(Salt.pkg('core').proxy, 'get'),
      callback
    ;
    salt.state.perms.world.should.be.ok;
    salt.go(1);
    salt.state.index.should.equal(1);
    salt.state.perms.world.should.not.be.ok;
    salt.go(0).should.not.be.ok;
    callback();
    salt.state.index.should.equal(0);
    spyTarget.should.have.been.calledOnce;
    salt.get.restore();
  });

  it( 'should ignore the "blessed" flag if used outside the Salt program', function () {
    var
      salt = new Salt({
        _perms: '!world'
      }),
      spyTarget = sinon.spy(Salt.pkg('core').proxy, 'get'),
      callback = salt.callbacks(0, false, true)
    ;
    salt.state.perms.world.should.be.ok;
    salt.go(1);
    salt.state.index.should.equal(1);
    salt.state.perms.world.should.not.be.ok;
    salt.go(0).should.not.be.ok;
    callback();
    salt.state.index.should.not.equal(0);
    spyTarget.should.have.been.calledOnce;
    salt.get.restore();
  });

  it( 'should cache callbacks to the same state', function () {
    var
      salt = new Salt(),
      cb1 = salt.callbacks('//a'),
      cb2 = salt.callbacks('//a'),
      cb3 = salt.callbacks('//b')
    ;
    cb1.should.equal(cb2);
    cb3.should.not.equal(cb1);
  });

});