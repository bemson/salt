describe( 'Flow#status()', function () {

  var flow;

  it( 'should return a unique status object', function () {
    flow = new Flow();
    var status = flow.status();
    status.should.not.equal(flow.status());
    status.should.haveOwnProperty('targets');
    status.should.haveOwnProperty('trail');
    status.should.haveOwnProperty('paused');
    status.should.haveOwnProperty('pending');
    status.should.haveOwnProperty('loops');
    status.targets.should.be.an.instanceOf(Array);
    status.trail.should.be.an.instanceOf(Array);
    status.paused.should.be.a('boolean');
    status.pending.should.be.a('boolean');
    status.loops.should.be.a('number');
  });

  it( 'should list completed states', function () {
    var spy = sinon.spy(function () {
      var status = this.status();
      status.trail.should.have.a.lengthOf(1);
      status.trail[0].should.equal('//');
    });
    flow = new Flow({
      a: spy,
      b: {}
    });
    flow.go(1, '//a', '//b');
    spy.should.have.been.calledOnce;
  });

  it( 'should list targeted states', function () {
    var spy = sinon.spy(function () {
      var status = this.status();
      status.targets.should.have.a.lengthOf(2);
      status.targets[0].should.equal('//a/');
      status.targets[1].should.equal('//b/');
    });
    flow = new Flow({
      _on: spy,
      a: {},
      b: {}
    });
    flow.go(1, '//a', '//b');
    spy.should.have.been.calledOnce;
  });

  it( 'should indicate when the Flow is active/idle', function () {
    var spy = sinon.spy(function () {
      var status = this.status();
      status.active.should.be.ok;
    });
    flow = new Flow(spy);
    flow.status().active.should.not.be.ok;
    flow.go(1);
  });

  it( 'should indicate when the Flow is paused', function () {
    var spy = sinon.spy(function () {
      this.status().paused.should.not.be.ok;
      this.wait();
      this.status().paused.should.be.ok;
      this.go();
      this.status().paused.should.not.be.ok;
      this.wait(5);
      this.status().paused.should.be.ok;
      this.target('.');
      this.status().paused.should.not.be.ok;
      this.wait();
    });
    flow = new Flow(spy);
    flow.go(1);
    spy.should.have.been.calledOnce;
    flow.status().paused.should.be.ok;
  });

  it( 'should preserve sequence data while paused or pending', function () {
    flow = new Flow({
      pause: function () {
        this.wait();
      },
      next: {}
    });
    flow.go('//', '//pause', '//next');
    flow.status().targets.should.not.be.empty;
    flow.status().trail.should.not.be.empty;
    flow.go();
    flow.status().targets.should.be.empty;
    flow.status().trail.should.be.empty;
  });

  it( 'should indicate the number of times a phase is repeated', function () {
    var
      onHits = 0,
      onSpy = sinon.spy(function () {
        onHits++;
        if (onHits < 10) {
          this.go('.');
          this.status().loops.should.be.below(onHits);
        }
      }),
      outSpy = sinon.spy(function () {
        this.status().loops.should.equal(0);
      })
    ;
    flow = new Flow({
      _on: onSpy,
      _out: outSpy
    });
    flow.go(1, 0);
    onHits.should.equal(10);
    onSpy.should.have.been.called;
    outSpy.should.have.been.called;
  });

  it( 'should return the matching property (or `undefined`)', function () {
    flow = new Flow();
    flow.status('targets').should.be.an.instanceOf(Array);
    expect(flow.status('foo')).to.equal(undefined);
    expect(flow.status(null)).to.equal(undefined);
  });



});