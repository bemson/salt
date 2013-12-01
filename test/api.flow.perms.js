describe( 'Flow#perms()', function () {

  var flow;

  it( 'should return false, when caller has no permission', function () {
    flow = new Flow();
    flow.perms().should.equal(false);
    flow.perms('world').should.equal(false);
    flow.perms(true).should.equal(false);
  });

  it( 'should return true, when caller has permission', function () {
    var spy = sinon.spy();
    flow = new Flow(function () {
      flow.perms().should.equal(true);
      flow.perms('world').should.equal(true);
      flow.perms(true).should.equal(true);
      spy();
    });
    flow.go(1);
    spy.should.have.been.calledOnce;
  });

  it( 'should allow permitted access groups to set permission', function () {
    var
      setting = '!world',
      spy = sinon.spy(),
      master = new Flow(function () {
        flow.perms(setting).should.not.be.ok;
        flow.owner(this);
        flow.perms(setting).should.be.ok;
        spy();
      })
    ;
    flow = new Flow(function () {
      flow.perms(setting).should.be.ok;
    });
    flow.perms(setting).should.not.be.ok;
    master.go(1);
    spy.should.have.been.calledOnce;
  });

});