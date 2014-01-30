describe( 'Salt#target()', function () {

  var salt;

  it( 'should navigate towards a given query', function () {
    var inSpy = sinon.spy();
    salt = new Salt({
      _in: inSpy
    });
    salt.state.path.should.equal('..//');
    salt.target(1);
    salt.state.path.should.equal('//');
    inSpy.should.have.been.calledOnce;
  });

  it( 'should pass through additional params as sequence arguments', function () {
    var
      arg1 = {},
      arg2 = {},
      inSpy = sinon.spy(),
      onSpy = sinon.spy()
    ;
    salt = new Salt({
      _in: function () {
        this.args.should.eql([arg1, arg2]);
        inSpy();
      },
      _on: onSpy
    });
    salt.target(1, arg1, arg2);
    inSpy.should.have.been.calledWithExactly();
    onSpy.should.have.been.calledWithExactly(arg1, arg2);
  });

  it( 'should update `.args`', function () {
    var
      fooArg = 'foo',
      barArg = 'bar'
    ;

    salt = new Salt(function () {
      this.args.should.eql([fooArg]);
      this.target(0, barArg);
      this.args.should.eql([barArg]);
    });
    salt.target(1, fooArg).should.equal(true);
  });

  it( 'should define a new destination state', function () {
    var inSpy = sinon.spy();
    salt = new Salt({
      _in: function () {
        var originalDestination = this.status().targets.slice(-1)[0];
        this.target('@self');
        this.status().targets.slice(-1)[0].should.not.equal(originalDestination);
        inSpy();
      },
      a: {},
      b: {}
    });
    salt.go('//a', '//b');
    salt.state.path.should.equal('//');
    inSpy.should.have.been.called;
  });

  it( 'should clear all waypoints', function () {
    var inSpy = sinon.spy();
    salt = new Salt({
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
    salt.go('//a', '//b', '//c');
    salt.state.path.should.equal('//');
    inSpy.should.have.been.called;
  });

  it( 'should cancel delayed navigation/callbacks via `.wait()`', function () {
    var
      navSpy = sinon.spy(),
      fncSpy = sinon.spy()
    ;
    salt = new Salt({
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

    salt.go('//pause');
    salt.status().paused.should.be.ok;
    salt.target(1);
    salt.status().paused.should.not.be.ok;

    salt.go('//delay/nav');
    salt.status().paused.should.be.ok;
    salt.target(1);
    salt.status().paused.should.not.be.ok;
    navSpy.should.not.have.been.called;

    salt.go('//delay/fnc');
    salt.status().paused.should.be.ok;
    salt.target(1);
    salt.status().paused.should.not.be.ok;
    fncSpy.should.not.have.been.called;
  });

  it( 'should return the destination state\'s _on callback result', function () {
    var val = {};
    salt = new Salt(function () {
      return val;
    });
    salt.target(1).should.equal(val);
  });

  it( 'should return true if the destination\'s has no _on callback or it returns `undefined`', function () {
    var spy = sinon.spy();
    salt = new Salt(spy);
    salt.target(1).should.equal(true);
    spy.should.have.been.calledOnce;
    spy.should.have.returned(undefined);
  });

  it( 'should return false if the navigation sequence is paused/delayed', function () {
    var
      pauseSpy = sinon.spy(),
      delaySpy = sinon.spy()
    ;
    salt = new Salt({
      pause: function () {
        this.wait();
        pauseSpy();
      },
      delay: function () {
        this.wait(0);
        delaySpy();
      }
    });

    salt.target('//pause').should.equal(false);
    salt.status().paused.should.be.ok;
    pauseSpy.should.have.returned(undefined);

    salt.target('//delay').should.equal(false);
    salt.status().paused.should.be.ok;
    delaySpy.should.have.returned(undefined);
  });

  it( 'should return false if the navigation sequence is pinned', function () {
    var pinner = new Salt(function () {
      this.wait();
    });
    salt = new Salt(function () {
      pinner.go(1);
    });

    salt.target(1).should.equal(false);
    salt.status().paused.should.not.be.ok;
    salt.status().pinned.should.equal(true);
    pinner.go();
    salt.status().pinned.should.equal(false);
  });

  it( 'should return false when called externally on a locked instance', function () {
    salt = new Salt({
      _perms: '!world'
    });
    salt.state.perms.world.should.be.ok;
    salt.go(1);
    salt.state.perms.world.should.not.be.ok;
    salt.target(0).should.equal(false);
  });

});