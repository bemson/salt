describe( 'Salt#state', function () {

  var
    state,
    salt,
    stateAlias = 'foo'
  ;

  before(function () {
    salt = new Salt({
      _group: 'pop',
      a: {
        _root: 1,
        _perms: '!sub',
        b: {
          _group: 'zee'
        }
      },
      c: {
        _perms: '!owner',
        _pins: false,
        _alias: stateAlias,
        _in: function () {
          this.wait();
        }
      }
    });
    state = salt.state;
  });

  beforeEach(function () {
    salt.go(0);
  });

  it( 'should be an object-member', function () {
    salt.should.haveOwnProperty('state');
    state.should.be.an('object');
  });

  it( 'should have a string "name" member', function () {
    state.should.haveOwnProperty('name');
    state.name.should.be.a('string');
  });

  it( 'should have a boolean "root" member', function () {
    state.should.haveOwnProperty('root');
    state.root.should.be.a('boolean');
  });

  it( 'should have a string "alias" member', function () {
    state.should.haveOwnProperty('alias');
    state.alias.should.be.a('string');
  });

  it( 'should have a numeric "index" member', function () {
    state.should.haveOwnProperty('index');
    state.index.should.be.a('number');
  });

  it( 'should have a numeric "depth" member', function () {
    state.should.haveOwnProperty('depth');
    state.depth.should.be.a('number');
  });

  it( 'should have a string "path" member', function () {
    state.should.haveOwnProperty('path');
    state.path.should.be.a('string');
  });

  it( 'should have a boolean "pins" member', function () {
    state.should.haveOwnProperty('pins');
    state.pins.should.be.a('boolean');
  });

  it( 'should have a object "perms" member', function () {
    state.should.haveOwnProperty('perms');
    state.perms.should.be.an('object');
  });

  it( 'should have an array "groups" member', function () {
    state.should.haveOwnProperty('groups');
    state.groups.should.be.a.instanceOf(Array);
  });

  it( 'should reflect the "null" state by default', function () {
    state.name.should.equal('_null');
    state.index.should.equal(0);
    state.depth.should.equal(0);
    state.alias.should.equal('null');
    state.path.should.equal('..//');
    state.pins.should.equal(true);
    state.root.should.equal(true);
    state.perms.should.deep.equal({world: true, owner: true, sub: true, self: true});
    state.groups.should.have.lengthOf(0);
  });

  it( 'should reflect the "program" state as expected', function () {
    salt.go(1);
    state.name.should.equal('_program');
    state.index.should.equal(1);
    state.depth.should.equal(1);
    state.alias.should.equal('program');
    state.path.should.equal('//');
    state.pins.should.equal(true);
    state.root.should.equal(true);
    state.perms.should.deep.equal({world: true, owner: true, sub: true, self: true});
    state.groups.should.have.lengthOf(1);
    state.groups.should.include('pop');
  });

  it( 'should reflect the current state', function () {
    salt.go('//a');
    state.name.should.equal('a');
    state.index.should.equal(2);
    state.depth.should.equal(2);
    state.alias.should.equal('');
    state.path.should.equal('//a/');
    state.pins.should.equal(true);
    state.root.should.equal(true);
    state.perms.sub.should.not.be.ok;
    state.groups.should.have.lengthOf(1);
    state.groups.should.include('pop');

    salt.go('//c/');
    state.name.should.equal('c');
    state.index.should.equal(4);
    state.depth.should.equal(2);
    state.alias.should.equal(stateAlias);
    state.path.should.equal('//c/');
    state.pins.should.equal(false);
    state.root.should.equal(false);
    state.perms.owner.should.not.be.ok;
    state.groups.should.have.lengthOf(1);
    state.groups.should.include('pop');
  });

});