describe( 'Navigation', function () {

  var
    salt,
    inSpy,
    onSpy,
    outSpy,
    overSpy,
    boverSpy
  ;

  beforeEach(function () {
    inSpy = sinon.spy();
    onSpy = sinon.spy();
    outSpy = sinon.spy();
    overSpy = sinon.spy();
    boverSpy = sinon.spy();
  });

  it( 'should trigger callbacks', function () {
    salt = new Salt({
      _in: inSpy,
      _on: onSpy,
      _out: outSpy
    });
    salt.go(1, 0);

    inSpy.should.have.been.calledOnce;
    onSpy.should.have.been.calledOnce;
    outSpy.should.have.been.calledOnce;
    inSpy.should.have.been.calledBefore(onSpy);
    onSpy.should.have.been.calledBefore(outSpy);
  });

  describe( 'blocking', function () {

    it( 'should occur via `.wait()`', function () {
      salt = new Salt({
        _in: function () {
          this.wait();
          inSpy();
        },
        _on: onSpy
      });
      salt.go(1);

      inSpy.should.have.been.calledOnce;
      onSpy.should.not.have.been.calledOnce;
    });

    it( 'should resume via `.go()`', function () {
      salt = new Salt({
        _in: function () {
          this.wait();
          inSpy();
        },
        _on: onSpy
      });
      salt.go(1);

      inSpy.should.have.been.calledOnce;
      onSpy.should.not.have.been.calledOnce;

      salt.go();
      onSpy.should.have.been.calledOnce;
    });

    it( 'should resume via `.get()`', function () {
      salt = new Salt({
        _in: function () {
          this.wait();
          inSpy();
        },
        _on: onSpy
      });
      salt.go(1);

      inSpy.should.have.been.calledOnce;
      onSpy.should.not.have.been.calledOnce;

      salt.get(1);
      onSpy.should.have.been.calledOnce;
    });

    describe( 'with redirects', function () {

      // bemson/fedtools issue #1
      it( 'should work when exiting a state', function () {

        salt = new Salt({
          a: {
            _tail: 0,
            _out: function () {
              this.wait();
            }
          },
          b: {
            _in: inSpy,
            _on: onSpy,
            _out: outSpy
          }
        });

        salt.go('//a/');
        salt.status('paused').should.be.ok;
        salt.state.name.should.equal('a');

        salt.go('//b/');
        inSpy.should.have.been.calledOnce;
        onSpy.should.have.been.calledOnce;
        outSpy.should.have.been.calledOnce;
      });

      it( 'should work when enteringa state', function () {

        salt = new Salt({
          a: {
            _in: function () {
              this.wait();
            },
            _out: outSpy
          },
          b: {
            _in: inSpy,
            _on: onSpy
          }
        });

        salt.go('//a/');
        salt.status('paused').should.be.ok;
        salt.state.name.should.equal('a');

        salt.go('//b/');
        inSpy.should.have.been.calledOnce;
        onSpy.should.have.been.calledOnce;
        outSpy.should.have.been.calledOnce;
      });

      it( 'should work when on state', function () {

        salt = new Salt({
          a: function () {
            this.wait();
          },
          b: {
            _in: inSpy,
            _on: onSpy
          }
        });

        salt.go('//a/');
        salt.status('paused').should.be.ok;
        salt.state.name.should.equal('a');

        salt.get('//b/');
        inSpy.should.have.been.calledOnce;
        onSpy.should.have.been.calledOnce;
      });

    });

  });

  describe( 'destination', function () {

  });

  describe( 'waypoint', function () {

  });

  describe( 'route', function () {

  });

  describe( 'pinning', function () {

  });

});