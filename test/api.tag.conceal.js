describe( '_conceal tag', function () {

  var salt;

  it( 'should prevent external access to a program branch', function () {
    salt = new Salt({
      foo: {
        _conceal: 1
      },
      zee: {}
    });
    salt.go('//').should.be.ok;
    salt.go('//foo').should.not.be.ok;
    salt.go('//zee').should.be.ok;
  });

  it( 'should allow external access to a concealed branch', function () {
    salt = new Salt({
      foo: {
        _conceal: 1,
        bar: {
          _conceal: 0
        }
      }
    });
    salt.go('//').should.be.ok;
    salt.go('//foo').should.not.be.ok;
    salt.go('//foo/bar').should.be.ok;
  });

  it( 'should have no impact on internal/trusted queries', function () {
    var spy = sinon.spy();
    salt = new Salt({
      _on: 'foo',
      foo: {
        _conceal: 1,
        _on: spy
      }
    });
    salt.go('//foo').should.not.be.ok;
    salt.go('//');
    spy.should.have.been.calledOnce;
  });

  it( 'should have no impact when falsy', function () {
    salt = new Salt({
      foo: {
        _conceal: false,
        bar: {
          _conceal: 0
        }
      }
    });
    salt.go('//').should.be.ok;
    salt.go('//foo').should.be.ok;
    salt.go('//foo/bar').should.be.ok;
  });

  it( 'should be ignored by the program root', function () {
    salt = new Salt({
      _conceal: 1,
      foo: {}
    });
    salt.query('//').should.be.ok;
    salt.query('//foo').should.be.ok;
  });

});