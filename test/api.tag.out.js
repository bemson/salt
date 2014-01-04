describe( '_out tag', function () {

  var flow;

  it( 'should execute the given function when a state is exited', function () {
    var spy = sinon.spy();
    flow = new Flow({
      _out: spy
    });
    flow.go(1, 0);
    spy.should.have.been.calledOnce;
  });

  it( 'should scope the given function to the Flow instance', function () {
    var spy = sinon.spy();
    flow = new Flow({
      _out: spy
    });
    flow.go(1, 0);
    spy.should.have.been.calledOn(flow);
  });

  describe( 'redirects', function () {

    it( 'should navigate to the resolved state', function () {
      var spy = sinon.spy();
      flow = new Flow({
        a: {
          _out: '@next'
        },
        b: spy
      });
      flow.go('//a/', 1);
      spy.should.have.been.calledOnce;
      flow.state.path.should.equal('//');
    });

    it( 'should navigate queries as waypoints', function () {
      var spy = sinon.spy();
      flow = new Flow({
        a: {
          _out: '@next'
        },
        c: spy
      });
      flow.go('//a/', 1);
      spy.should.have.been.calledOnce;
      flow.state.path.should.equal('//');
    });

    it( 'should cause an infinite sequence when targeting within the branch', function () {
      var spy = sinon.spy();
      flow = new Flow({
        _out: '//a/',
        a: {
          _on: function () {
            if (this.status().loops > 100) {
              this.target('stop');
            }
            spy();
          },
          stop: {}
        }
      });
      flow.go(1, 0);
      spy.callCount.should.equal(102);
    });

    describe( 'prefixed with ">"', function () {

      it( 'should not cause an infinite sequence when targeting within the branch', function () {
        var spy = sinon.spy();
        flow = new Flow({
          _out: '>//a/',
          a: {
            _on: function () {
              if (this.status().loops > 100) {
                this.target('stop');
              }
              spy();
            },
            stop: {}
          }
        });
        flow.go(1, 0);
        spy.callCount.should.equal(1);
      });

      it( 'should set new destination state', function () {
        var Bspy = sinon.spy();

        flow = new Flow({
          _out: '>a/b',
          a: {
            b: Bspy
          }
        });
        flow.go(1, 0);

        Bspy.should.have.been.calledOnce;
        flow.state.path.should.equal('//a/b/');
      });

      it( 'should pass-thru arguments', function () {
        var
          Bspy = sinon.spy(),
          arg1 = {},
          arg2 = {}
        ;
        flow = new Flow({
          _out: '>a/b',
          _on: function () {
            this.target(0, arg1, arg2);
          },
          a: {
            b: Bspy
          }
        });
        flow.go(1);

        Bspy.should.have.been.calledOnce;
        Bspy.should.have.been.calledWith(arg1, arg2);
        flow.state.path.should.equal('//a/b/');
      });

    });

  });

});