describe( '_in tag', function () {
  
  var flow;

  it( 'should execute the given function when a state is entered', function () {
    var spy = sinon.spy();
    flow = new Flow({
      _in: spy
    });
    flow.go(1, 0);
    spy.should.have.been.calledOnce;
  });

  it( 'should scope the given function to the Flow instance', function () {
    var spy = sinon.spy();
    flow = new Flow({
      _in: spy
    });
    flow.go(1);
    spy.should.have.been.calledOn(flow);
  });

  describe('redirects', function () {

    it( 'should navigate to the resolved state when paired with a query', function () {
      var spy = sinon.spy();
      flow = new Flow({
        _in: '@child',
        b: spy
      });
      flow.go('//');
      spy.should.have.been.calledOnce;
      flow.state.path.should.equal('//');
    });

    it( 'should cause an infinite sequence when pointing outside a state', function () {
      var spy = sinon.spy();
      flow = new Flow({
        _on: function () {
          if (this.status().loops > 100) {
            this.target(0);
          }
          spy();
        },
        a: {
          _in: '@parent'
        }
      });
      flow.go('//a/');
      spy.callCount.should.equal(102);
    });

    it( 'should navigate queries as waypoints', function () {
      var spy = sinon.spy();
      flow = new Flow({
        _in: '@child/@oldest',
        a: {},
        c: spy
      });
      flow.go('//a/');
      spy.should.have.been.calledOnce;
      flow.state.path.should.equal('//a/');
    });

    describe( 'prefixed with ">"', function () {

      it( 'should set new destination state', function () {
        var
          spy = sinon.spy(),
          Bspy = sinon.spy()
        ;
        flow = new Flow({
          _in: '>a/b',
          _on: spy,
          a: {
            b: Bspy
          }
        });
        flow.go(1);

        spy.should.not.have.been.called;
        Bspy.should.have.been.calledOnce;
        flow.state.path.should.equal('//a/b/');
      });

      it( 'should pass-thru arguments', function () {
        var
          spy = sinon.spy(),
          Bspy = sinon.spy(),
          arg1 = {},
          arg2 = {}
        ;
        flow = new Flow({
          _in: '>a/b',
          _on: spy,
          a: {
            b: Bspy
          }
        });
        flow.target(1, arg1, arg2);

        spy.should.not.have.been.called;
        Bspy.should.have.been.calledOnce;
        Bspy.should.have.been.calledWith(arg1, arg2);
        flow.state.path.should.equal('//a/b/');
      });

    });

  });

});