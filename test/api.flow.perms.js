describe( 'Flow#perms()', function () {

  var flow;

  it( 'should return permissions object, if called without arguments', function () {
    flow = new Flow();
    flow.perms().should.be.an('object');
  });

  it( 'should prevent changing settings outside the instance\'s program or owner', function () {
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