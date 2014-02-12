describe( 'Salt#status()', function () {

  var salt;

  it( 'should return a unique status object', function () {
    salt = new Salt();
    var status = salt.status();
    status.should.not.equal(salt.status());
    status.should.haveOwnProperty('targets');
    status.should.haveOwnProperty('trail');
    status.should.haveOwnProperty('paused');
    status.should.haveOwnProperty('pinned');
    status.should.haveOwnProperty('loops');
    status.targets.should.be.an.instanceOf(Array);
    status.trail.should.be.an.instanceOf(Array);
    status.paused.should.be.a('boolean');
    status.pinned.should.be.a('boolean');
    status.loops.should.be.a('number');
  });

  it( 'should list completed states', function () {
    var spy = sinon.spy();
    salt = new Salt({
      a: function () {
        var status = this.status();
        status.trail.should.have.a.lengthOf(1);
        status.trail[0].should.equal('//');
        spy();
      },
      b: {}
    });
    salt.go(1, '//a', '//b');
    spy.should.have.been.calledOnce;
  });

  it( 'should list targeted states', function () {
    var spy = sinon.spy();
    salt = new Salt({
      _on: function () {
        var status = this.status();
        status.targets.should.have.a.lengthOf(2);
        status.targets[0].should.equal('//a/');
        status.targets[1].should.equal('//b/');
        spy();
      },
      a: {},
      b: {}
    });
    salt.go(1, '//a', '//b');
    spy.should.have.been.calledOnce;
  });

  it( 'should indicate the current traversal phase', function () {
    var spy = sinon.spy();
    salt = new Salt({
      _in: function () {
        this.status('phase').should.equal('in');
      },
      _on: function () {
        this.status('phase').should.equal('on');
      },
      _out: function () {
        this.status('phase').should.equal('out');
        spy();
      },
      middle: {
        _over: function () {
          this.status('phase').should.equal('over');
        },
        _bover: function () {
          this.status('phase').should.equal('bover');
        }
      },
      end: {}
    });
    salt.go(1,'//end',0);
    spy.should.have.been.calledOnce;
  });

  it( 'should have an empty phase when idle', function () {
    salt = new Salt();
    salt.status('phase').should.equal('');
  });

  it( 'should indicate when the Salt is active/idle', function () {
    var spy = sinon.spy();
    salt = new Salt(function () {
      var status = this.status();
      status.active.should.be.ok;
      spy();
    });
    salt.status().active.should.not.be.ok;
    salt.go(1);
    spy.should.have.been.calledOnce;
  });

  it( 'should indicate when the Salt is paused', function () {
    var spy = sinon.spy();
    salt = new Salt(function () {
      this.status().paused.should.not.be.ok;
      this.wait();
      this.status().paused.should.be.ok;
      this.go();
      this.status().paused.should.not.be.ok;
      this.wait(5);
      this.status().paused.should.be.ok;
      this.get('.');
      this.status().paused.should.not.be.ok;
      this.wait();
      spy();
    });
    salt.go(1);
    spy.should.have.been.calledOnce;
    salt.status().paused.should.be.ok;
  });

  it( 'should preserve sequence data while paused or pinned', function () {
    salt = new Salt({
      pause: function () {
        this.wait();
      },
      next: {}
    });
    salt.go('//', '//pause', '//next');
    salt.status().targets.should.not.be.empty;
    salt.status().trail.should.not.be.empty;
    salt.go();
    salt.status().targets.should.be.empty;
    salt.status().trail.should.be.empty;
  });

  it( 'should indicate the number of times a phase is repeated', function () {
    var
      onHits = 0,
      onSpy = sinon.spy(),
      outSpy = sinon.spy()
    ;
    salt = new Salt({
      _on: function () {
        onHits++;
        if (onHits < 10) {
          this.go('.');
          this.status().loops.should.be.below(onHits);
        }
        onSpy();
      },
      _out: function () {
        this.status().loops.should.equal(0);
        outSpy();
      }
    });
    salt.go(1, 0);
    onHits.should.equal(10);
    onSpy.should.have.been.called;
    outSpy.should.have.been.called;
  });

  it( 'should return the matching property (or `undefined`)', function () {
    salt = new Salt();
    salt.status('targets').should.be.an.instanceOf(Array);
    expect(salt.status('foo')).to.equal(undefined);
    expect(salt.status(null)).to.equal(undefined);
  });

});