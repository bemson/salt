describe( '_import tag', function () {

  var salt;

  it( 'should deep clone another program branch', function () {
    salt = new Salt({
      a: {
        c: {
          d: {}
        }
      },
      b: {
        _import: '//a/'
      }
    });
    salt.query('//b/c/d/').should.be.ok;
  });

  it( 'should deep clone an object reference', function () {
    var cPath = {
      c: {
        d: {}
      }
    };
    salt = new Salt({
      b: {
        _import: cPath
      }
    });
    salt.query('//b/c/d/').should.be.ok;
  });

  it( 'should deep clone a Salt instance', function () {
    var cSalt = new Salt({
      c: {
        d: {}
      }
    });
    salt = new Salt({
      b: {
        _import: cSalt
      }
    });
    salt.query('//b/c/d/').should.be.ok;
  });

  it( 'should support descendent imports', function () {
    salt = new Salt({
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
    salt.query('//a/b/c/').should.be.ok;
  });

  it( 'should assume an imported function is the _on callback', function () {
    var
      inSpy = sinon.spy(),
      onSpy = sinon.spy()
    ;
    salt = new Salt({
      a: {
        _import: '//b/',
        _in: inSpy
      },
      b: onSpy
    });
    salt.go('//a/');
    inSpy.should.have.been.calledOnce;
    onSpy.should.have.been.calledOnce;
    inSpy.should.have.been.calledBefore(onSpy);
  });

  it( 'should assume an imported (short-form) function is the _on callback', function () {
    var spy = sinon.spy();
    salt = new Salt({
      a: '//b/',
      b: spy
    });
    salt.go('//a');
    spy.should.have.been.calledOnce;
  });

  it( 'should support same-state imports', function () {
    salt = new Salt({
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
    salt.query('//c/c/d/').should.be.ok;
  });

  it( 'should only work with a full program path', function () {
    salt = new Salt({
      a: {
        c: {}
      },
      b: {
        _import: '@previous'
      }
    });
    salt.query('//b/c/').should.not.be.ok;
  });

  it( 'should let the tagged state override imported descendants', function () {
    var onSpy = sinon.spy();
    salt = new Salt({
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
    salt.query('//jail/punish/taze').should.be.ok;
    salt.go('//jail');
    salt.query('//').should.not.be.ok;
    onSpy.should.have.been.calledOnce;
  });

  it( 'should use a short-form string paired directly to a program state', function () {
    salt = new Salt({
      a: {
        c: '//j/'
      },
      b: '//a/',
      c: '//b/',
      j: {
        d: {}
      }
    });
    salt.query('//c/c/d/').should.be.ok;
  });

  it( 'should prepend imported states', function () {
    var
      aSpy = sinon.spy(),
      bSpy = sinon.spy()
    ;
    salt = new Salt({
      alphabet: {
        _sequence: 1,
        a: aSpy,
        _import: '//secondletter/'
      },
      secondletter: {
        b: bSpy
      }
    });
    salt.go('//alphabet');
    aSpy.should.have.been.calledOnce;
    bSpy.should.have.been.calledOnce;
    bSpy.should.have.been.calledBefore(aSpy);
  });

});