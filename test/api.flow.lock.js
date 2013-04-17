describe( 'Flow#lock()', function () {

  var flow;

  it( 'should return the locked status if no arguments', function () {
    var
      spy = sinon.spy(function () {
        var locked = this.lock();
        locked.should.be.a('boolean');
        locked.should.equal(false);
      }),
      jailSpy = sinon.spy(function () {
        this.lock().should.equal(true);
      })
    ;
    flow = new Flow({
      _on: spy,
      jail: {
        _lock: true,
        _on: jailSpy
      }
    });
    flow.lock().should.equal(false);
    flow.go(1, '//jail/');
    spy.should.have.been.calledOnce;
    jailSpy.should.have.been.calledOnce;
  });

  it( 'should return `true` when setting the lock state', function () {
    var spy = sinon.spy(function () {
      this.lock().should.equal(false);
      this.lock(1).should.equal(true);
      this.lock().should.equal(true);
      this.lock(0).should.equal(true);
      this.lock().should.equal(false);
    });
    flow = new Flow(spy);
    flow.go(1);
    spy.should.have.been.calledOnce;
    flow.go(0).should.be.ok;
  });

  it( 'should lock an instance with a truthy value', function () {
    var spy = sinon.spy(function () {
      this.lock().should.equal(false);
      this.lock(1);
      this.lock().should.equal(true);
    });
    flow = new Flow(spy);
    flow.go(1);
    spy.should.have.been.calledOnce;
    flow.go(0).should.not.be.ok;
  });

  it( 'should unlock an instance with a falsy value', function () {
    var spy = sinon.spy(function () {
      this.lock(1);
      this.lock().should.equal(true);
      this.lock(0);
      this.lock().should.equal(false);
    });
    flow = new Flow(spy);
    flow.go(1);
    spy.should.have.been.calledOnce;
    flow.go(0).should.be.ok;
  });

  it( 'should return false when setting the lock externally', function () {
    flow = new Flow();
    flow.lock(1).should.equal(false);
    flow.lock().should.equal(false);
    flow.lock(0).should.equal(false);
    flow.lock().should.equal(false);
  });


});