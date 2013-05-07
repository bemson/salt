describe( 'Flow#vars', function () {

  var flow;

  it( 'should be a navigation-only member', function () {
    var
      spy = sinon.spy(),
      varsRef
    ;
    flow = new Flow({
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
    flow.go(1);
    spy.should.have.been.calledOnce;
    flow.should.not.haveOwnProperty('vars');
  });

  it( 'should be an object', function () {
    var spy = sinon.spy();
    flow = new Flow(function () {
      this.vars.should.be.an('object');
      spy();
    });
    flow.go(1);
    spy.should.have.been.calledOnce;
  });

  it( 'should allow being set to an object', function () {
    var
      replacementObj = {},
      spy = sinon.spy()
    ;
    flow = new Flow({
      _in: function () {
        this.vars = replacementObj;
      },
      _on: function () {
        this.vars.should.equal(replacementObj);
        spy();
      }
    });
    flow.go(1);
    spy.should.have.been.calledOnce;
  });

  it( 'should restore itself when set to scalar values', function () {
    var
      value = {},
      spy = sinon.spy()
    ;
    flow = new Flow({
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
    flow.go(1);
    spy.should.have.been.calledOnce;
  });

  it( 'should discard members after ending on the `null` state', function () {
    var spy = sinon.spy();
    flow = new Flow({
      _on: function () {
        this.vars.foo = 'bar';
      },
      check: function () {
        this.vars.should.be.empty;
        spy();
      }
    });
    flow.go(1, 0);
    flow.state.name.should.equal('_null');
    flow.go('//check');
    spy.should.have.been.calledOnce;
  });

  it( 'should not be available when paused or pending', function (done) {
    flow = new Flow({
      pause: function () {
        this.wait();
      },
      pend: function () {
        var pender = new Flow(function () {
          this.wait(done, 0);
        });
        pender.go(1);
      }
    });
    flow.go('//pause');
    flow.status().paused.should.be.ok;
    flow.should.not.haveOwnProperty('vars');
    flow.go('//pend');
    flow.status().paused.should.not.be.ok;
    flow.status().pending.should.equal(true);
    flow.should.not.haveOwnProperty('vars');
  });

  it( 'should preserve pre-existing `.vars`', function () {
    var
      externalValue = {},
      spy = sinon.spy()
    ;
    flow = new Flow(function () {
      this.vars.should.be.empty;
      this.vars.should.be.an('object');
      this.vars.should.not.equal(externalValue);
      spy();
    });
    flow.vars = externalValue;
    flow.go(1);
    spy.should.have.been.calledOnce;
    flow.vars.should.equal(externalValue);
  });

});