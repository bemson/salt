describe( '_import tag', function () {

  var flow;

  it( 'should deep clone another program branch', function () {
    flow = new Flow({
      a: {
        c: {
          d: {}
        }
      },
      b: {
        _import: '//a/'
      }
    });
    flow.query('//b/c/d/').should.be.ok;
  });

  it( 'should support descendent imports', function () {
    flow = new Flow({
      a: {
        _import: '//x/'
      },
      x: {
        b: {
          _import: '//y/'
        }
      },
      y: {
        c: {}
      }
    });
    flow.query('//a/b/c/').should.be.ok;
  });

  it( 'should assume an imported function as the _on callback', function () {
    var
      inSpy = sinon.spy(),
      onSpy = sinon.spy()
    ;
    flow = new Flow({
      a: {
        _import: '//x/',
        _in: inSpy
      },
      x: onSpy
    });
    flow.query('//a/').should.be.ok;
    flow.go('//a/');
    inSpy.should.have.been.calledOnce;
    onSpy.should.have.been.calledOnce;
  });

  it( 'should support same-state imports', function () {
    flow = new Flow({
      a: {
        c: {
          d: {}
        }
      },
      b: {
        _import: '//a/'
      },
      c: {
        _import: '//b/'
      }
    });
    flow.query('//c/c/d/').should.be.ok;
  });

  it( 'should only work with a full program path', function () {
    flow = new Flow({
      a: {
        c: {}
      },
      b: {
        _import: '@previous'
      }
    });
    flow.query('//b/c/').should.not.be.ok;
  });

  it( 'should let the tagged state override imported descendants', function () {
    var onSpy = sinon.spy();
    flow = new Flow({
      jail: {
        _import: '//arrest/',
        _restrict: 1,
        _on: onSpy,
        punish: {
          solitary: {}
        }
      },
      arrest: {
        _restrict: 0,
        punish: {
          taze: {}
        }
      }
    });
    flow.query('//jail/punish/taze').should.be.ok;
    flow.go('//jail');
    flow.query('//').should.not.be.ok;
    onSpy.should.have.been.calledOnce;
  });

  it( 'should use a short-form string paired directly to a program state', function () {
    flow = new Flow({
      a: {
        c: '//j/'
      },
      b: '//a/',
      c: '//b/',
      j: {
        d: {}
      }
    });
    flow.query('//c/c/d/').should.be.ok;
  });

  it( 'should prepend imported states', function () {
    var
      aSpy = sinon.spy(),
      bSpy = sinon.spy()
    ;
    flow = new Flow({
      alphabet: {
        _sequence: 1,
        a: aSpy,
        _import: '//secondletter/'
      },
      secondletter: {
        b: bSpy
      }
    });
    flow.go('//alphabet');
    aSpy.should.have.been.calledOnce;
    bSpy.should.have.been.calledOnce;
    bSpy.should.have.been.calledBefore(aSpy);
  });

});