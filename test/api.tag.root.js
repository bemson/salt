describe( '_root tag', function () {

  var salt;

  it( 'should identify the local root of a program branch', function () {
    var relativeQuery = '/state';
    salt = new Salt({
      unrooted: {
        state: {}
      },
      rooted: {
        _root: true,
        state: {}
      },
      state: {}
    });
    salt.go('//unrooted');
    salt.query(relativeQuery).should.equal('//state/');
    salt.go('//rooted');
    salt.query(relativeQuery).should.equal('//rooted/state/');
  });

  it( 'should accept a truthy value', function () {
    var relativeQuery = '/state';
    salt = new Salt({
      unrooted: {
        state: {}
      },
      rooted: {
        _root: 1,
        state: {}
      },
      state: {}
    });
    salt.go('//unrooted');
    salt.query(relativeQuery).should.equal('//state/');
    salt.go('//rooted');
    salt.query(relativeQuery).should.equal('//rooted/state/');
  });

  it( 'should have no effect on the program node', function () {
    salt = new Salt({
      _root: false,
      b: {}
    });
    salt.go('//b');
    salt.query('/').should.equal('//');
  });

});