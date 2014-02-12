describe( 'Salt', function () {

  it( 'should throw without the `new` statement', function () {
    expect(Salt).to.throw();
  });

  it( 'should return an instance', function () {
    (new Salt()).should.be.an.instanceOf(Salt);
  });

  it( 'should accept zero arguments', function () {
    (new Salt()).should.be.ok;
  });

  it( 'should expect two arguments', function () {
    Salt.length.should.equal(2);
  });

  it( 'should compile a depth-first index of states (the "program") from the first argument\'s local members', function () {
    var pkgInst = Salt.pkg('core')(new Salt({
      a: {
        c: {}
      },
      b: {}
    }));
    pkgInst.nodes.length.should.equal(5);
    pkgInst.nodes[2].name.should.equal('a');
    pkgInst.nodes[3].name.should.equal('c');
    pkgInst.nodes[4].name.should.equal('b');
  });

  it( 'should ignore inherited members of the first argument', function () {
    var pkgInst = Salt.pkg('core')(new Salt(new Thing()));

    pkgInst.nodes.length.should.equal(3);
    pkgInst.nodes[2].name.should.equal('local');

    function Thing() {
      this.local = {};
    }
    Thing.prototype.inherited = 'inherited property';
  });

  it( 'should pass the second argument to delegating packages when it\'s an object', function () {
    var
      coreInitSpy = sinon.spy(Salt.pkg('core'), 'init'),
      objArg = {},
      nonObjArg = 'not an object'
    ;
    new Salt('anything', objArg);
    coreInitSpy.should.have.been.calledWithExactly(objArg);

    new Salt('anything', nonObjArg);
    coreInitSpy.should.not.have.been.calledWith(nonObjArg);
    Salt.pkg('core').init.restore();
  });

  describe( '::pkg()', function () {

    it( 'should be a member function', function () {
      Salt.should.itself.respondTo('pkg');
    });

    it( 'should return an array of strings when called with no arguments', function () {
      Salt.pkg().should.be.an.instanceOf(Array);
    });

    it( 'should list "core" as the only defined package', function () {
      Salt.pkg()[0].should.equal('core');
    });

    it( 'should return a package-definition (singleton function) when given the same string', function () {
      Salt.pkg('core').should.equal(Salt.pkg('core'));
      Salt.pkg('core').should.be.a('function');
    });
  });

  describe( '.version', function () {

    it( 'should be a member property', function () {
      Salt.hasOwnProperty('version').should.be.ok;
    });

    it( 'should be a semver formatted string', function () {
      Salt.version
        .should.be.a('string')
        .and.match(/^\d+\.\d+\.\d+$/);
    });

  });

});