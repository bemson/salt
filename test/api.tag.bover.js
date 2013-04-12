describe( '_bover tag', function () {

  var flow;

  it( 'should execute the given function when a state is bypassed for younger sibling states', function () {
    var spy = sinon.spy();
    flow = new Flow({
      a: {
        _bover: spy
      },
      b: {}
    });
    flow.go('//b/', 0);
    spy.should.have.been.calledOnce;
  });

  it( 'should scope the given function to the Flow instance', function () {
    var spy = sinon.spy();
    flow = new Flow({
      a: {
        _bover: spy
      },
      b: {}
    });
    flow.go('//b/', 0);
    spy.should.have.been.calledOn(flow);
  });

  it( 'should navigate to the resolved state when paired with a query', function () {
    var spy = sinon.spy();
    flow = new Flow({
      _on: spy,
      a: {
        _bover: '@parent'
      },
      b: {}
    });
    flow.go('//b/', 0);
    spy.should.have.been.calledOnce;
  });

  it( 'should navigate queries as waypoints', function () {
    var spy = sinon.spy();
    flow = new Flow({
      a: {
        _bover: '@self',
        _on: spy
      },
      b: {}
    });
    flow.go('//b/', 0);
    spy.should.have.been.calledOnce;
    flow.status().path.should.equal('..//');
  });

  it( 'should not invoke if _out redirects from an older to a younger sibling state', function () {
    var spy = sinon.spy();
    flow = new Flow({
      scenario: {
        _root: true,
        _on: 'start',
        younger: {
          _in: function () {
            this.target('.');
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
    flow.go('//scenario');
    flow.status().path.should.equal('//scenario/younger/');
    spy.should.not.have.been.called;
  });

  it( 'should invoke if _over redirects toward a younger sibling state', function () {
    var spy = sinon.spy();
    flow = new Flow({
      scenario: {
        _root: true,
        _on: 'older',
        younger: {
          _in: function () {
            this.target('.');
          }
        },
        test: {
          _bover: spy,
          _over: '/younger'
        },
        older: {}
      }
    });
    flow.go('//scenario');
    spy.should.have.been.calledOnce;
    flow.status().path.should.equal('//scenario/younger/');
  });

  it( 'should cause an infinite sequence when a query points to an older/descendent state', function () {
    var spy = sinon.spy(function () {
        if (this.status().loops > 100) {
          this.target('//b/');
        }
      })
    ;
    flow = new Flow({
      a: {
        _bover: '//c/'
      },
      b: {},
      c: spy
    });
    flow.go('//b/', 0);
    spy.callCount.should.equal(102);
  });

});
