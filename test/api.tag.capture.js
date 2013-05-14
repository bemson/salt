describe( '_capture tag', function () {

  var flow;

  it( 'should identify sub-instances to store', function () {
    var
      fooProgram = {},
      spy = sinon.spy()
    ;
    flow = new Flow({
      _capture: {is:fooProgram},
      _on: function () {
        new Flow();
        new Flow(fooProgram);
        spy();
      }
    });
    flow.go(1);
    flow.subs().should.equal(1);
    spy.should.have.been.calledOnce;
  });

  it( 'should capture all sub-instances when `true`', function () {
    var spy = sinon.spy();
    flow = new Flow({
      _sequence: 1,
      all: {
        _capture: true,
        _in: function () {
          this.subs().should.have.lengthOf(0);
          new Flow();
          new Flow();
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
    flow.go(1);
    flow.subs().should.equal(0);
    spy.should.have.been.calledOnce;
  });

  it( 'should capturing no sub-instances when `false`', function () {
    var spy = sinon.spy();
    flow = new Flow({
      _sequence: 1,
      none: {
        _capture: false,
        _in: function () {
          this.subs().should.have.lengthOf(0);
          new Flow();
          new Flow();
          this.subs().should.have.lengthOf(2);
        },
        _on: function () {
          this.subs().should.have.lengthOf(0);
          spy();
        }
      }
    });
    flow.go(1);
    flow.subs().should.equal(0);
    spy.should.have.been.calledOnce;
  });

});