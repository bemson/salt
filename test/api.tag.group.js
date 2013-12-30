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

  it( 'should allow access to self-identifying flows', function () {
    var control = new Flow({
      _group: 'foo',
      _on: function () {
        flow.go(0).should.be.ok;
      }
    });
    flow = new Flow({
      _perms: false,
      _on: function () {
        this.perms('foo');
      }
    });
    flow.go(1);
    flow.state.perms.world.should.not.be.ok;
    flow.go(0).should.not.be.ok;
    control.go(1);
    control.state.groups.should.include('foo');
    flow.state.index.should.equal(0);
  });

  it( 'should deny access to self-identifying flows', function () {
    var control = new Flow({
      _group: 'foo',
      _on: function () {
        flow.go(0).should.not.be.ok;
      }
    });
    flow = new Flow({
      _perms: '!foo'
    });
    flow.go(1);
    flow.state.perms.foo.should.not.be.ok;
    control.go(1);
    control.state.groups.should.include('foo');
    flow.state.index.should.equal(1);
  });

  it( 'should add the group identity during any traversal', function () {
    var tally = 0;
    flow = new Flow({
      a: {
        _on: '//test',
      },
      test: {
        _group: 'foo',
        _in: function () {
          this.state.groups.should.include('foo');
          tally++;
        },
        _on: function () {
          this.state.groups.should.include('foo');
          tally++;
          this.go(0);
        },
        _out: function () {
          this.state.groups.should.include('foo');
          tally++;
        },
        _over: function () {
          this.state.groups.should.include('foo');
          tally++;
        },
        _bover: function () {
          this.state.groups.should.include('foo');
          tally++;
        },
      },
      b: {
        _on: '//a'
      }
    });
    flow.go('//b');
    tally.should.equal(5);
  });

  it( 'should left & right trim group identities', function () {
    var flow = new Flow({
      _group: '  foo  '
    });
    flow.state.groups.should.have.lengthOf(0);
    flow.go(1);
    flow.state.groups.should
      .eql(['foo'])
      .and.have.lengthOf(1);
  });

});