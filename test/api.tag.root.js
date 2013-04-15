describe( '_root tag', function () {

  var flow;

  it( 'should identify the local root of a program branch', function () {
    var relativeQuery = '/state';
    flow = new Flow({
      unrooted: {
        state: {}
      },
      rooted: {
        _root: true,
        state: {}
      },
      state: {}
    });
    flow.go('//unrooted');
    flow.query(relativeQuery).should.equal('//state/');
    flow.go('//rooted');
    flow.query(relativeQuery).should.equal('//rooted/state/');
  });

  it( 'should accept a truthy value', function () {
    var relativeQuery = '/state';
    flow = new Flow({
      unrooted: {
        state: {}
      },
      rooted: {
        _root: 1,
        state: {}
      },
      state: {}
    });
    flow.go('//unrooted');
    flow.query(relativeQuery).should.equal('//state/');
    flow.go('//rooted');
    flow.query(relativeQuery).should.equal('//rooted/state/');
  });

  it( 'should have no effect on the program node', function () {
    flow = new Flow({
      _root: false,
      b: {}
    });
    flow.go('//b');
    flow.query('/').should.equal('//');
  });

});