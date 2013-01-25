describe( 'Reserved query token', function () {

  var flow;

  before(function () {
    flow = new Flow({
      a: 1,
      b: {
        c: {
          _root: 1
        }
      },
      d: 1
    });
  });

  beforeEach(function () {
    flow.go(0);
  });

  it( 'should fail a query if the resolved state is not present', function () {
    flow.status().path.should.equal('..//');
    flow.query('@parent').should.be.false;
  });
  
  describe( '@flow', function () {

    it( 'should be first state of the flow', function () {
      flow.query('@flow').should.equal('..//');
    });

  });
  
  describe( '@program', function () {

    it( 'should be the second state of the flow', function () {
      flow.query('@program').should.equal('//');
    });

  });
  
  describe( '@root', function () {

    it( 'should be the state designated as the local branch root', function () {
      flow.go('//b/');
      flow.query('@root').should.equal('//');
      flow.go('//b/c/');
      flow.query('@root').should.equal('//b/c/');
    });

  });
  
  describe( '@parent', function () {

    it( 'should be the parent of the current state', function () {
      flow.go(1);
      flow.query('@parent').should.equal('..//');
    });

  });
  
  describe( '@next', function () {

    it( 'should be the right sibling of the current state', function () {
      flow.go(2);
      flow.query('@next').should.equal('//b/');
    });

  });
  
  describe( '@previous', function () {

    it( 'should be the left sibling of the current state', function () {
      flow.go('//b/');
      flow.query('@previous').should.equal('//a/');
    });

  });
  
  describe( '@oldest', function () {

    it( 'should be the right-most sibling of the current state', function () {
      flow.go(2);
      flow.query('@oldest').should.equal('//d/');
    });

  });
  
  describe( '@youngest', function () {

    it( 'should be the left-most sibling of the current state', function () {
      flow.go('//d/');
      flow.query('@youngest').should.equal('//a/');
    });

  });

  describe( '@self', function () {

    it( 'should be the current state', function () {
      flow.query('@self').should.equal('..//');
      flow.go('//b/c/');
      flow.query('@self').should.equal('//b/c/');
    });

  });

  describe( '@child', function () {

    it( 'should be the current state', function () {
      flow.go(1);
      flow.query('@child').should.equal('//a/');
    });

  });

});