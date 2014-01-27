describe( '_capture tag', function () {

  var salt;

  it( 'should identify sub-instances to store', function () {
    var
      fooProgram = {},
      spy = sinon.spy()
    ;
    salt = new Salt({
      _capture: {is:fooProgram},
      _on: function () {
        new Salt();
        new Salt(fooProgram);
        spy();
      }
    });
    salt.go(1);
    salt.subs().should.equal(1);
    spy.should.have.been.calledOnce;
  });

  it( 'should capture all sub-instances when `true`', function () {
    var spy = sinon.spy();
    salt = new Salt({
      _sequence: 1,
      all: {
        _capture: true,
        _in: function () {
          this.subs().should.have.lengthOf(0);
          new Salt();
          new Salt();
          this.subs().should.have.lengthOf(2);
        },
        _on: function () {
          this.subs().should.have.lengthOf(2);
          this.subs('remove', true);
          this.subs().should.have.lengthOf(0);
          spy();
        }
      }
    });
    salt.go(1);
    salt.subs().should.equal(0);
    spy.should.have.been.calledOnce;
  });

  it( 'should capturing no sub-instances when `false`', function () {
    var spy = sinon.spy();
    salt = new Salt({
      _sequence: 1,
      none: {
        _capture: false,
        _in: function () {
          this.subs().should.have.lengthOf(0);
          new Salt();
          new Salt();
          this.subs().should.have.lengthOf(2);
        },
        _on: function () {
          this.subs().should.have.lengthOf(0);
          spy();
        }
      }
    });
    salt.go(1);
    salt.subs().should.equal(0);
    spy.should.have.been.calledOnce;
  });

});