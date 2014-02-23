describe( '_tail tag', function () {
  
  var salt;

  it( 'should redirect when navigation ends in a tagged branch', function () {
    var spy = sinon.spy();
    salt = new Salt({
      _tail: '@next|@child',
      a: spy,
      b: '//a/',
      c: '//a/',
      d: '//a/'
    });
    salt.go(1);
    spy.callCount.should.equal(4);
  });

  it( 'should not redirect to the current state', function () {
    var spy = sinon.spy();
    salt = new Salt({
      _tail: '@self',
      _on: spy
    });
    salt.go(1);
    spy.should.have.been.calledOnce;
  });

  it( 'should not redirect when given a bad query', function () {
    var spy = sinon.spy();
    salt = new Salt({
      a: {
        _tail: 'foo',
        b: spy
      }
    });
    salt.go('//a/');
    salt.state.path.should.equal('//a/');
    spy.should.not.have.been.called;
  });

  it( 'should be reflected in `.state.tails`', function () {
    var doesTail = sinon.spy(function () {
      this.state.tails.should.be.ok;
    });

    salt = new Salt({
      has: {
        _tail: 'tgt',
        _in: doesTail,
        _on: doesTail,
        _out: doesTail,
        _over: doesTail,
        tgt: {
          _tail: 0,
          _on: doesTail,
          _out: doesTail
        }
      },
      nohas: {
        _tail: 'badquery',
        _on: function () {
          this.state.tails.should.not.be.ok;
        }
      }
    });
    salt.go('//has');
    salt.go('//nohas');
    doesTail.callCount.should.equal(6);
  });

  it( 'should only apply to the destination state', function () {
    var spy = sinon.spy();
    salt = new Salt({
      a: {
        _tail: '//c/'
      },
      b: {},
      c: spy
    });
    salt.go('//a/', '//b/');
    spy.should.not.have.been.called;
  });

  it( 'should treat `true` as a query to the tagged state', function () {
    var spy = sinon.spy();
    salt = new Salt({
      a: {
        _on: spy,
        _tail: true,
        b: {}
      }
    });

    salt.go('//a/');
    spy.should.have.been.calledOnce;
    spy.reset();

    salt.go('//a/b/');
    salt.state.path.should.equal('//a/');
  });

  it( 'should treat `false` as a bad query', function () {
    var spy = sinon.spy();
    salt = new Salt({
      a: {
        _tail: false,
        b: spy
      }
    });
    salt.go('//a/');
    salt.state.path.should.equal('//a/');
    spy.should.not.have.been.called;
  });

  it( 'should ignore ancestor settings', function () {
    salt = new Salt({
      a: {
        _tail: true,
        b:{
          c: {
            _tail: false
          },
          d: {
            _tail: '//e/'
          }
        }
      },
      e: {}
    });
    salt.go('//a/b/');
    salt.state.path.should.equal('//a/');

    salt.go('//a/b/c/');
    salt.state.path.should.equal('//a/b/c/');

    salt.go('//a/b/d/');
    salt.state.path.should.equal('//e/');
  });

  it( 'should allow tailing to the null state', function () {
    salt = new Salt({_tail: 0});
    salt.go(1);
    salt.state.path.should.equal('..//');
  });

  it( 'should allow for compounding redirects', function () {
    var spy = sinon.spy();
    salt = new Salt({
      a: {
        _tail: '//b/',
        _on: spy
      },
      b: {
        _tail: '//c/',
        _on: spy
      },
      c: spy
    });
    salt.go('//a/');
    salt.state.path.should.equal('//c/');
    spy.should.have.been.calledThrice;
  });

  it( 'should work when navigation is paused', function (done) {
    salt = new Salt({
      a: {
        _tail: '//b/',
        _on: function () {
          this.wait(0);
        }
      },
      b: done
    });
    salt.go('//a/');
  });

  it( 'should work when navigation is pinned', function (done) {
    var pinner = new Salt(function () {
      this.wait(0);
    });
    salt = new Salt({
      a: {
        _tail: '//b/',
        _on: function () {
          pinner.go(1);
        }
      },
      b: done
    });
    salt.go('//a/');
    salt.status().pinned.should.equal(true);
    salt.state.path.should.equal('//a/');
    pinner.go();
  });

});