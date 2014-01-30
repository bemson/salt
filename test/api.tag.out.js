describe( '_out tag', function () {

  var salt;

  it( 'should execute the given function when a state is exited', function () {
    var spy = sinon.spy();
    salt = new Salt({
      _out: spy
    });
    salt.go(1, 0);
    spy.should.have.been.calledOnce;
  });

  it( 'should scope the given function to the Salt instance', function () {
    var spy = sinon.spy();
    salt = new Salt({
      _out: spy
    });
    salt.go(1, 0);
    spy.should.have.been.calledOn(salt);
  });

  describe( 'redirects', function () {

    it( 'should navigate to the resolved state', function () {
      var spy = sinon.spy();
      salt = new Salt({
        a: {
          _out: '@next'
        },
        b: spy
      });
      salt.go('//a/', 1);
      spy.should.have.been.calledOnce;
      salt.state.path.should.equal('//');
    });

    it( 'should navigate queries as waypoints', function () {
      var spy = sinon.spy();
      salt = new Salt({
        a: {
          _out: '@next'
        },
        c: spy
      });
      salt.go('//a/', 1);
      spy.should.have.been.calledOnce;
      salt.state.path.should.equal('//');
    });

    it( 'should cause an infinite sequence when targeting within the branch', function () {
      var spy = sinon.spy();
      salt = new Salt({
        _out: '//a/',
        a: {
          _on: function () {
            if (this.status().loops > 100) {
              this.get('stop');
            }
            spy();
          },
          stop: {}
        }
      });
      salt.go(1, 0);
      spy.callCount.should.equal(102);
    });

    describe( 'prefixed with ">"', function () {

      it( 'should not cause an infinite sequence when targeting within the branch', function () {
        var spy = sinon.spy();
        salt = new Salt({
          _out: '>//a/',
          a: {
            _on: function () {
              if (this.status().loops > 100) {
                this.get('stop');
              }
              spy();
            },
            stop: {}
          }
        });
        salt.go(1, 0);
        spy.callCount.should.equal(1);
      });

      it( 'should set new destination state', function () {
        var Bspy = sinon.spy();

        salt = new Salt({
          _out: '>a/b',
          a: {
            b: Bspy
          }
        });
        salt.go(1, 0);

        Bspy.should.have.been.calledOnce;
        salt.state.path.should.equal('//a/b/');
      });

      it( 'should pass-thru arguments', function () {
        var
          Bspy = sinon.spy(),
          arg1 = {},
          arg2 = {}
        ;
        salt = new Salt({
          _out: '>a/b',
          _on: function () {
            this.get(0, arg1, arg2);
          },
          a: {
            b: Bspy
          }
        });
        salt.go(1);

        Bspy.should.have.been.calledOnce;
        Bspy.should.have.been.calledWith(arg1, arg2);
        salt.state.path.should.equal('//a/b/');
      });

    });

  });

});