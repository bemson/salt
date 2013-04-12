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

  it( 'should navigate to the resolved state when paired with a query', function () {
    var spy = sinon.spy();
    flow = new Flow({
      a: {
        _out: '@next'
      },
      b: spy
    });
    flow.go('//a/', 1);
    spy.should.have.been.calledOnce;
    flow.status().path.should.equal('//');
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
    flow.status().path.should.equal('//');
  });

  it( 'should cause an infinite sequence when a query points inside the state', function () {
    var
      spy = sinon.spy(function () {
        if (this.status().loops > 100) {
          this.target('stop');
        }
      })
    ;
    flow = new Flow({
      _out: '//a/',
      a: {
        _on: spy,
        stop: {}
      }
    });
    flow.go(1, 0);
    spy.callCount.should.equal(102);
  });

});