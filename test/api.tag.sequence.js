describe( '_sequence tag', function () {

  var salt;

  it( 'should navigate descendants of a state', function () {
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

  it( 'should not work targeting a descendant of the tagged state', function () {
    var
      aSpy = sinon.spy(),
      bSpy = sinon.spy()
    ''
    salt = new Salt({
      seq: {
        a: aSpy,
        b: bSpy
      }
    });
    salt.go('//seq/a/');
    aSpy.should.have.been.calledOnce;
    bSpy.should.not.have.been.called;
    salt.state.path.should.equal('//seq/a/');
  });

  it( 'should add descendants as waypoints', function () {
    var aSpy = sinon.spy();
    salt = new Salt({
      seq: {
        _sequence: 1,
        a: {
          _in: function () {
            this.status().targets.should.eql(['//seq/a/','//end/']);
            aSpy();
          }
        }
      },
      end: {}
    });
    salt.go('//seq/', '//end/');
    aSpy.should.have.been.calledOnce;
    salt.state.path.should.equal('//end/');
  });


});