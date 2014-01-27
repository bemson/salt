describe( 'Salt#owner()', function () {

  var
    unownedInst,
    ownedInst,
    ownerInst
  ;

  beforeEach(function () {
    unownedInst = new Salt();
    ownerInst = new Salt(function () {
      ownedInst = new Salt({
        _owner: -1
      });
    });
    ownerInst.go(1);
  });

  it( 'should return the (owning) Salt if called by the owner or self', function () {
    var spy = sinon.spy();
    ownerInst = new Salt(function () {
      ownedInst = new Salt({
        _owner: -1,
        _on: function () {
          this.owner().should.equal(ownerInst);
          spy();
        }
      });
      ownedInst.owner().should.equal(ownerInst);
      ownedInst.go(1).should.be.ok;
    });
    ownerInst.go(1);
    spy.should.have.been.calledOnce;
  });

  it( 'should indicate when there is no owner', function () {
    unownedInst.owner().should.equal(false);
  });

  it( 'should allow external and non-owning salts to see an owner exists', function () {
    ownedInst.owner().should.equal(true);
  });

  it( 'should allow owner or self to set the owner instance', function () {
    var spy = sinon.spy();
    ownerInst = new Salt(function () {
      ownedInst = new Salt({
        _owner: -1
      });
      ownedInst.owner().should.equal(ownerInst);
      ownedInst.owner(unownedInst).should.equal(unownedInst);
      ownedInst.owner().should.equal(true);
      spy();
    });
    ownerInst.go(1);
    spy.should.have.been.called;
  });
  
  it( 'should allow owner or self to remove the owner', function () {
    var spy = sinon.spy();
    ownerInst = new Salt(function () {
      ownedInst = new Salt({
        _owner: -1
      });
      ownedInst.owner().should.equal(ownerInst);
      ownedInst.owner(false).should.equal(true);
      ownedInst.owner().should.equal(false);
      spy();
    });
    ownerInst.go(1);
    spy.should.have.been.called;
  });

  it( 'should deny external or non-owning salts to change the owner', function () {
    var
      spy = sinon.spy(),
      sub,
      salt = new Salt(function () {
        var that = this;
        that.owner(ownerInst);
        sub = new Salt(function () {
          that.owner(unownedInst).should.equal(false);
          spy();
        });
        that.subs(sub).should.equal(1);
        that.subs().should.contain(sub);
        sub.go(1);
      })
    ;
    ownedInst.owner(unownedInst).should.equal(false);
    salt.go(1);
    salt.subs().should.equal(1);
    sub.go(1);
    spy.should.have.been.calledTwice;
  });

});