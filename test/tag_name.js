describe( '_name tag', function () {

  var flow;

	it( 'should allow targeting a state with a custom string', function () {
    flow = new Flow({
      a: {
        _name: 'foo'
      }
    });

    flow.query('@foo').should.equal('//a/');
  });

	it( 'should overwrite other states with the same name', function () {
    flow = new Flow({
      a: {
        _name: 'foo'
      },
      b: {
        _name: 'foo'
      }
    });

    flow.query('@foo').should.equal('//b/');
  });

	it( 'should ignore empty, non-alphanumeric, and tokenized strings', function () {
    flow = new Flow({
      empty: {
        _name: ''
      },
      nonaplha: {
        _name: 'foo/'
      },
      tokenized: {
        _name: '@foo'
      }
    });

    flow.query('@').should.be.false;
    flow.query('@foo/').should.be.false;
    flow.query('@@foo').should.be.false;
  });

  it( 'should ignore reserved names (like @program)', function () {
    var
      prgm = {},
      reserved = 'flow|program|root|parent|next|previous|oldest|self'.split('|')
    ;
    reserved.forEach(function (name) {
      prgm[name] = {_name: name};
    });
    prgm.control = {_name:'control'};
    
    flow = new Flow(prgm);

    reserved.forEach(function (name) {
      flow.query('@' + name).should.not.equal('//' + name + '/');
    });
    flow.query('@control').should.equal('//control/');
  });

});