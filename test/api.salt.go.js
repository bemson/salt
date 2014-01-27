describe( 'Salt#go()', function () {

  var salt;

  it( 'should navigate towards the given queries', function () {
    var spy = sinon.spy();
    salt = new Salt({
      _in: spy,
      _on: spy,
      a: spy
    });
    salt.state.path.should.equal('..//');
    salt.go(1, '//a/');
    salt.state.path.should.equal('//a/');
    spy.should.have.been.calledThrice;
  });

  it( 'should add a waypoint for each query', function () {
    var spy = sinon.spy();
    salt = new Salt({
      _on: function () {
        this.status().targets.should.have.lengthOf(2);
        spy();
      },
      a: {},
      b: {}
    });
    salt.go(1, '//a', '//b');
    spy.should.have.been.calledOnce;
  });

  it( 'should ignore the last query if it matches the last waypoint', function () {
    var
      sameQuery = '//a/',
      inSpy = sinon.spy()
    ;
    salt = new Salt({
      _in: function () {
        var targetCnt = this.status().targets.length;
        this.go(sameQuery);
        targetCnt.should.equal(this.status().targets.length);
        this.go('//b/');
        this.status().targets.should.have.length.above(targetCnt);
        inSpy();
      },
      a: {},
      b: {}
    });
    salt.go(sameQuery, '//b/');
    inSpy.should.have.been.calledOnce;
  });

  it( 'should set a new destination when at the `_on` phase of the current one', function () {
    var spy = sinon.spy();
    salt = new Salt({
      a: function () {
        this.status().targets.should.have.lengthOf(0);
        this.go('//b/');
        this.status().targets.should.have.lengthOf(1);
        spy();
      },
      b: {}
    });
    salt.go('//a');
    salt.state.path.should.equal('//b/');
    spy.should.have.been.calledOnce;
  });

  it( 'should cancel delayed callbacks via `.wait()`', function () {
    var
      fncSpy = sinon.spy(),
      delaySpy = sinon.spy()
    ;
    salt = new Salt({
      delay: function () {
        this.wait(fncSpy, 0);
        delaySpy();
      }
    });

    salt.go('//delay');
    salt.status().paused.should.be.ok;
    salt.go(1);
    fncSpy.should.not.have.been.called;
    delaySpy.should.have.been.called;
  });

  it( 'should resume paused/delayed navigation when called with no arguments', function () {
    var
      pauseSpy = sinon.spy(),
      delaySpy = sinon.spy()
    ;
    salt = new Salt({
      pause: {
        _in: function () {
          this.wait();
        },
        _on: pauseSpy
      },
      delay: {
        _in: function () {
          this.wait(0);
        },
        _on: delaySpy
      }
    });

    salt.go('//pause');
    pauseSpy.should.not.have.been.called;
    salt.status().paused.should.be.ok;
    salt.go();
    pauseSpy.should.have.been.calledOnce;

    salt.go('//delay');
    delaySpy.should.not.have.been.called;
    salt.status().paused.should.be.ok;
    salt.go();
    delaySpy.should.have.been.calledOnce;
  });

  it( 'should return true if one or more states get traversed', function () {
    var inSpy = sinon.spy();
    salt = new Salt({
      _in: inSpy
    });
    salt.go(1).should.equal(true);
    inSpy.should.have.been.calledOnce;
  });

  it( 'should return false when called externally on a locked instance', function () {
    salt = new Salt({
      _perms: '!world'
    });
    salt.state.perms.world.should.be.ok;
    salt.go(1);
    salt.state.perms.world.should.not.be.ok;
    salt.go(0).should.equal(false);
  });

});
