describe( 'Salt#args', function () {

  var salt;

  it( 'should be an array', function () {
    salt = new Salt(function (x, y) {
      this.args
        .should.be.an.instanceOf(Array)
        .and.have.lengthOf(2)
        .and.contain(x, y);
    });
    salt.get(1, 'foo', 'bar');
  });

  it( 'should be a navigation only member', function () {
    salt = new Salt(function () {
      this.should.haveOwnProperty('args');
    });
    salt.go(1);
    salt.should.not.haveOwnProperty('args');
  });

  it( 'should reflect navigation arguments', function () {
    var
      xVal = {},
      yVal = {}
    ;
    salt = new Salt(function (x, y) {
      this.args.should.have.lengthOf(2);
      this.args[0].should.equal(xVal);
      this.args[1].should.equal(yVal);
      expect(x).to.equal(xVal);
      expect(y).to.equal(yVal);
    });
    salt.get(1, xVal, yVal);
  });

  it( 'should be the same array betwen states and state-phases', function () {
    var argRef;
    salt = new Salt({
      _in: function () {
        argRef = this.args;
      },
      a: function (x, y) {
        this.args.should.equal(argRef);
      }
    });
    salt.go('//a');
    salt.should.not.haveOwnProperty('args');
  });

  it( 'should preserve and restore an existing .args property, when active to idle', function () {
    var
      priv = {}
    ;
    salt = new Salt(function () {
      this.args.should.not.equal(priv);
    });
    salt.args = priv;
    salt.go(1);
    expect(salt.args).to.equal(priv);
  });

  it( 'should accept entirely new arrays', function () {
    var
      badArg = {},
      goodArg = {},
      spy = sinon.spy
    ;
    salt = new Salt({
      _in: function () {
        this.args = [badArg];
      },
      _on: function (x) {
        spy();
        expect(x).to.equal(badArg);
      }
    });
    salt.get(0, badArg);
  });

});