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
        _alias: 'customTarget'
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
        _alias: 'customTarget'
      }
    });
    owner.go(1).should.be.ok;
    owned.go('//a/').should.be.ok;
    ownerSpyCall1.should.have.been.calledOnce;
    ownerSpyCall2.should.have.been.calledOnce;
    ownedSpy.should.have.been.calledOnce;
    ownerSpyCall2.should.have.been.calledAfter(ownedSpy);
  });

  it( 'should not apply the given query when pausing', function (done) {
    var callCount = 0;
    owner = new Flow({
      _in: function () {
        owned = new Flow({
          _owner: '//update',
          goal: {
            _in: function () {
              this.wait(1);
            },
            _on: function () {
              callCount.should.equal(1);
              done();
            }
          }
        });
      },
      update: function () {
        callCount++;
      }
    });
    owner.go(1);
    owned.go('//goal');
  });

  it( 'should apply the given query without pinned', function (done) {
    var callCount = 0;
    owner = new Flow({
      _in: function () {
        owned = new Flow({
          _owner: '//update',
          _pins: true,
          goal: {
            _in: function () {
              this.wait(1);
            },
            _on: function () {
              callCount.should.equal(1);
              done();
            }
          }
        });
      },
      update: function () {
        callCount++;
      }
    });
    owner.go(1);
    owned.go('//goal');
  });

  it( 'should pin an active owning flow when the owned flow is delayed and nested', function (done) {
    var callCount = 0;
    owner = new Flow({
      _in: function () {
        owned = new Flow({
          _owner: '//update',
          goal: function () {
            callCount.should.equal(0);
            done();
          }
        });
        owned.go('//goal');
      },
      update: function () {
        callCount++;
      }
    });
    owner.go(1);
  });

  it( 'should pin an active owning flow when the owned flow is delayed and nested', function (done) {
    var callCount = 0;
    owner = new Flow({
      _in: function () {
        owned = new Flow({
          _owner: '//update',
          goal: {
            _in: function () {
              this.wait(1);
            },
            _on: function () {
              callCount.should.equal(0);
              setTimeout(function () {
                callCount.should.equal(1);
                done();
              }, 0);
            }
          }
        });
        owned.go('//goal');
      },
      update: function () {
        callCount++;
      }
    });
    owner.go(1);
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
        _alias: 'customTarget'
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

  it( 'should apply a query with `.target()`, passing the owned flow, it\'s then status, and then state as arguments', function () {
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
    targetSpy.getCall(0).args.should.have.lengthOf(4);
    targetSpy.getCall(0).args[0].should.equal(0);
    targetSpy.getCall(0).args[1].should.be.an.instanceOf(Flow);
    targetSpy.getCall(0).args[2].should.be.an('object');
    targetSpy.getCall(0).args[3].should.be.an('object');
    owner.target.restore();
  });

  it( 'should not double ping the owner when there is a delay', function (done) {
    var callCount = 0;
    owner = new Flow({
      _on: function () {
        owned = new Flow({
          _owner: '//update'
        });
        owned.owner().should.equal(this);
      },
      update: function () {
        if (callCount++ < 3) {
          this.wait(10);
        }
      }
    });
    owner.go(1);
    owned.go(1);
    setTimeout(function () {
      callCount.should.equal(2);
      done();
    }, 50);
  });

});