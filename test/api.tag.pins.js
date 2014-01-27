describe( '_pins tag', function () {

  var salt;

  it( 'should be reflected as a boolean in the `.state.pins`', function () {
    salt = new Salt();
    salt.state.should.haveOwnProperty('pins');
    salt.state.pins.should.be.a('boolean');
  });

  it( 'should be `true` by default', function () {
    salt = new Salt();
    salt.state.pins.should.equal(true);
  });

  it( 'should halt navigation of a waiting instance, when the active state pauses', function () {
    var
      pinnerSpy = sinon.spy(),
      pinsSpy = sinon.spy(),
      pinner = new Salt({
        _in: function () {
          this.wait();
        },
        _on: pinnerSpy
      }),
      pins = new Salt({
        _in: function () {
          pinner.go(1);
        },
        _on: pinsSpy
      })
    ;
    pins.go(1);

    pinner.status('paused').should.equal(true);
    pinner.status('pinned').should.equal(false);

    pins.status('paused').should.equal(false);
    pins.status('pinned').should.equal(true);

    pinner.go();

    pinsSpy.should.have.been.calledOnce;
    pinnerSpy.should.have.been.calledOnce;
    pinsSpy.should.have.been.calledAfter(pinnerSpy);
  });

  it( 'should not halt navigation when either the parent or active state are false', function () {
    var
      pinnerSpy = sinon.spy(),
      unpinsSpy = sinon.spy(),
      pinner = new Salt({
        _in: function () {
          this.wait();
        },
        _on: pinnerSpy
      }),
      unpins = new Salt({
        _pins: 0,
        _in: function () {
          pinner.go(1);
        },
        _on: unpinsSpy
      })
    ;
    unpins.go(1);

    pinner.status('paused').should.equal(true);
    pinner.status('pinned').should.equal(false);

    unpins.status('paused').should.equal(false);
    unpins.status('pinned').should.equal(false);

    pinner.go();

    unpinsSpy.should.have.been.calledOnce;
    pinnerSpy.should.have.been.calledOnce;
    unpinsSpy.should.have.been.calledBefore(pinnerSpy);
  });


});