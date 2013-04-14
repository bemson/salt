describe( 'Flow#args()', function () {

  var flow;

  it( 'should return a unique array of sequence arguments when called with no arguments', function () {
    flow = new Flow(function (x, y) {
      this.args()
        .should.be.an.instanceOf(Array)
        .and.have.lengthOf(2)
        .and.contain(x, y)
        .and.eql(this.args())
        .and.not.equal(this.args());
    });
    flow.target(1, 'foo', 'bar');
  });

  it( 'should return the argument of the given index', function () {
    flow = new Flow(function (x, y) {
      this.args(1).should.equal(y);
    });
    flow.target(1, 'foo', 'bar');
  });

  it( 'should set the argument at the given index and return the given value', function () {
    var val = 'pop';
    flow = new Flow({
      _in: function () {
        this.args(1, val).should.equal(val);
      },
      _on: function (x, y) {
        this.args(1)
          .should.equal(val)
          .and.equal(y);
      }
    });
    flow.target(1, 'foo', 'bar');
  });

  it( 'should set all sequence arguments and return the given array', function () {
    var replacementArgs = ['zee', 'bop', 'ping'];
    flow = new Flow({
      _in: function () {
        this.args().should.have.lengthOf(2);
        this.args(replacementArgs).should.equal(replacementArgs);
        this.args().should.not.equal(replacementArgs);
      },
      _on: function (x, y, z) {
        this.args()
          .should.include(x, y, z)
          .and.eql(replacementArgs);
      }
    });
    flow.target(1, 'foo', 'bar');
  });

  it( 'should remove the last sequence argument when given it\'s index and `undefined`', function () {
    flow = new Flow({
      _in: function () {
        this.args().should.have.lengthOf(2);
        this.args(1, undefined)
          .should.equal(true);
        this.args().should.have.lengthOf(1);
      },
      _on: function () {
        [].slice.call(arguments)
          .should.have.lengthOf(1)
          .and.include('foo');
      }
    });
    flow.target(1, 'foo', 'bar');
  });

  it( 'should return false when called externally and locked', function () {
    var val = 'pop';
    flow = new Flow({
      _in: function () {
        this.wait();
      },
      _on: function (x, y, z) {
        expect(z).to.equal(val);
      },
      lock: {
        _lock: true
      }
    });
    flow.target(1, 'foo', 'bar');

    flow.args().should.eql(['foo', 'bar']);
    flow.args(2, val).should.equal(val);
    flow.go();

    flow.status().path.should.equal('//');
    flow.target('//lock', 'chick', 'zebra');
    flow.lock().should.be.ok;
    // flow.args().should.equal(false);
    flow.args(1).should.equal(false);
    flow.args(1, 'pop').should.equal(false);
    flow.args([]).should.equal(false);
  });

});