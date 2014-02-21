describe( '_wait tag', function () {

  var
    salt,
    inSpy,
    onSpy,
    outSpy,
    waitSpy
  ;

  beforeEach(function () {
    inSpy = sinon.spy();
    onSpy = sinon.spy();
    outSpy = sinon.spy();
    waitSpy = sinon.spy(Salt.pkg('core').proxy, 'wait');
  });

  afterEach(function () {
    waitSpy.restore();
  });

  it( 'should pause navigation', function () {
    salt = new Salt({
      _wait: true
    });
    salt.go(1);
    salt.status('paused').should.be.ok;
    salt.state.name.should.equal('_program');
  });

  it( 'should normalize given array as .wait() arguments', function () {
    var
      trackingArg = {},
      waitArgs = ['blah', 5, 'a', trackingArg]
    ;

    salt = new Salt({
      _wait: waitArgs
    });
    salt.go(1);

    waitSpy.firstCall.should.have.been.calledWithExactly(-1, 5, 'a', trackingArg);
    salt.go(0);
  });

  it( 'should treat number as amount of time to delay', function (done) {
    salt = new Salt({
      _wait: 5,
      foo: done
    });
    salt.go(1, '//foo');

    waitSpy.should.have.been.calledOnce;
    waitSpy.firstCall.should.have.been.calledWithExactly(5);
    salt.status('paused').should.be.ok;
  });

  it( 'should treat `true` as an indefinite delay', function () {
    salt = new Salt({
      _wait: true
    });
    salt.go(1);

    waitSpy.should.have.been.calledOnce;
    waitSpy.firstCall.args.should.have.length(0);
  });

  it( 'should be reflected in `.state.delays`, per state', function () {
    salt = new Salt({
      has: {
        _wait: true
      },
      nohas: {}
    });
    salt.state.delays.should
      .be.a('boolean')
      .and.not.be.ok;
    salt.go('//has');
    salt.state.delays.should.be.ok;
    salt.go('//nohas');
    salt.state.delays.should.not.be.ok;
  });

  it( 'should ignore objects', function () {
    salt = new Salt({
      _wait: {}
    });
    salt.go(1);
    waitSpy.should.not.have.been.called;
    salt.status('paused').should.not.be.ok;
  });

  it( 'should ignore `false`', function () {
    salt = new Salt({
      _wait: false
    });
    salt.go(1);
    waitSpy.should.not.have.been.called;
    salt.status('paused').should.not.be.ok;
  });

  it( 'should only pause navigation of targeted states', function () {
    salt = new Salt({
      _wait: true,
      _in: inSpy,
      _on: onSpy,
      foo: {
        _wait: true
      }
    });
    salt.go('//foo');

    inSpy.should.have.been.calledOnce;
    onSpy.should.not.have.been.calledOnce;
    salt.status('paused').should.be.ok;
    salt.state.name.should.equal('foo');
  });

  it( 'should pause navigation before on callback', function () {
    salt = new Salt({
      _wait: true,
      _on: onSpy
    });
    salt.go(1);
    salt.status('paused').should.be.ok;
    waitSpy.should.have.been.calledOnce;
    onSpy.should.have.been.calledOnce;
    waitSpy.should.have.been.calledBefore(onSpy);
  });

  it( 'should work with short-form redirects', function () {
    var
      goSpy = sinon.spy(Salt.pkg('core').proxy, 'go'),
      getSpy = sinon.spy(Salt.pkg('core').proxy, 'get')
    ;
    salt = new Salt({
      _wait: true,
      _on: 'foo',
      foo: {
        _wait: true,
        _on: '>bar',
        bar: 1
      }
    });

    salt.go(1);
    salt.status('paused').should.be.ok;
    salt.status('targets').should.eql(['//foo/']);
    salt.state.name.should.equal('_program');
    waitSpy.should.have.been.calledAfter(goSpy);

    salt.go();
    salt.status('paused').should.be.ok;
    salt.status('targets').should.eql(['//foo/bar/']);
    salt.state.name.should.equal('foo');
    waitSpy.should.have.been.calledAfter(getSpy);
  });

  it( 'should block navigation for the given period of time', function (done) {
    salt = new Salt({
      _wait: 1,
      _on: function () {
        done();
      }
    });

    salt.go(1);
    salt.status('paused').should.be.ok;
  });

  it( 'should redirect after the given period of time', function (done) {
    salt = new Salt({
      _wait: ['..//', 1],
      _out: function () {
        done();
      }
    });

    salt.go(1);
    salt.status('paused').should.be.ok;
  });

  it( 'should allow for (infinite) recursion', function (done) {
    salt = new Salt({
      _wait: ['@self', 1],
      _on: function () {
        var program = this;
        if (program.status('loops') > 2) {
          program.go(0);
        }
      },
      _out: done
    });

    salt.go(1);
    salt.status('paused').should.be.ok;
  });

});