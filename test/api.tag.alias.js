describe( '_alias tag', function () {

  var flow;

  it( 'should define a custom token that targets the tagged state', function () {
    flow = new Flow({
      a: {
        _alias: 'foo'
      }
    });
    flow.query('@foo').should.be.ok;
  });

  it( 'should be ignored when not a string', function () {
    flow = new Flow({
      a: {
        _alias: true
      }
    });
    flow.query('@true').should.not.be.ok;
  });

  it( 'should not work if the characters ".", "|", or  "@" are present', function () {
    flow = new Flow({
      a: {
        _alias: 'foo.'
      }
    });
    flow.query('@foo.').should.not.be.ok;
  });

  it( 'should not work if no alphanumeric characters are present', function () {
    flow = new Flow({
      a: {
        _alias: '$'
      }
    });
    flow.query('@$').should.not.be.ok;
  });

  it( 'should have no impact is the string matches a built-in token', function () {
    flow = new Flow({
      a: {
        _alias: 'program'
      }
    });
    flow.query('@program').should.not.equal('//a/');
    flow.query('@program').should.equal('//');
  });

  it( 'should be reflected in the .state.alias property', function () {
    var alias = 'foo';
    flow = new Flow({
      a: {
        _alias: alias
      }
    });
    flow.go('@' + alias);
    flow.state.alias.should.equal(alias);
  });

  it( 'should be applied to the last state using a given alias', function () {
    var alias = 'foo';
    flow = new Flow({
      a: {
        _alias: alias
      },
      b: {
        _alias: alias
      }
    });
    flow.go('@' + alias);
    flow.state.name.should.equal('b');
    flow.go('//a');
    flow.state.alias.should.be.empty;
  });

});