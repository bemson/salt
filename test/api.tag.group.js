describe( '_group tag', function () {

  var flow;

  it( 'should accept strings identifying an access group', function () {
    flow = new Flow({
      _group: 'foo'
    });
    flow.state.groups.should.not.include('foo');
    flow.go(1);
    flow.state.groups.should.include('foo');
  });

  it( 'should accept an array of strings identifying multiple access groups', function () {
    flow = new Flow({
      _group: ['foo', 'bar']
    });
    flow.state.groups.should.not.include('foo');
    flow.state.groups.should.not.include('bar');
    flow.go(1);
    flow.state.groups.should.include('foo');
    flow.state.groups.should.include('bar');
  });

  it( 'should ignore non-strings', function () {
    flow = new Flow({
      _group: [11, 'foo']
    });
    flow.state.groups.should.not.include('foo');
    flow.state.groups.should.not.include('11');
    flow.go(1);
    flow.state.groups.should.include('foo');
    flow.state.groups.should.not.include('11');
  });

  it( 'should ignore built-in relationship groups', function () {
    flow = new Flow({
      _group: 'owner'
    });
    flow.go(1);
    flow.state.groups.should.not.include('owner');
  });

  it( 'should cascade declared groups', function () {
    flow = new Flow({
      _group: ['foo', 'bar'],
      string: {
        _group: 'zee'
      },
      array: {
        _group: ['hay', 'pop']
      }
    });
    flow.state.groups.should.have.lengthOf(0);

    flow.go(1);
    flow.state.groups.should.have.lengthOf(2);
    flow.state.groups.should.include('foo');
    flow.state.groups.should.include('bar');

    flow.go('//string');
    flow.state.groups.should.have.lengthOf(3);
    flow.state.groups.should.include('foo');
    flow.state.groups.should.include('bar');
    flow.state.groups.should.include('zee');

    flow.go(1);
    flow.state.groups.should.have.lengthOf(2);
    flow.state.groups.should.include('foo');
    flow.state.groups.should.include('bar');

    flow.go('//array');
    flow.state.groups.should.have.lengthOf(4);
    flow.state.groups.should.include('foo');
    flow.state.groups.should.include('bar');
    flow.state.groups.should.include('hay');
    flow.state.groups.should.include('pop');
  });

});