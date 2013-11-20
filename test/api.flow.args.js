describe( 'Flow#args', function () {

  var flow;

  it( 'should be an array', function () {
    flow = new Flow(function (x, y) {
      this.args
        .should.be.an.instanceOf(Array)
        .and.have.lengthOf(2)
        .and.contain(x, y);
    });
    flow.target(1, 'foo', 'bar');
  });

  it( 'should be a navigation only member', function () {
    flow = new Flow(function () {
      this.should.haveOwnProperty('args');
    });
    flow.go(1);
    flow.should.not.haveOwnProperty('args');
  });

  it( 'should reflect navigation arguments', function () {
    var
      xVal = {},
      yVal = {}
    ;
    flow = new Flow(function (x, y) {
      this.args.should.have.lengthOf(2);
      this.args[0].should.equal(xVal);
      this.args[1].should.equal(yVal);
      expect(x).to.equal(xVal);
      expect(y).to.equal(yVal);
    });
    flow.target(1, xVal, yVal);
  });

  it( 'should be the same array betwen states and state-phases', function () {
    var argRef;
    flow = new Flow({
      _in: function () {
        argRef = this.args;
      },
      a: function (x, y) {
        this.args.should.equal(argRef);
      }
    });
    flow.go('//a');
    flow.should.not.haveOwnProperty('args');
  });

  it( 'should preserve and restore an existing .args property, when active to idle', function () {
    var
      priv = {}
    ;
    flow = new Flow(function () {
      this.args.should.not.equal(priv);
    });
    flow.args = priv;
    flow.go(1);
    expect(flow.args).to.equal(priv);
  });

  it( 'should accept entirely new arrays', function () {
    var
      badArg = {},
      goodArg = {},
      spy = sinon.spy
    ;
    flow = new Flow({
      _in: function () {
        this.args = [badArg];
      },
      _on: function (x) {
        spy();
        expect(x).to.equal(badArg);
      }
    });
    flow.target(0, badArg);
  });

});