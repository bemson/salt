describe( 'Flow#subs()', function () {

  var flow;

  it( 'should retrieve all sub-instances by default', function () {
    var spy = sinon.spy();
    flow = new Flow({
      _capture: 1,
      _on: function () {
        this.subs().should.have.lengthOf(0);
        var x = new Flow();
        this.subs()
          .should.have.lengthOf(1)
          .and.contain(x);
        spy();
      }
    });
    flow.go(1);
    spy.should.have.been.calledOnce;
  });

  it( 'should filter sub-instances by the branch criteria when passed `null`', function () {
    var
      fooProgram = {},
      barProgram = {},
      spy = sinon.spy()
    ;
    flow = new Flow({
      _capture: {is:fooProgram},
      _on: function () {
        new Flow(fooProgram);
        new Flow(barProgram);
        this.subs().should.have.lengthOf(2);
        this.subs(null).should.have.lengthOf(1);
        this.subs(null)[0].should.eql(this.subs({is:fooProgram})[0]);
        spy();
      }
    });
    flow.go(1);
    spy.should.have.been.calledOnce;
  });

  it( 'should filter sub-instances by the given criteria', function () {
    var
      fooProgram = {},
      barProgram = {}
    ;
    flow = new Flow(function () {
      var
        foo = new Flow(fooProgram),
        bar = new Flow(barProgram)
      ;
      foo.go(1);
      bar.go(1);
      this.subs(foo, bar);
    });
    flow.go(1);
    flow.subs({is:fooProgram}).should.equal(1);
    flow.subs({is:barProgram}).should.equal(1);
    flow.subs({on:1}).should.equal(2);
  });

  it( 'should both filter buffered and stored sub-instances, by default', function () {
    var spy = sinon.spy();
    flow = new Flow({
      _capture: true,
      _on: function () {
        new Flow();
        this.subs(new Flow());
        this.subs({buffer:1}).should.have.lengthOf(1);
        this.subs({buffer:0}).should.have.lengthOf(1);
        this.subs({buffer:-1}).should.have.lengthOf(2);
        this.subs().should.have.lengthOf(2);
        spy();
      }
    });
    flow.go(1);
    spy.should.have.been.calledOnce;
  });

  it( 'should return an array of sub-instances internally', function () {
    var spy = sinon.spy();
    flow = new Flow(function () {
      this.subs().should.be.an.instanceOf(Array);
      spy();
    });
    flow.go(1);
    spy.should.have.been.calledOnce;
  });

  it( 'should return the number of matching sub-instances externally', function () {
    flow = new Flow();
    flow.subs().should.be.a('number');
  });

  it( 'should give privileged access to "self" and "owner"', function () {
    var
      spy = sinon.spy(),
      owningFlow = new Flow(function () {
        flow.subs().should.be.a('number');
        flow.owner(this);
        flow.subs().should.be.an.instanceOf(Array);
        spy();
      })
    ;
    flow = new Flow(function () {
      this.subs().should.be.an.instanceOf(Array);
      spy();
    });
    flow.go(1);
    owningFlow.go(1);
    spy.should.have.been.calledTwice;
  });

  it( 'should store passed in sub-instances', function () {
    var spy = sinon.spy();
    flow = new Flow(function () {
      var inst = new Flow();
      this.subs(inst);
      this.subs().should.contain(inst);
      spy();
    });
    flow.go(1);
    spy.should.have.been.calledOnce;
  });

  it( 'should return the number new sub-instances added', function () {
    var spy = sinon.spy();
    flow = new Flow(function () {
      var inst = new Flow();
      this.subs(inst, new Flow(), inst).should.equal(2);
      this.subs(inst).should.equal(0);
      spy();
    });
    flow.go(1);
    spy.should.have.been.calledOnce;
  });

  it( 'should abort adding sub-instances, when given mixed arguments', function () {
    var spy = sinon.spy();
    flow = new Flow(function () {
      var inst = new Flow();
      this.subs(inst, new Flow(), 'not a flow instance').should.equal(0);
      this.subs().should.have.lengthOf(0);
      spy();
    });
    flow.go(1);
    spy.should.have.been.calledOnce;
  });

  it( 'should allow removing sub-instances by criteria or reference', function () {
    var
      inst = new Flow(),
      spy = sinon.spy()
    ;
    flow = new Flow({
      _capture: true,
      _on: function () {
        var inst = new Flow();
        new Flow();
        this.subs(inst);
        this.subs().should.have.lengthOf(2);
        this.subs('remove', {buffer:1});
        this.subs()
          .should.have.lengthOf(1)
          .and.contain(inst)
        ;
        this.subs('remove', inst);
        this.subs().should.have.lengthOf(0);
        spy();
      }
    });
    flow.go(1);
    spy.should.have.been.calledOnce;
  });

  it( 'should return the number of sub-instances removed', function () {
    var spy = sinon.spy();
    flow = new Flow(function () {
      var inst = new Flow();
      this.subs(new Flow(), inst);
      inst.go(1);
      this.subs().should.have.lengthOf(2);
      this.subs('remove', {on:1}).should.equal(1);
      this.subs().should.have.lengthOf(1);
      spy();
    });
    flow.go(1);
    spy.should.have.been.calledOnce;
  });

  it( 'should remove sub-instances matching branch criteria when passed `null`', function () {
    var
      fooProgram = {},
      spy = sinon.spy()
    ;
    flow = new Flow({
      _capture: {is:fooProgram},
      _in: function () {
        new Flow();
        new Flow();
        new Flow(fooProgram);
        this.subs().should.have.lengthOf(3);
        this.subs('remove', null).should.equal(1);
        this.subs().should.have.lengthOf(2);
      },
      _on: function () {
        this.subs().should.have.lengthOf(0);
        spy();
      }
    });
    flow.go(1);
    spy.should.have.been.calledOnce;
  });

  it( 'should abort removing sub-instances, when given mixed arguments', function () {
    var spy = sinon.spy();
    flow = new Flow(function () {
      var
        foo = new Flow(),
        bar = new Flow()
      ;
      this.subs(foo, bar);
      this.subs().should.have.lengthOf(2);
      this.subs('remove', foo, bar, 'not a flow instance').should.equal(0);
      spy();
    });
    flow.go(1);
    spy.should.have.been.calledOnce;
  });


});