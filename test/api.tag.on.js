describe( '_on tag', function () {
  
  var flow;

  it( 'should execute the given function when a state is targeted', function () {
    var spy = sinon.spy();
    flow = new Flow({
      _on: spy
    });
    flow.go(1);
    spy.should.have.been.calledOnce;
  });

  it( 'should scope the given function to the Flow instance', function () {
    var spy = sinon.spy();
    flow = new Flow({
      _on: spy
    });
    flow.go(1);
    spy.should.have.been.calledOn(flow);
  });

  describe( 'redirects', function () {

    it( 'should navigate to the resolved state when paired with a query', function () {
      flow = new Flow({
        _on: '@child',
        b: {}
      });
      flow.go('//');
      flow.state.path.should.equal('//b/');
    });

    it( 'should navigate queries as waypoints', function () {
      var spy = sinon.spy();
      flow = new Flow({
        a: {
          _on: '@oldest'
        },
        b: {},
        c: spy
      });
      flow.go('//a/', '//b/');
      spy.should.have.been.calledOnce;
      flow.state.path.should.equal('//b/');
    });

    it( 'should not accept queries to the current state', function () {
      var spyTraverse = sinon.spy(Flow.pkg('core'), 'onTraverse');
      flow = new Flow({
        _on: '@self'
      });
      flow.go('//');
      spyTraverse.should.have.been.calledTwice;
      Flow.pkg('core').onTraverse.restore();
    });

    describe( 'prefixed with ">"', function () {

      it( 'should set new destination state', function () {
        var
          Cspy = sinon.spy(),
          Bspy = sinon.spy()
        ;
        flow = new Flow({
          _on: '>a/b',
          a: {
            b: Bspy
          },
          c: Cspy
        });
        flow.go(1, '//c/');

        Cspy.should.not.have.been.called;
        Bspy.should.have.been.calledOnce;
        flow.state.path.should.equal('//a/b/');
      });

      it( 'should pass-thru arguments', function () {
        var
          Cspy = sinon.spy(),
          Bspy = sinon.spy(),
          arg1 = {},
          arg2 = {}
        ;
        flow = new Flow({
          _on: '>a/b',
          a: {
            b: Bspy
          },
          c: Cspy
        });
        flow.target(1, arg1, arg2);

        Cspy.should.not.have.been.called;
        Bspy.should.have.been.calledOnce;
        Bspy.should.have.been.calledWith(arg1, arg2);
        flow.state.path.should.equal('//a/b/');
      });

    });

  });

});