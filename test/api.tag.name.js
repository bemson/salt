describe( '_name tag', function () {

  var flow;

  it( 'should define a custom token that targets the tagged state', function () {
    flow = new Flow({
      a: {
        _name: 'foo'
      }
    });
    flow.query('@foo').should.be.ok;
  });

  it( 'should be ignored when not a string', function () {
    flow = new Flow({
      a: {
        _name: true
      }
    });
    flow.query('@true').should.not.be.ok;
  });

  it( 'should not work if the characters ".", "|", or  "@" are present', function () {
    flow = new Flow({
      a: {
        _name: 'foo.'
      }
    });
    flow.query('@foo.').should.not.be.ok;
  });

  it( 'should not work if no alphanumeric characters are present', function () {
    flow = new Flow({
      a: {
        _name: '$'
      }
    });
    flow.query('@$').should.not.be.ok;
  });

  it( 'should have no impact is the string matches a built-in token', function () {
    flow = new Flow({
      a: {
        _name: 'program'
      }
    });
    flow.query('@program').should.not.equal('//a/');
    flow.query('@program').should.equal('//');
  });

  it( 'should be reflected in the .state.alias property', function () {
    var alias = 'foo';
    flow = new Flow({
      a: {
        _name: alias
      }
    });
    flow.go('@' + alias);
    flow.state.alias.should.equal(alias);
  });

  it( 'should be applied to the last state using a given alias', function () {
    var alias = 'foo';
    flow = new Flow({
      a: {
        _name: alias
      },
      b: {
        _name: alias
      }
    });
    flow.go('@' + alias);
    flow.state.name.should.equal('b');
    flow.go('//a');
    flow.state.alias.should.be.empty;
  });

});