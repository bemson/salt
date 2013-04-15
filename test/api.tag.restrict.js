describe( '_restrict tag', function () {

  var flow;

  it( 'should deny external attempts to exit a branch', function () {
    flow = new Flow({
      jail: {
        _restrict: true
      }
    });
    flow.go('//jail');
    flow.query('/').should.not.be.ok;
    flow.go(0).should.not.be.ok;
    flow.target('/').should.not.be.ok;
  });

  it( 'should accept truthy values', function () {
    flow = new Flow({
      jail: {
        _restrict: 1
      }
    });
    flow.go('//jail');
    flow.go(0).should.not.be.ok;
    flow.target('/').should.not.be.ok;
  });
});