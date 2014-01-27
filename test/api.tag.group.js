describe( '_group tag', function () {

  var salt;

  it( 'should accept strings identifying an access group', function () {
    salt = new Salt({
      _group: 'foo'
    });
    salt.state.groups.should.not.include('foo');
    salt.go(1);
    salt.state.groups.should.include('foo');
  });

  it( 'should accept an array of strings identifying multiple access groups', function () {
    salt = new Salt({
      _group: ['foo', 'bar']
    });
    salt.state.groups.should.not.include('foo');
    salt.state.groups.should.not.include('bar');
    salt.go(1);
    salt.state.groups.should.include('foo');
    salt.state.groups.should.include('bar');
  });

  it( 'should ignore non-strings', function () {
    salt = new Salt({
      _group: [11, 'foo']
    });
    salt.state.groups.should.not.include('foo');
    salt.state.groups.should.not.include('11');
    salt.go(1);
    salt.state.groups.should.include('foo');
    salt.state.groups.should.not.include('11');
  });

  it( 'should ignore built-in relationship groups', function () {
    salt = new Salt({
      _group: 'owner'
    });
    salt.go(1);
    salt.state.groups.should.not.include('owner');
  });

  it( 'should cascade declared groups', function () {
    salt = new Salt({
      _group: ['foo', 'bar'],
      string: {
        _group: 'zee'
      },
      array: {
        _group: ['hay', 'pop']
      }
    });
    salt.state.groups.should.have.lengthOf(0);

    salt.go(1);
    salt.state.groups.should.have.lengthOf(2);
    salt.state.groups.should.include('foo');
    salt.state.groups.should.include('bar');

    salt.go('//string');
    salt.state.groups.should.have.lengthOf(3);
    salt.state.groups.should.include('foo');
    salt.state.groups.should.include('bar');
    salt.state.groups.should.include('zee');

    salt.go(1);
    salt.state.groups.should.have.lengthOf(2);
    salt.state.groups.should.include('foo');
    salt.state.groups.should.include('bar');

    salt.go('//array');
    salt.state.groups.should.have.lengthOf(4);
    salt.state.groups.should.include('foo');
    salt.state.groups.should.include('bar');
    salt.state.groups.should.include('hay');
    salt.state.groups.should.include('pop');
  });

  it( 'should allow access to self-identifying salts', function () {
    var control = new Salt({
      _group: 'foo',
      _on: function () {
        salt.go(0).should.be.ok;
      }
    });
    salt = new Salt({
      _perms: false,
      _on: function () {
        this.perms('foo');
      }
    });
    salt.go(1);
    salt.state.perms.world.should.not.be.ok;
    salt.go(0).should.not.be.ok;
    control.go(1);
    control.state.groups.should.include('foo');
    salt.state.index.should.equal(0);
  });

  it( 'should deny access to self-identifying salts', function () {
    var control = new Salt({
      _group: 'foo',
      _on: function () {
        salt.go(0).should.not.be.ok;
      }
    });
    salt = new Salt({
      _perms: '!foo'
    });
    salt.go(1);
    salt.state.perms.foo.should.not.be.ok;
    control.go(1);
    control.state.groups.should.include('foo');
    salt.state.index.should.equal(1);
  });

  it( 'should add the group identity during any traversal', function () {
    var tally = 0;
    salt = new Salt({
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
    salt.go('//b');
    tally.should.equal(5);
  });

  it( 'should left & right trim group identities', function () {
    var salt = new Salt({
      _group: '  foo  '
    });
    salt.state.groups.should.have.lengthOf(0);
    salt.go(1);
    salt.state.groups.should
      .eql(['foo'])
      .and.have.lengthOf(1);
  });

});