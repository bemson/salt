describe( 'Salt#vars', function () {

  var salt;

  it( 'should be a navigation-only member', function () {
    var
      spy = sinon.spy(),
      varsRef
    ;
    salt = new Salt({
      _in: function () {
        this.should.haveOwnProperty('vars');
        this.should.be.an('object');
        varsRef = this.vars;
      },
      _on: function () {
        this.vars.should.equal(varsRef);
        spy();
      }
    });
    salt.go(1);
    spy.should.have.been.calledOnce;
    salt.should.not.haveOwnProperty('vars');
  });

  it( 'should be an object', function () {
    var spy = sinon.spy();
    salt = new Salt(function () {
      this.vars.should.be.an('object');
      spy();
    });
    salt.go(1);
    spy.should.have.been.calledOnce;
  });

  it( 'should allow being set to an object', function () {
    var
      replacementObj = {},
      spy = sinon.spy()
    ;
    salt = new Salt({
      _in: function () {
        this.vars = replacementObj;
      },
      _on: function () {
        this.vars.should.equal(replacementObj);
        spy();
      }
    });
    salt.go(1);
    spy.should.have.been.calledOnce;
  });

  it( 'should restore itself when set to scalar values', function () {
    var
      value = {},
      spy = sinon.spy()
    ;
    salt = new Salt({
      _in: function () {
        this.vars.foo = value;
        this.vars = 'scalar value';
      },
      _on: function () {
        this.vars.should.be.an('object');
        this.vars.should.haveOwnProperty('foo');
        this.vars.foo.should.equal(value);
        spy();
      }
    });
    salt.go(1);
    spy.should.have.been.calledOnce;
  });

  it( 'should discard members after ending on the `null` state', function () {
    var spy = sinon.spy();
    salt = new Salt({
      _on: function () {
        this.vars.foo = 'bar';
      },
      check: function () {
        this.vars.should.be.empty;
        spy();
      }
    });
    salt.go(1, 0);
    salt.state.name.should.equal('_null');
    salt.go('//check');
    spy.should.have.been.calledOnce;
  });

  it( 'should not be available when paused or pinned', function (done) {
    salt = new Salt({
      pause: function () {
        this.wait();
      },
      pin: function () {
        var pinner = new Salt(function () {
          this.wait(done, 0);
        });
        pinner.go(1);
      }
    });
    salt.go('//pause');
    salt.status().paused.should.be.ok;
    salt.should.not.haveOwnProperty('vars');
    salt.go('//pin');
    salt.status().paused.should.not.be.ok;
    salt.status().pinned.should.equal(true);
    salt.should.not.haveOwnProperty('vars');
  });

  it( 'should preserve pre-existing `.vars`', function () {
    var
      externalValue = {},
      spy = sinon.spy()
    ;
    salt = new Salt(function () {
      this.vars.should.be.empty;
      this.vars.should.be.an('object');
      this.vars.should.not.equal(externalValue);
      spy();
    });
    salt.vars = externalValue;
    salt.go(1);
    spy.should.have.been.calledOnce;
    salt.vars.should.equal(externalValue);
  });

});