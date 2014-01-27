describe( 'Salt#perms()', function () {

  var salt;

  it( 'should return false, when caller has no permission', function () {
    salt = new Salt();
    salt.perms().should.equal(false);
    salt.perms('world').should.equal(false);
    salt.perms(true).should.equal(false);
  });

  it( 'should return true, when caller has permission', function () {
    var spy = sinon.spy();
    salt = new Salt(function () {
      salt.perms().should.equal(true);
      salt.perms('world').should.equal(true);
      salt.perms(true).should.equal(true);
      spy();
    });
    salt.go(1);
    spy.should.have.been.calledOnce;
  });

  it( 'should allow permitted access groups to set permission', function () {
    var
      setting = '!world',
      spy = sinon.spy(),
      master = new Salt(function () {
        salt.perms(setting).should.not.be.ok;
        salt.owner(this);
        salt.perms(setting).should.be.ok;
        spy();
      })
    ;
    salt = new Salt(function () {
      salt.perms(setting).should.be.ok;
    });
    salt.perms(setting).should.not.be.ok;
    master.go(1);
    spy.should.have.been.calledOnce;
  });

});