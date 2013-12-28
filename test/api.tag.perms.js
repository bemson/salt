describe( '_perms tag', function () {

  var flow;

  it( 'should cascade permission settings', function () {
    var
      flow = new Flow({
        _perms: 'world',
        jail: {
          _perms: '!world',
          solitary: {
            _perms: '!owner'
          }
        }
      }),
      master = new Flow(function () {
        flow.state.perms.world.should.not.be.ok;
        flow.state.perms.owner.should.be.ok;
        flow.owner(this).should.be.ok;
        flow.go('solitary');
        flow.state.perms.owner.should.not.be.ok;
      })
    ;
    flow.state.perms.world.should.be.ok;
    flow.state.perms.owner.should.be.ok;
    flow.go('//jail');
    flow.state.perms.world.should.not.be.ok;
    flow.state.perms.owner.should.be.ok;
    master.go(1);
    flow.state.path.should.equal('//jail/solitary/');
    flow.state.perms.world.should.not.be.ok;
    flow.state.perms.owner.should.not.be.ok;
  });

  it( 'should restore parent permissions, if changed procedurally', function () {
    flow = new Flow({
      _perms: '!owner',
      _in: function () {
        this.perms('owner').should.be.ok;
      },
      child: {
        _perms: '!owner'
      }
    });
    flow.go('//child');
    flow.state.perms.owner.should.not.be.ok;
    flow.go('@parent');
    flow.state.perms.owner.should.be.ok;
  });

  it( 'should allow/deny arbitrary groups', function () {
    flow = new Flow({
      _perms: 'foo',
      a: {
        _perms: '!foo'
      }
    });
    flow.go(1);
    flow.state.perms.should.haveOwnProperty('foo');
    flow.state.perms.foo.should.be.ok;

    flow.go('//a');
    flow.state.perms.should.haveOwnProperty('foo');
    flow.state.perms.foo.should.not.be.ok;

    flow.go(0);
    flow.state.perms.should.not.haveOwnProperty('foo');
  });

});