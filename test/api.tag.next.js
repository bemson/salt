describe( '_next tag', function () {

  var
    salt,
    inSpy,
    onSpy,
    outSpy
  ;

  beforeEach(function () {
    inSpy = sinon.spy();
    onSpy = sinon.spy();
    outSpy = sinon.spy();
  });

  it( 'should navigate to the resolved state when paired with a query', function () {
    salt = new Salt({
      _next: 0,
      _on: onSpy
    });
    salt.go(1);
    onSpy.should.have.been.calledOnce;
    salt.state.index.should.equal(0);
  });

  it( 'should only redirect when the state is targeted', function () {
    salt = new Salt({
      _next: 0,
      _on: inSpy,
      foo: {
        _next: 1,
        _in: onSpy
      }
    });
    salt.go('//foo');
    salt.state.index.should.equal(0);
    onSpy.should.have.been.calledBefore(inSpy);
  });

  it( 'should be observed before an `_on` short-form redirects', function () {
    salt = new Salt({
      _on: 'bar',
      _next: 'foo',
      foo: inSpy,
      bar: onSpy
    });
    salt.go(1);
    salt.state.name.should.equal('bar');
    inSpy.should.have.been.calledOnce;
    onSpy.should.have.been.calledOnce;
    inSpy.should.have.been.calledBefore(onSpy);
  });

  it( 'should be observed after `_wait` expires', function () {
    salt = new Salt({
      _next: 0,
      _wait: true,
      _out: outSpy
    });
    salt.go(1);
    salt.status('paused').should.be.ok;
    salt.state.index.should.equal(1);
    outSpy.should.not.have.been.called;

    salt.go(0);
    salt.state.index.should.equal(0);
    outSpy.should.have.been.calledOnce;
  });

  it( 'should inject new waypoints in a `_sequence`', function () {
    salt = new Salt({
      _sequence: true,
      a: {
        _next: '/b',
        _out: outSpy
      },
      b: {
        _sequence: false,
        _in: inSpy
      },
      c: onSpy
    });
    salt.go(1);

    salt.state.name.should.equal('c');
    outSpy.should.have.been.calledBefore(inSpy);
    inSpy.should.have.been.calledBefore(onSpy);
  });

  it( 'should schedule navigation before `_on` callback', function () {
    salt = new Salt({
      _next: 0,
      _in: function () {
        var program = this;
        program.status('targets')[0].should.equal('//');
      },
      _on: function () {
        var program = this;
        program.status('targets').should.not.be.empty;
        expect(program.status('targets')[0]).to.equal('..//');
        program.wait();
      }
    });
    salt.go(1);
    salt.state.index.should.equal(1);
  });

  it( 'should not prevent destination callbacks from receiving arguments', function () {
    var arg = {};
    salt = new Salt({
      _next: 0,
      _on: onSpy
    });
    salt.get(1, arg);
    onSpy.should.have.been.calledWithExactly(arg);
  });

  it( 'should be reflected in `.state.fwds`, per state', function () {
    salt = new Salt({
      has: {
        _next: 0,
        _wait: true
      },
      nohas: {}
    });
    salt.state.fwds.should
      .be.a('boolean')
      .and.not.be.ok;
    salt.go('//has');
    salt.state.fwds.should.be.ok;
    salt.go('//nohas');
    salt.state.fwds.should.not.be.ok;
  });

  describe( 'prefixed with a ">"', function () {

    it( 'should set a new destination state', function () {
      salt = new Salt({
        _on: 'bar',
        _next: '>foo',
        foo: inSpy,
        bar: onSpy
      });
      salt.go(1);
      salt.state.name.should.equal('foo');
      inSpy.should.have.been.calledOnce;
      onSpy.should.not.have.been.called;
    });

    it( 'should pass-thru arguments', function () {
      var arg = {};
      salt = new Salt({
        _next: '>foo',
        foo: onSpy,
      });
      salt.get(1, arg);
      salt.state.name.should.equal('foo');
      onSpy.should.have.been.calledWithExactly(arg);
    });

  });

});