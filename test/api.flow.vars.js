describe( 'Flow#vars', function () {

  var flow;

  it( 'should be an object member, only present while navigating', function () {
    var
      varsRef,
      inSpy = sinon.spy(function () {
        this.should.haveOwnProperty('vars');
        this.should.be.an('object');
        varsRef = this.vars;
      }),
      onSpy = sinon.spy(function () {
        this.vars.should.equal(varsRef);
      })
    ;
    flow = new Flow({
      _in: inSpy,
      _on: onSpy
    });
    flow.go(1);
    inSpy.should.have.been.calledOnce;
    onSpy.should.have.been.calledOnce;
    flow.should.not.haveOwnProperty('vars');
  });

  it( 'should ignore being set anything other than an object', function () {
    var
      inSpy = sinon.spy(function () {
        this.vars.should.be.an('object');
        this.vars = 'scalar value';
      }),
      onSpy = sinon.spy(function () {
        this.vars.should.be.an('object');
      }),
    flow = new Flow({
      _in: inSpy,
      _on: onSpy
    });
    flow.go(1);
    inSpy.should.have.been.calledOnce;
    onSpy.should.have.been.calledOnce;
  });

  it( 'should discard members after ending on the `null` state', function () {
    var
      onSpy = sinon.spy(function () {
        this.vars.foo = 10;
      }),
      aSpy = sinon.spy(function () {
        this.vars.should.be.empty;
      })
    ;
    flow = new Flow({
      _on: onSpy,
      a: aSpy
    });
    flow.go(1, 0);
    flow.go('//a/');
    onSpy.should.have.been.calledOnce;
    aSpy.should.have.been.calledOnce;
  });

});