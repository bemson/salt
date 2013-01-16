describe( '_root tag', function () {

  var flow;

  it( 'should set base path for rooted queries', function () {
    flow = new Flow({
      a: {
        _root: true,
        b: 1
      },
      b: 1
    });
    flow.go(1);
    flow.query('/b').should.equal('//b/');
    flow.go(2);
    flow.query('/b').should.equal('//a/b/');
  });

  it( 'should impact queries based on the current state', function () {
    flow = new Flow({
      a: 1,
      b: {
        _root: true,
        _over: function () {
          this.wait();
        }
      },
      c: 1
    });
    flow.go(1);

    flow.go('//c/');
  });

  it( 'should be automatically set and ignored for the program root', function() {
    var
      norm = new Flow({
        a: 1
      }),
      rooted = new Flow({
        _root: true,
        a: 1
      }),
      reverse = new Flow({
        _root: false,
        a: 1
      })
    ;
    norm.go(2);
    rooted.go(2);
    reverse.go(2);
    norm.query('/a').should.equal(rooted.query('/a'));
    rooted.query('/a').should.equal(reverse.query('/a'));
  });

});