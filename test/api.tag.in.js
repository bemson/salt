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

  it( 'should cause an infinite sequence when a query points outside the state', function () {
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

});