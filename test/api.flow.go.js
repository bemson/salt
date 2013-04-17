describe( 'Flow#go()', function () {

  var flow;

  it( 'should navigate towards the given queries', function () {
    var spy = sinon.spy();
    flow = new Flow({
      _in: spy,
      _on: spy,
      a: spy
    });
    flow.state.path.should.equal('..//');
    flow.go(1, '//a/');
    flow.state.path.should.equal('//a/');
    spy.should.have.been.calledThrice;
  });

  it( 'should add a waypoint for each query', function () {
    var spy = sinon.spy(function () {
      this.status().targets.should.have.lengthOf(2);
    });
    flow = new Flow({
      _on: spy,
      a: {},
      b: {}
    });
    flow.go(1, '//a', '//b');
    spy.should.have.been.calledOnce;
  });

  it( 'should ignore the last query if it matches the last waypoint', function () {
    var
      sameQuery = '//a/',
      inSpy = sinon.spy(function () {
        var targetCnt = this.status().targets.length;
        this.go(sameQuery);
        targetCnt.should.equal(this.status().targets.length);
        this.go('//b/');
        this.status().targets.should.have.length.above(targetCnt);
      })
    ;
    flow = new Flow({
      _in: inSpy,
      a: {},
      b: {}
    });
    flow.go(sameQuery, '//b/');
    inSpy.should.have.been.calledOnce;
  });

  it( 'should set a new destination when at the `_on` phase of the current one', function () {
    var spy = sinon.spy(function () {
      this.status().targets.should.have.lengthOf(0);
      this.go('//b/');
      this.status().targets.should.have.lengthOf(1);
    });
    flow = new Flow({
      a: spy,
      b: {}
    });
    flow.go('//a');
    flow.state.path.should.equal('//b/');
    spy.should.have.been.calledOnce;
  });

  it( 'should cancel delayed callbacks via `.wait()`', function () {
    var
      fncSpy = sinon.spy(),
      delaySpy = sinon.spy(function () {
        this.wait(fncSpy, 0);
      })
    ;
    flow = new Flow({
      delay: delaySpy
    });

    flow.go('//delay');
    flow.status().paused.should.be.ok;
    flow.go(1);
    fncSpy.should.not.have.been.called;
    delaySpy.should.have.been.called;
  });

  it( 'should resume paused/delayed navigation when called with no arguments', function () {
    var
      pauseSpy = sinon.spy(),
      delaySpy = sinon.spy()
    ;
    flow = new Flow({
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

    flow.go('//pause');
    pauseSpy.should.not.have.been.called;
    flow.status().paused.should.be.ok;
    flow.go();
    pauseSpy.should.have.been.calledOnce;

    flow.go('//delay');
    delaySpy.should.not.have.been.called;
    flow.status().paused.should.be.ok;
    flow.go();
    delaySpy.should.have.been.calledOnce;
  });

  it( 'should return true if one or more states get traversed', function () {
    var inSpy = sinon.spy();
    flow = new Flow({
      _in: inSpy
    });
    flow.go(1).should.equal(true);
    inSpy.should.have.been.calledOnce;
  });

  it( 'should return false when called externally on a locked instance', function () {
    flow = new Flow({
      _lock: 1
    });
    flow.lock().should.not.be.ok;
    flow.go(1);
    flow.lock().should.be.ok;
    flow.go(0).should.equal(false);
  });

});
