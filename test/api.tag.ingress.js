describe( '_ingress tag', function () {

  var salt;
  
  before(function () {
    salt = new Salt({
      gated: {
        _ingress: true,
        state: {}
      }
    });
  });

  afterEach(function () {
    salt.go(0);
  });

  it( 'should require external calls to get a state before it\'s branch', function () {
    salt.query('//gated/state').should.not.be.ok;
    salt.go('//gated/state').should.not.be.ok;
    salt.go('//gated').should.be.ok;
    salt.query('//gated/state').should.be.ok;
  });

  it( 'should accept a truthy value', function () {
    salt = new Salt({
      gated: {
        _ingress: 1,
        state: {}
      }
    });
    salt.query('//gated/state').should.not.be.ok;
    salt.go('//gated/state').should.not.be.ok;
    salt.go('//gated').should.be.ok;
    salt.query('//gated/state').should.be.ok;
  });

});