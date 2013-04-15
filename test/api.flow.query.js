describe( 'Flow#query()', function () {
  
  var flow;

  beforeEach(function () {
    flow = new Flow({
      a: {
        b: {}
      },
      b: {}
    });
  });

  it( 'should return the full path of a given query', function () {
    flow.query('//a').should.equal('//a/');
    flow.query('@program/a/@next').should.equal('//b/');
  });

  it( 'should be performed from the current state\'s perspective', function () {
    flow.query('b').should.not.be.ok;
    flow.go('//');
    flow.query('b').should.equal('//b/');
    flow.go('a');
    flow.query('b').should.equal('//a/b/');
  });

  it( 'should return an array of paths when given multiple queries', function () {
    flow.query('//a', '@program/a/@next')
      .should.be.an.instanceOf(Array)
      .and.include('//a/', '//b/')
      .and.a.lengthOf(2);
  });

  it( 'should return false if one or more queries are invalid', function () {
    flow.query('//fubar').should.not.be.ok;
    flow.query('//a/','//fubar').should.not.be.ok;
  }); 

  it( 'should return false if one or more queries are inaccessible', function () {
    flow = new Flow({
      a: {
        _restrict: true
      },
      b: {}
    });
    flow.query('//a', '//b').should.be.ok;
    flow.go('//a');
    flow.query('//a', '//b').should.not.be.ok;
  });

  it( 'should not return false, for valid inaccessible queries, if the Flow is active', function () {
    flow = new Flow({
      a: {
        _restrict: true,
        _on: function () {
          return this.query('//b');
        }
      },
      b: {}
    });
    flow.query('//a', '//b').should.be.ok;
    flow.target('//a').should.equal('//b/');
    flow.query('//a', '//b').should.not.be.ok;
  });

});