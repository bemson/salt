describe( '_perms tag', function () {

  var salt;

  it( 'should cascade permission settings', function () {
    var
      salt = new Salt({
        _perms: 'world',
        jail: {
          _perms: '!world',
          solitary: {
            _perms: '!owner'
          }
        }
      }),
      master = new Salt(function () {
        salt.state.perms.world.should.not.be.ok;
        salt.state.perms.owner.should.be.ok;
        salt.owner(this).should.be.ok;
        salt.go('solitary');
        salt.state.perms.owner.should.not.be.ok;
      })
    ;
    salt.state.perms.world.should.be.ok;
    salt.state.perms.owner.should.be.ok;
    salt.go('//jail');
    salt.state.perms.world.should.not.be.ok;
    salt.state.perms.owner.should.be.ok;
    master.go(1);
    salt.state.path.should.equal('//jail/solitary/');
    salt.state.perms.world.should.not.be.ok;
    salt.state.perms.owner.should.not.be.ok;
  });

  it( 'should restore parent permissions, if changed procedurally', function () {
    salt = new Salt({
      _perms: '!owner',
      _in: function () {
        this.perms('owner').should.be.ok;
      },
      child: {
        _perms: '!owner'
      }
    });
    salt.go('//child');
    salt.state.perms.owner.should.not.be.ok;
    salt.go('@parent');
    salt.state.perms.owner.should.be.ok;
  });

  it( 'should allow/deny arbitrary groups', function () {
    salt = new Salt({
      _perms: 'foo',
      a: {
        _perms: '!foo'
      }
    });
    salt.go(1);
    salt.state.perms.should.haveOwnProperty('foo');
    salt.state.perms.foo.should.be.ok;

    salt.go('//a');
    salt.state.perms.should.haveOwnProperty('foo');
    salt.state.perms.foo.should.not.be.ok;

    salt.go(0);
    salt.state.perms.should.not.haveOwnProperty('foo');
  });

});