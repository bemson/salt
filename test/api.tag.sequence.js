describe( '_sequence tag', function () {

  var salt;

  it( 'should navigate to all descendent states', function () {
    var
      seqSpy = sinon.spy(),
      aSpy = sinon.spy(),
      bSpy = sinon.spy()
    ;
    salt = new Salt({
      seq: {
        _sequence: true,
        _on: seqSpy,
        a: aSpy,
        b: bSpy
      }
    });
    salt.go('//seq');
    seqSpy.should.have.been.calledOnce;
    aSpy.should.have.been.calledOnce;
    bSpy.should.have.been.calledOnce;
    salt.state.path.should.equal('//seq/b/');
  });

  it( 'should exclude tagged states from a sequence, when paired with a falsy value', function () {
    var spy = sinon.spy();

    salt = new Salt({
      _sequence: 1,
      skip: {
        _sequence: 0,
        _over: spy
      },
      end: {}
    });
    salt.go(1);
    spy.should.have.been.calledOnce;
    salt.state.path.should.equal('//end/');
  });

  it( 'should add waypoints after the "in" phase', function () {
    var spy = sinon.spy();

    salt = new Salt({
      _sequence: 1,
      _in: function () {
        this.status().targets
          .should.have.lengthOf(1)
          .and.eql(['//']);
      },
      _on: function () {
        this.status().targets.should.eql(['//a/','//b/']);
        spy();
      },
      a: {},
      b: {}
    });
    salt.go(1);
    spy.should.have.been.calledOnce;
  });

});