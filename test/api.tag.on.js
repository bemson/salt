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

});