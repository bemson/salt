describe( 'Tag _on', function () {
  
  var flow;

  it( 'should execute the given function when a state is targeted', function () {
    var spy = sinon.spy();
    flow = new Flow({
      _on: spy
    });
    flow.go(1);
    spy.should.have.been.calledOnce;
  });

  it( '', function () {
    var spy = sinon.spy();
    flow = new Flow({
      _on: spy
    });
    flow.go(1);
    spy.should.have.been.calledOn(flow);
  });

  it( 'should navigate to the resolved state when paired with a query', function () {
    flow = new Flow({
      _on: '@child'
      b: {}
    });
    flow.go('//');
    flow.status().path.should.equal('//b/');
  });

  it( 'should not navigate to queries for the current state', function () {
    var spyTraverse = sinon.spy(Flow.pkg('core').onTraverse);
    flow = new Flow({
      _on: '@self'
    });
    flow.go('//');
    spyTraverse.should.have.been.calledTwice;
  });

});