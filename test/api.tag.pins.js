describe( '_pendable tag', function () {

  var flow;

  it( 'should be reflected as a boolean in the `.state.pendable`', function () {
    flow = new Flow();
    flow.state.should.haveOwnProperty('pendable');
    flow.state.pendable.should.be.a('boolean');
  });

  it( 'should be `true` by default', function () {
    flow = new Flow();
    flow.state.pendable.should.equal(true);
  });

  it( 'should halt navigation of a waiting instance, when the active state pauses', function () {
    var
      penderSpy = sinon.spy(),
      pendableSpy = sinon.spy(),
      pender = new Flow({
        _in: function () {
          this.wait();
        },
        _on: penderSpy
      }),
      pendable = new Flow({
        _in: function () {
          pender.go(1);
        },
        _on: pendableSpy
      })
    ;
    pendable.go(1);

    pender.status('paused').should.equal(true);
    pender.status('pending').should.equal(false);

    pendable.status('paused').should.equal(false);
    pendable.status('pending').should.equal(true);

    pender.go();

    pendableSpy.should.have.been.calledOnce;
    penderSpy.should.have.been.calledOnce;
    pendableSpy.should.have.been.calledAfter(penderSpy);
  });

  it( 'should not halt navigation when either the parent or active state are false', function () {
    var
      penderSpy = sinon.spy(),
      unpendableSpy = sinon.spy(),
      pender = new Flow({
        _in: function () {
          this.wait();
        },
        _on: penderSpy
      }),
      unpendable = new Flow({
        _pendable: 0,
        _in: function () {
          pender.go(1);
        },
        _on: unpendableSpy
      })
    ;
    unpendable.go(1);

    pender.status('paused').should.equal(true);
    pender.status('pending').should.equal(false);

    unpendable.status('paused').should.equal(false);
    unpendable.status('pending').should.equal(false);

    pender.go();

    unpendableSpy.should.have.been.calledOnce;
    penderSpy.should.have.been.calledOnce;
    unpendableSpy.should.have.been.calledBefore(penderSpy);
  });


});