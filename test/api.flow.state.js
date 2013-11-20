describe( 'Flow#state', function () {

  var
    state,
    flow,
    stateAlias = 'foo'
  ;

  before(function () {
    flow = new Flow({
      a: {
        b: {}
      },
      c: {
        _pendable: false,
        _name: stateAlias,
        _in: function () {
          this.wait();
        }
      }
    });
    state = flow.state;
  });

  beforeEach(function () {
    flow.go(0);
  });

  it( 'should be an object-member', function () {
    flow.should.haveOwnProperty('state');
    state.should.be.an('object');
  });

  it( 'should have a string "name" member', function () {
    state.should.haveOwnProperty('name');
    state.name.should.be.a('string');
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

  it( 'should have a boolean "pendable" member', function () {
    state.should.haveOwnProperty('pendable');
    state.pendable.should.be.a('boolean');
  });

  it( 'should reflect the "null" state by default', function () {
    state.name.should.equal('_null');
    state.index.should.equal(0);
    state.depth.should.equal(0);
    state.alias.should.equal('null');
    state.path.should.equal('..//');
    state.pendable.should.equal(true);
  });

  it( 'should reflect the "program" state as expected', function () {
    flow.go(1);
    state.name.should.equal('_program');
    state.index.should.equal(1);
    state.depth.should.equal(1);
    state.alias.should.equal('program');
    state.path.should.equal('//');
    state.pendable.should.equal(true);
  });

  it( 'should reflect the current state', function () {
    flow.go('//a');
    state.name.should.equal('a');
    state.index.should.equal(2);
    state.depth.should.equal(2);
    state.alias.should.equal('');
    state.path.should.equal('//a/');
    state.pendable.should.equal(true);

    flow.go('//c/');
    state.name.should.equal('c');
    state.index.should.equal(4);
    state.depth.should.equal(2);
    state.alias.should.equal(stateAlias);
    state.path.should.equal('//c/');
    state.pendable.should.equal(false);
  });

});