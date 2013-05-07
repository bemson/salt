describe( '_owner tag', function () {

  var
    flow,
    owner,
    owned
  ;

  beforeEach(function () {
    flow =
    owner =
    owned =
      null;
  });

  it( 'should allow Flow\'s to have owners when created by another Flow', function () {
    owner = new Flow(function () {
      owned = new Flow({
        _owner: 1
      });
      owned.owner().should.equal(this);
    });
    owner.go(1).should.be.ok;
    owned.owner().should.equal(true);
  });

  it( 'should auto-link an owner regardless of the query', function () {
    owner = new Flow(function () {
      owned = new Flow({
        _owner: -1
      });
      owned.owner().should.equal(this);
    });
    owner.go(1).should.be.ok;
    owned.owner().should.equal(true);
  });

  it( 'should apply the given query to the owner before entering a tagged state', function () {
    var
      ownerSpyCall1 = sinon.spy(),
      ownerSpyCall2 = sinon.spy(),
      ownedSpy = sinon.spy(),
      callCount = 0
    ;
    owner = new Flow({
      _on: function () {
        owned = new Flow({
          _owner: '@customTarget',
          a: ownedSpy
        });
        owned.owner().should.equal(this);
      },
      goal: {
        _on: function () {
          callCount++;
          if (callCount === 1) {
            ownerSpyCall1();
          }
          if (callCount === 2) {
            ownerSpyCall2();
          }
        },
        _name: 'customTarget'
      }
    });
    owner.go(1).should.be.ok;
    owned.go('//a/').should.be.ok;
    ownerSpyCall1.should.have.been.calledOnce;
    ownerSpyCall2.should.have.been.calledOnce;
    ownedSpy.should.have.been.calledOnce;
    ownerSpyCall1.should.have.been.calledBefore(ownedSpy);
  });

  it( 'should apply the given query to the owner upon ending in a tagged branch', function () {
    var
      ownerSpyCall1 = sinon.spy(),
      ownerSpyCall2 = sinon.spy(),
      ownedSpy = sinon.spy(),
      callCount = 0
    ;
    owner = new Flow({
      _on: function () {
        owned = new Flow({
          _owner: '@customTarget',
          a: ownedSpy
        });
        owned.owner().should.equal(this);
      },
      goal: {
        _on: function () {
          callCount++;
          if (callCount === 1) {
            ownerSpyCall1();
          }
          if (callCount === 2) {
            ownerSpyCall2();
          }
        },
        _name: 'customTarget'
      }
    });
    owner.go(1).should.be.ok;
    owned.go('//a/').should.be.ok;
    ownerSpyCall1.should.have.been.calledOnce;
    ownerSpyCall2.should.have.been.calledOnce;
    ownedSpy.should.have.been.calledOnce;
    ownerSpyCall2.should.have.been.calledAfter(ownedSpy);
  });

  it( 'should apply the given query to the owner after exiting a tagged state', function () {
    var
      ownerSpyCall1 = sinon.spy(),
      ownerSpyCall2 = sinon.spy(),
      ownerSpyCall3 = sinon.spy(),
      ownedSpy = sinon.spy(),
      callCount = 0
    ;
    owner = new Flow({
      _on: function () {
        owned = new Flow({
          _owner: '@customTarget',
          _out: ownedSpy
        });
        owned.owner().should.equal(this);
      },
      goal: {
        _on: function () {
          callCount++;
          if (callCount === 1) {
            ownerSpyCall1();
          }
          if (callCount === 2) {
            ownerSpyCall2();
          }
          if (callCount === 3) {
            ownerSpyCall3();
          }
        },
        _name: 'customTarget'
      }
    });
    owner.go(1).should.be.ok;
    owned.go(1).should.be.ok;
    owned.go(0).should.be.ok;
    ownerSpyCall1.should.have.been.calledOnce;
    ownerSpyCall2.should.have.been.calledOnce;
    ownerSpyCall3.should.have.been.calledOnce;
    ownedSpy.should.have.been.calledOnce;
    ownerSpyCall3.should.have.been.calledAfter(ownedSpy);
  });

  it( 'should apply a query with `.target()`, passing the owned flow and it\'s then status, as arguments', function () {
    owner = new Flow({
      _on: function () {
        owned = new Flow({
          _owner: 0
        });
        owned.owner().should.equal(this);
      }
    });
    var targetSpy = sinon.spy(owner, 'target');
    owner.go(1).should.be.ok;
    owned.go(1).should.be.ok;
    targetSpy.should.have.been.called;
    owner.target.restore();
  });

});