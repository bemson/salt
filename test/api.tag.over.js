describe( '_over tag', function () {

  var flow;

  it( 'should execute the given function when a state is bypassed for older sibling states', function () {
    var spy = sinon.spy();
    flow = new Flow({
      a: {
        _over: spy
      },
      b: {}
    });
    flow.go('//b/');
    spy.should.have.been.calledOnce;
  });

  it( 'should scope the given function to the Flow instance', function () {
    var spy = sinon.spy();
    flow = new Flow({
      a: {
        _over: spy
      },
      b: {}
    });
    flow.go('//b/');
    spy.should.have.been.calledOn(flow);
  });

  it( 'should navigate to the resolved state when paired with a query', function () {
    var spy = sinon.spy();
    flow = new Flow({
      a: {
        _over: '//d/'
      },
      b: {},
      d: spy
    });
    flow.go('//b/');
    spy.should.have.been.calledOnce;
  });

  it( 'should navigate queries as waypoints', function () {
    var spy = sinon.spy();
    flow = new Flow({
      a: {
        _over: '@self',
        _on: spy
      },
      b: {}
    });
    flow.go('//b/');
    spy.should.have.been.calledOnce;
    flow.state.path.should.equal('//b/');
  });

  it( 'should not invoke if _out redirects from a younger to an older sibling state', function () {
    var spy = sinon.spy();
    flow = new Flow({
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
            this.target('.');
          }
        }
      }
    });
    flow.go('//scenario');
    flow.state.path.should.equal('//scenario/older/');
    spy.should.not.have.been.called;
  });

  it( 'should invoke if _bover redirects toward an older sibling state', function () {
    var spy = sinon.spy();
    flow = new Flow({
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
            this.target('.');
          }
        }
      }
    });
    flow.go('//scenario');
    spy.should.have.been.calledTwice;
    flow.state.path.should.equal('//scenario/older/');
  });

  it( 'should cause an infinite sequence when a query points to a younger/ancestor state', function () {
    var spy = sinon.spy(function () {
        if (this.status().loops > 100) {
          this.target(0);
        }
      })
    ;
    flow = new Flow({
      _on: spy,
      a: {
        _over: '@parent'
      },
      b: {}
    });
    flow.go('//b/');
    spy.callCount.should.equal(102);
  });

});
