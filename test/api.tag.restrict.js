describe( '_restrict tag', function () {

  var salt;

  it( 'should deny external attempts to exit a branch', function () {
    salt = new Salt({
      jail: {
        _restrict: true
      }
    });
    salt.go('//jail');
    salt.query('/').should.not.be.ok;
    salt.go(0).should.not.be.ok;
    salt.get('/').should.not.be.ok;
  });

  it( 'should accept truthy values', function () {
    salt = new Salt({
      jail: {
        _restrict: 1
      }
    });
    salt.go('//jail');
    salt.go(0).should.not.be.ok;
    salt.get('/').should.not.be.ok;
  });
});