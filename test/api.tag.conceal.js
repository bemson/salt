describe( '_conceal tag', function () {

  var flow;

  it( 'should prevent external access to a program branch', function () {
    flow = new Flow({
      foo: {
        _conceal: 1
      },
      zee: {}
    });
    flow.go('//').should.be.ok;
    flow.go('//foo').should.not.be.ok;
    flow.go('//zee').should.be.ok;
  });

  it( 'should allow external access to a concealed branch', function () {
    flow = new Flow({
      foo: {
        _conceal: 1,
        bar: {
          _conceal: 0
        }
      }
    });
    flow.go('//').should.be.ok;
    flow.go('//foo').should.not.be.ok;
    flow.go('//foo/bar').should.be.ok;
  });

  it( 'should have no impact on internal/trusted queries', function () {
    var spy = sinon.spy();
    flow = new Flow({
      _on: 'foo',
      foo: {
        _conceal: 1,
        _on: spy
      }
    });
    flow.go('//foo').should.not.be.ok;
    flow.go('//');
    spy.should.have.been.calledOnce;
  });

  it( 'should have no impact when falsy', function () {
    flow = new Flow({
      foo: {
        _conceal: false,
        bar: {
          _conceal: 0
        }
      }
    });
    flow.go('//').should.be.ok;
    flow.go('//foo').should.be.ok;
    flow.go('//foo/bar').should.be.ok;
  });

  it( 'should be ignored by the program root', function () {
    flow = new Flow({
      _conceal: 1,
      foo: {}
    });
    flow.query('//').should.be.ok;
    flow.query('//foo').should.be.ok;
  });

});