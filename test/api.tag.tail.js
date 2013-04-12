describe( '_tail tag', function () {
  
  var flow;

  it( 'should redirect when navigation ends in a tagged branch', function () {
    flow = new Flow({
      a: {
        _tail: '@next',
        b: {}
      },
      c: {}
    });
    flow.go('//a/');
    flow.status().path.should.equal('//c/');
    flow.go('//a/b/');
    flow.status().path.should.equal('//c/');
  });

  it( 'should not redirect when redirecting to, and stopping on, the tagged state', function () {
    var spy = sinon.spy();
    flow = new Flow({
      a: {
        _tail: '.',
        _on: spy
      }
    });
    flow.go('//a/');
    spy.should.have.been.calledOnce;
  });

  it( 'should not redirect when targeting within the tagged branch', function () {
    var spy = sinon.spy();
    flow = new Flow({
      a: {
        _tail: 'b',
        b: spy
      }
    });
    flow.go('//a/');
    flow.status().path.should.equal('//a/');
    spy.should.not.have.been.called;
  });

  it( 'should not redirect when given a bad query', function () {
    var spy = sinon.spy();
    flow = new Flow({
      a: {
        _tail: 'foo',
        b: spy
      }
    });
    flow.go('//a/');
    flow.status().path.should.equal('//a/');
    spy.should.not.have.been.called;
  });

  it( 'should only apply to the destination state', function () {
    var spy = sinon.spy();
    flow = new Flow({
      a: {
        _tail: '//c/'
      },
      b: {},
      c: spy
    });
    flow.go('//a/', '//b/');
    spy.should.not.have.been.called;
  });

  it( 'should treat `true` as a query to the tagged state', function () {
    var spy = sinon.spy();
    flow = new Flow({
      a: {
        _on: spy,
        _tail: true,
        b: {}
      }
    });

    flow.go('//a/');
    spy.should.have.been.calledOnce;
    spy.reset();

    flow.go('//a/b/');
    flow.status().path.should.equal('//a/');
  });

  it( 'should treat `false` as a bad query', function () {
    var spy = sinon.spy();
    flow = new Flow({
      a: {
        _tail: false,
        b: spy
      }
    });
    flow.go('//a/');
    flow.status().path.should.equal('//a/');
    spy.should.not.have.been.called;
  });

  it( 'should ignore ancestor settings', function () {
    flow = new Flow({
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
    flow.go('//a/b/');
    flow.status().path.should.equal('//a/');

    flow.go('//a/b/c/');
    flow.status().path.should.equal('//a/b/c/');

    flow.go('//a/b/d/');
    flow.status().path.should.equal('//e/');
  });

  it( 'should allow tailing to the null state', function () {
    flow = new Flow({_tail: 0});
    flow.go(1);
    flow.status().path.should.equal('..//');
  });

  it( 'should allow for compounding redirects', function () {
    var spy = sinon.spy();
    flow = new Flow({
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
    flow.go('//a/');
    flow.status().path.should.equal('//c/');
    spy.should.have.been.calledThrice;
  });

  it( 'should work when navigation is paused', function (done) {
    flow = new Flow({
      a: {
        _tail: '//b/',
        _on: function () {
          this.wait(0);
        }
      },
      b: done
    });
    flow.go('//a/');
  });

  it( 'should work when navigation is pended', function (done) {
    var pender = new Flow(function () {
      this.wait(0);
    });
    flow = new Flow({
      a: {
        _tail: '//b/',
        _on: function () {
          pender.go(1);
        }
      },
      b: done
    });
    flow.go('//a/');
    flow.status().pending.should.be.ok;
  });

});