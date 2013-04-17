describe( 'Flow#state', function () {

  var
    state,
    flow
  ;

  before(function () {
    flow = new Flow({
      a: {
        b: {}
      },
      c: {
        _pendable: false,
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

  it( 'should have a "name" member', function () {
    state.should.haveOwnProperty('name');
  });

  it( 'should have an "index" member', function () {
    state.should.haveOwnProperty('index');
  });

  it( 'should have a "depth" member', function () {
    state.should.haveOwnProperty('depth');
  });

  it( 'should have an "path" member', function () {
    state.should.haveOwnProperty('path');
  });

  it( 'should have an "phase" member', function () {
    state.should.haveOwnProperty('phase');
  });

  it( 'should have an "pendable" member', function () {
    state.should.haveOwnProperty('pendable');
  });


  it( 'should reflect the null state by default', function () {
    expect(state.name).to.equal('_null');
    expect(state.index).to.equal(0);
    expect(state.depth).to.equal(0);
    expect(state.path).to.equal('..//');
    expect(state.phase).to.equal('_on');
    expect(state.pendable).to.equal(true);
  });

  it( 'should reflect the current state', function () {
    flow.go('//a');
    state.name.should.equal('a');
    state.index.should.equal(2);
    state.depth.should.equal(2);
    state.path.should.equal('//a/');
    state.phase.should.equal('_on');
    state.pendable.should.equal(true);

    flow.go('//c/');
    state.name.should.equal('c');
    state.index.should.equal(4);
    state.depth.should.equal(2);
    state.path.should.equal('//c/');
    state.phase.should.equal('_in');
    state.pendable.should.equal(false);
  });

});