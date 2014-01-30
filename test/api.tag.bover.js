describe( '_bover tag', function () {

  var salt;

  it( 'should execute the given function when a state is bypassed for younger sibling states', function () {
    var spy = sinon.spy();
    salt = new Salt({
      a: {
        _bover: spy
      },
      b: {}
    });
    salt.go('//b/', 0);
    spy.should.have.been.calledOnce;
  });

  it( 'should scope the given function to the Salt instance', function () {
    var spy = sinon.spy();
    salt = new Salt({
      a: {
        _bover: spy
      },
      b: {}
    });
    salt.go('//b/', 0);
    spy.should.have.been.calledOn(salt);
  });

  describe( 'redirects', function () {

    it( 'should navigate to the resolved state', function () {
      var spy = sinon.spy();
      salt = new Salt({
        _on: spy,
        a: {
          _bover: '@parent'
        },
        b: {}
      });
      salt.go('//b/', 0);
      spy.should.have.been.calledOnce;
    });

    it( 'should navigate queries as waypoints', function () {
      var spy = sinon.spy();
      salt = new Salt({
        a: {
          _bover: '@self',
          _on: spy
        },
        b: {}
      });
      salt.go('//b/', 0);
      spy.should.have.been.calledOnce;
      salt.state.path.should.equal('..//');
    });

    it( 'should not invoke if _out redirects from an older to a younger sibling state', function () {
      var spy = sinon.spy();
      salt = new Salt({
        scenario: {
          _root: true,
          _on: 'start',
          younger: {
            _in: function () {
              this.get('.');
            }
          },
          start: {
            _out: '/younger',
            _on: '/older',
            _bover: spy
          },
          older: {}
        }
      });
      salt.go('//scenario');
      salt.state.path.should.equal('//scenario/younger/');
      spy.should.not.have.been.called;
    });

    it( 'should invoke if _over redirects toward a younger sibling state', function () {
      var spy = sinon.spy();
      salt = new Salt({
        scenario: {
          _root: true,
          _on: 'older',
          younger: {
            _in: function () {
              this.get('.');
            }
          },
          test: {
            _bover: spy,
            _over: '/younger'
          },
          older: {}
        }
      });
      salt.go('//scenario');
      spy.should.have.been.calledOnce;
      salt.state.path.should.equal('//scenario/younger/');
    });

    it( 'should cause an infinite sequence when pointing to an older/descendent state', function () {
      var spy = sinon.spy();
      salt = new Salt({
        a: {
          _bover: '//c/'
        },
        b: {},
        c: function () {
          if (this.status().loops > 100) {
            this.get('//b/');
          }
          spy();
        }
      });
      salt.go('//b/', 0);
      spy.callCount.should.equal(102);
    });

    describe( 'prefixed with ">"', function () {

      it( 'should not cause an infinite sequence when pointing to an older/descendent state', function () {
        var spy = sinon.spy();
        salt = new Salt({
          a: {
            _bover: '>//c/'
          },
          b: {},
          c: function () {
            if (this.status().loops > 100) {
              this.get('//b/');
            }
            spy();
          }
        });
        salt.go('//b/', 0);
        spy.callCount.should.equal(1);
      });

      it( 'should set new destination state', function () {
        var
          spy = sinon.spy(),
          Bspy = sinon.spy(),
          Jspy = sinon.spy()
        ;

        salt = new Salt({
          _on: spy,
          a: {
            _bover: '>//b'
          },
          c: {
            _on: '//'
          },
          b: Bspy,
          j: Jspy
        });
        salt.go('//c', '//j');

        spy.should.not.have.been.called;
        Jspy.should.not.have.been.called;
        // Bspy.should.have.been.calledOnce;
        // salt.state.path.should.equal('//b/');
      });

      it( 'should pass-thru arguments', function () {
        var
          Bspy = sinon.spy(),
          arg1 = {},
          arg2 = {}
        ;
        salt = new Salt({
          a: {
            _bover: '>//b'
          },
          c: {
            _on: '//',
          },
          b: Bspy
        });
        salt.get('//c', arg1, arg2);

        Bspy.should.have.been.calledOnce;
        Bspy.should.have.been.calledWith(arg1, arg2);
        salt.state.path.should.equal('//b/');
      });

    });

  });

});
