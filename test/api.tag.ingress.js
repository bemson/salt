describe( '_ingress tag', function () {

  var flow;
  
  before(function () {
    flow = new Flow({
      gated: {
        _ingress: true,
        state: {}
      }
    });
  });

  afterEach(function () {
    flow.go(0);
  })

  it( 'should require external calls to target a state before it\'s branch', function () {
    flow.query('//gated/state').should.not.be.ok;
    flow.go('//gated/state').should.not.be.ok;
    flow.go('//gated').should.be.ok;
    flow.query('//gated/state').should.be.ok;
  });

  it( 'should accept a truthy value', function () {
    flow = new Flow({
      gated: {
        _ingress: 1,
        state: {}
      }
    });
    flow.query('//gated/state').should.not.be.ok;
    flow.go('//gated/state').should.not.be.ok;
    flow.go('//gated').should.be.ok;
    flow.query('//gated/state').should.be.ok;
  });

});