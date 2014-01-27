describe( '_alias tag', function () {

  var salt;

  it( 'should define a custom token that targets the tagged state', function () {
    salt = new Salt({
      a: {
        _alias: 'foo'
      }
    });
    salt.query('@foo').should.be.ok;
  });

  it( 'should be ignored when not a string', function () {
    salt = new Salt({
      a: {
        _alias: true
      }
    });
    salt.query('@true').should.not.be.ok;
  });

  it( 'should not work if the characters ".", "|", or  "@" are present', function () {
    salt = new Salt({
      a: {
        _alias: 'foo.'
      }
    });
    salt.query('@foo.').should.not.be.ok;
  });

  it( 'should not work if no alphanumeric characters are present', function () {
    salt = new Salt({
      a: {
        _alias: '$'
      }
    });
    salt.query('@$').should.not.be.ok;
  });

  it( 'should have no impact is the string matches a built-in token', function () {
    salt = new Salt({
      a: {
        _alias: 'program'
      }
    });
    salt.query('@program').should.not.equal('//a/');
    salt.query('@program').should.equal('//');
  });

  it( 'should be reflected in the .state.alias property', function () {
    var alias = 'foo';
    salt = new Salt({
      a: {
        _alias: alias
      }
    });
    salt.go('@' + alias);
    salt.state.alias.should.equal(alias);
  });

  it( 'should be applied to the last state using a given alias', function () {
    var alias = 'foo';
    salt = new Salt({
      a: {
        _alias: alias
      },
      b: {
        _alias: alias
      }
    });
    salt.go('@' + alias);
    salt.state.name.should.equal('b');
    salt.go('//a');
    salt.state.alias.should.be.empty;
  });

});