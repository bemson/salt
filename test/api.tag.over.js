describe( '_over tag', function () {

  var salt;

  it( 'should execute the given function when a state is bypassed for older sibling states', function () {
    var spy = sinon.spy();
    salt = new Salt({
      a: {
        _over: spy
      },
      b: {}
    });
    salt.go('//b/');
    spy.should.have.been.calledOnce;
  });

  it( 'should scope the given function to the Salt instance', function () {
    var spy = sinon.spy();
    salt = new Salt({
      a: {
        _over: spy
      },
      b: {}
    });
    salt.go('//b/');
    spy.should.have.been.calledOn(salt);
  });

  describe( 'redirects', function () {

    it( 'should navigate to the resolved state', function () {
      var spy = sinon.spy();
      salt = new Salt({
        a: {
          _over: '//d/'
        },
        b: {},
        d: spy
      });
      salt.go('//b/');
      spy.should.have.been.calledOnce;
    });

    it( 'should navigate queries as waypoints', function () {
      var spy = sinon.spy();
      salt = new Salt({
        a: {
          _over: '@self',
          _on: spy
        },
        b: {}
      });
      salt.go('//b/');
      spy.should.have.been.calledOnce;
      salt.state.path.should.equal('//b/');
    });

    it( 'should not invoke if _out redirects from a younger to an older sibling state', function () {
      var spy = sinon.spy();
      salt = new Salt({
        scenario: {
          _root: true,
          _on: 'start',
          younger: {},
          start: {
            _out: '/older',
            _on: '/younger',
            _over: spy
          },
          older: {
            _in: function () {
              this.get('.');
            }
          }
        }
      });
      salt.go('//scenario');
      salt.state.path.should.equal('//scenario/older/');
      spy.should.not.have.been.called;
    });

    it( 'should invoke if _bover redirects toward an older sibling state', function () {
      var spy = sinon.spy();
      salt = new Salt({
        scenario: {
          _root: true,
          _on: 'start',
          younger: {},
          test: {
            _over: spy,
            _bover: '/older'
          },
          start: {
            _on: '/younger'
          },
          older: {
            _in: function () {
              this.get('.');
            }
          }
        }
      });
      salt.go('//scenario');
      spy.should.have.been.calledTwice;
      salt.state.path.should.equal('//scenario/older/');
    });

    it( 'should cause an infinite sequence when pointing to a younger/ancestor state', function () {
      var spy = sinon.spy();
      salt = new Salt({
        _on: function () {
          if (this.status().loops > 100) {
            this.get(0);
          }
          spy();
        },
        a: {
          _over: '@parent'
        },
        b: {}
      });
      salt.go('//b/');
      spy.callCount.should.equal(102);
    });

    describe( 'prefixed with ">"', function () {

      it( 'should not cause an infinite sequence when pointing to a younger/ancestor state', function () {
        var spy = sinon.spy();
        salt = new Salt({
          _on: function () {
            if (this.status().loops > 100) {
              this.get(0);
            }
            spy();
          },
          a: {
            _over: '>@parent'
          },
          b: {}
        });
        salt.go('//b/');
        spy.callCount.should.equal(1);
      });

      it( 'should set new destination state', function () {
        var
          Bspy = sinon.spy(),
          Cspy = sinon.spy()
        ;
        salt = new Salt({
          a: {
            _over: '>//c'
          },
          b: Bspy,
          c: Cspy
        });
        salt.go('//b');

        Bspy.should.not.have.been.called;
        Cspy.should.have.been.calledOnce;
        salt.state.path.should.equal('//c/');
      });

      it( 'should pass-thru arguments', function () {
        var
          Bspy = sinon.spy(),
          Cspy = sinon.spy(),
          arg1 = {},
          arg2 = {}
        ;
        salt = new Salt({
          a: {
            _over: '>//c'
          },
          b: Bspy,
          c: Cspy
        });
        salt.get('//b', arg1, arg2);

        Bspy.should.not.have.been.called;
        Cspy.should.have.been.calledOnce;
        Cspy.should.have.been.calledWith(arg1, arg2);
        salt.state.path.should.equal('//c/');
      });

    });

  });

});
