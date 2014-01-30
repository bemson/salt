describe( 'Salt#query()', function () {
  
  var salt;

  beforeEach(function () {
    salt = new Salt({
      a: {
        b: {}
      },
      b: {}
    });
  });

  it( 'should return the full path of a given query', function () {
    salt.query('//a').should.equal('//a/');
    salt.query('@program/a/@next').should.equal('//b/');
  });

  it( 'should be performed from the current state\'s perspective', function () {
    salt.query('b').should.not.be.ok;
    salt.go('//');
    salt.query('b').should.equal('//b/');
    salt.go('a');
    salt.query('b').should.equal('//a/b/');
  });

  it( 'should return an array of paths when given multiple queries', function () {
    salt.query('//a', '@program/a/@next')
      .should.be.an.instanceOf(Array)
      .and.include('//a/', '//b/')
      .and.a.lengthOf(2);
  });

  it( 'should return false if one or more queries are invalid', function () {
    salt.query('//fubar').should.not.be.ok;
    salt.query('//a/','//fubar').should.not.be.ok;
  }); 

  it( 'should return false if one or more queries are inaccessible', function () {
    salt = new Salt({
      a: {
        _restrict: true
      },
      b: {}
    });
    salt.query('//a', '//b').should.be.ok;
    salt.go('//a');
    salt.query('//a', '//b').should.not.be.ok;
  });

  it( 'should not return false, for valid inaccessible queries, if the Salt is active', function () {
    salt = new Salt({
      a: {
        _restrict: true,
        _on: function () {
          return this.query('//b');
        }
      },
      b: {}
    });
    salt.query('//a', '//b').should.be.ok;
    salt.get('//a').should.equal('//b/');
    salt.query('//a', '//b').should.not.be.ok;
  });

  it( 'should return false when querying without permission', function () {
    salt = new Salt({
      _perms: '!world'
    });
    salt.go(1).should.be.ok;
    salt.go(0).should.not.be.ok;
    salt.query(0).should.not.be.ok;
  });

});