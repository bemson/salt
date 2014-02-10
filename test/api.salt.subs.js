describe( 'Salt#subs()', function () {

  var salt;

  it( 'should retrieve all sub-instances by default', function () {
    var spy = sinon.spy();
    salt = new Salt({
      _capture: 1,
      _on: function () {
        this.subs().should.have.lengthOf(0);
        var x = new Salt();
        this.subs()
          .should.have.lengthOf(1)
          .and.contain(x);
        spy();
      }
    });
    salt.go(1);
    spy.should.have.been.calledOnce;
  });

  it( 'should filter sub-instances by the branch criteria when passed `null`', function () {
    var
      fooProgram = {},
      barProgram = {},
      spy = sinon.spy()
    ;
    salt = new Salt({
      _capture: {is:fooProgram},
      _on: function () {
        new Salt(fooProgram);
        new Salt(barProgram);
        this.subs().should.have.lengthOf(2);
        this.subs(null).should.have.lengthOf(1);
        this.subs(null)[0].should.eql(this.subs({is:fooProgram})[0]);
        spy();
      }
    });
    salt.go(1);
    spy.should.have.been.calledOnce;
  });

  it( 'should filter sub-instances by the given criteria', function () {
    var
      fooProgram = {},
      barProgram = {}
    ;
    salt = new Salt(function () {
      var
        foo = new Salt(fooProgram),
        bar = new Salt(barProgram)
      ;
      foo.go(1);
      bar.go(1);
      this.subs(foo, bar);
    });
    salt.go(1);
    salt.subs({is:fooProgram}).should.equal(1);
    salt.subs({is:barProgram}).should.equal(1);
    salt.subs({on:1}).should.equal(2);
  });

  it( 'should both filter buffered and stored sub-instances, by default', function () {
    var spy = sinon.spy();
    salt = new Salt({
      _capture: true,
      _on: function () {
        new Salt();
        this.subs(new Salt());
        this.subs({buffer:1}).should.have.lengthOf(1);
        this.subs({buffer:0}).should.have.lengthOf(1);
        this.subs({buffer:-1}).should.have.lengthOf(2);
        this.subs().should.have.lengthOf(2);
        spy();
      }
    });
    salt.go(1);
    spy.should.have.been.calledOnce;
  });

  it( 'should return an array of sub-instances internally', function () {
    var spy = sinon.spy();
    salt = new Salt(function () {
      this.subs().should.be.an.instanceOf(Array);
      spy();
    });
    salt.go(1);
    spy.should.have.been.calledOnce;
  });

  it( 'should return the number of matching sub-instances externally', function () {
    salt = new Salt();
    salt.subs().should.be.a('number');
  });

  it( 'should have zero manually added subs when on the null node', function () {
    salt = new Salt(function () {
      this.subs(new Salt());
    });
    salt.subs().should.equal(0);
    salt.go(1);
    salt.subs().should.equal(1);
    salt.go(0);
    salt.subs().should.equal(0);
  });

  it( 'should have zero auto-captured subs when on the null node', function () {
    salt = new Salt({
      _capture: true,
      _on: function () {
        new Salt();
      }
    });
    salt.subs().should.equal(0);
    salt.go(1);
    salt.subs().should.equal(1);
    salt.go(0);
    salt.subs().should.equal(0);
  });

  it( 'should give privileged access to "self" and "owner"', function () {
    var
      spy = sinon.spy(),
      owningSalt = new Salt(function () {
        salt.subs().should.be.a('number');
        salt.owner(this);
        salt.subs().should.be.an.instanceOf(Array);
        spy();
      })
    ;
    salt = new Salt(function () {
      this.subs().should.be.an.instanceOf(Array);
      spy();
    });
    salt.go(1);
    owningSalt.go(1);
    spy.should.have.been.calledTwice;
  });

  it( 'should store passed in sub-instances', function () {
    var spy = sinon.spy();
    salt = new Salt(function () {
      var inst = new Salt();
      this.subs(inst);
      this.subs().should.contain(inst);
      spy();
    });
    salt.go(1);
    spy.should.have.been.calledOnce;
  });

  it( 'should return the number new sub-instances added', function () {
    var spy = sinon.spy();
    salt = new Salt(function () {
      var inst = new Salt();
      this.subs(inst, new Salt(), inst).should.equal(2);
      this.subs(inst).should.equal(0);
      spy();
    });
    salt.go(1);
    spy.should.have.been.calledOnce;
  });

  it( 'should abort adding sub-instances, when given mixed arguments', function () {
    var spy = sinon.spy();
    salt = new Salt(function () {
      var inst = new Salt();
      this.subs(inst, new Salt(), 'not a salt instance').should.equal(0);
      this.subs().should.have.lengthOf(0);
      spy();
    });
    salt.go(1);
    spy.should.have.been.calledOnce;
  });

  it( 'should allow removing sub-instances by criteria or reference', function () {
    var
      inst = new Salt(),
      spy = sinon.spy()
    ;
    salt = new Salt({
      _capture: true,
      _on: function () {
        var inst = new Salt();
        new Salt();
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
    salt.go(1);
    spy.should.have.been.calledOnce;
  });

  it( 'should return the number of sub-instances removed', function () {
    var spy = sinon.spy();
    salt = new Salt(function () {
      var inst = new Salt();
      this.subs(new Salt(), inst);
      inst.go(1);
      this.subs().should.have.lengthOf(2);
      this.subs('remove', {on:1}).should.equal(1);
      this.subs().should.have.lengthOf(1);
      spy();
    });
    salt.go(1);
    spy.should.have.been.calledOnce;
  });

  it( 'should remove sub-instances matching branch criteria when passed `null`', function () {
    var
      fooProgram = {},
      spy = sinon.spy()
    ;
    salt = new Salt({
      _capture: {is:fooProgram},
      _in: function () {
        new Salt();
        new Salt();
        new Salt(fooProgram);
        this.subs().should.have.lengthOf(3);
        this.subs('remove', null).should.equal(1);
        this.subs().should.have.lengthOf(2);
      },
      _on: function () {
        this.subs().should.have.lengthOf(0);
        spy();
      }
    });
    salt.go(1);
    spy.should.have.been.calledOnce;
  });

  it( 'should abort removing sub-instances, when given mixed arguments', function () {
    var spy = sinon.spy();
    salt = new Salt(function () {
      var
        foo = new Salt(),
        bar = new Salt()
      ;
      this.subs(foo, bar);
      this.subs().should.have.lengthOf(2);
      this.subs('remove', foo, bar, 'not a salt instance').should.equal(0);
      spy();
    });
    salt.go(1);
    spy.should.have.been.calledOnce;
  });


});