describe( 'Flow#target()', function () {

  var flow;

  it( 'should navigate towards a given query', function () {
    var inSpy = sinon.spy();
    flow = new Flow({
      _in: inSpy
    });
    flow.state.path.should.equal('..//');
    flow.target(1);
    flow.state.path.should.equal('//');
    inSpy.should.have.been.calledOnce;
  });

  it( 'should pass through additional params as sequence arguments', function () {
    var
      arg1 = {},
      arg2 = {},
      inSpy = sinon.spy(),
      onSpy = sinon.spy()
    ;
    flow = new Flow({
      _in: function () {
        this.args.should.eql([arg1, arg2]);
        inSpy();
      },
      _on: onSpy
    });
    flow.target(1, arg1, arg2);
    inSpy.should.have.been.calledWithExactly();
    onSpy.should.have.been.calledWithExactly(arg1, arg2);
  });

  it( 'should define a new destination state', function () {
    var inSpy = sinon.spy();
    flow = new Flow({
      _in: function () {
        var originalDestination = this.status().targets.slice(-1)[0];
        this.target('@self');
        this.status().targets.slice(-1)[0].should.not.equal(originalDestination);
        inSpy();
      },
      a: {},
      b: {}
    });
    flow.go('//a', '//b');
    flow.state.path.should.equal('//');
    inSpy.should.have.been.called;
  });

  it( 'should clear all waypoints', function () {
    var inSpy = sinon.spy();
    flow = new Flow({
      _in: function () {
        this.status().targets.should.have.length.above(1);
        this.target('@self');
        this.status().targets.should.have.lengthOf(1);
        inSpy();
      },
      a: {},
      b: {},
      c: {}
    });
    flow.go('//a', '//b', '//c');
    flow.state.path.should.equal('//');
    inSpy.should.have.been.called;
  });

  it( 'should cancel delayed navigation/callbacks via `.wait()`', function () {
    var
      navSpy = sinon.spy(),
      fncSpy = sinon.spy()
    ;
    flow = new Flow({
      pause: {
        _in: function () {
          this.wait();
        }
      },
      delay: {
        nav: {
          _in: function () {
            this.wait(0);
          },
          _on: navSpy
        },
        fnc: function () {
          this.wait(fncSpy, 0);
        }
      }
    });

    flow.go('//pause');
    flow.status().paused.should.be.ok;
    flow.target(1);
    flow.status().paused.should.not.be.ok;

    flow.go('//delay/nav');
    flow.status().paused.should.be.ok;
    flow.target(1);
    flow.status().paused.should.not.be.ok;
    navSpy.should.not.have.been.called;

    flow.go('//delay/fnc');
    flow.status().paused.should.be.ok;
    flow.target(1);
    flow.status().paused.should.not.be.ok;
    fncSpy.should.not.have.been.called;
  });

  it( 'should return the destination state\'s _on callback result', function () {
    var val = {};
    flow = new Flow(function () {
      return val;
    });
    flow.target(1).should.equal(val);
  });

  it( 'should return true if the destination\'s has no _on callback or it returns `undefined`', function () {
    var spy = sinon.spy();
    flow = new Flow(spy);
    flow.target(1).should.equal(true);
    spy.should.have.been.calledOnce;
    spy.should.have.returned(undefined);
  });

  it( 'should return false if the navigation sequence is paused/delayed', function () {
    var
      pauseSpy = sinon.spy(),
      delaySpy = sinon.spy()
    ;
    flow = new Flow({
      pause: function () {
        this.wait();
        pauseSpy();
      },
      delay: function () {
        this.wait(0);
        delaySpy();
      }
    });

    flow.target('//pause').should.equal(false);
    flow.status().paused.should.be.ok;
    pauseSpy.should.have.returned(undefined);

    flow.target('//delay').should.equal(false);
    flow.status().paused.should.be.ok;
    delaySpy.should.have.returned(undefined);
  });

  it( 'should return false if the navigation sequence is pended', function () {
    var pender = new Flow(function () {
      this.wait();
    });
    flow = new Flow(function () {
      pender.go(1);
    });

    flow.target(1).should.equal(false);
    flow.status().paused.should.not.be.ok;
    flow.status().pending.should.equal(true);
    pender.go();
    flow.status().pending.should.equal(false);
  });

  it( 'should return false when called externally on a locked instance', function () {
    flow = new Flow({
      _perms: '!world'
    });
    flow.perms().world.should.be.ok;
    flow.go(1);
    flow.perms().world.should.not.be.ok;
    flow.target(0).should.equal(false);
  });

});