describe( 'Flow', function () {

  it( 'should throw without the `new` statement', function () {
    expect(Flow).to.throw();
  });

  it( 'should return an instance', function () {
    (new Flow()).should.be.an.instanceOf(Flow);
  });

  it( 'should accept zero arguments', function () {
    (new Flow()).should.be.ok;
  });

  it( 'should expect two arguments', function () {
    Flow.length.should.equal(2);
  });

  it( 'should compile a depth-first index of states (the "program") from the first argument\'s local members', function () {
    var pkgInst = Flow.pkg('core')(new Flow({
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
    var pkgInst = Flow.pkg('core')(new Flow(new Thing()));

    pkgInst.nodes.length.should.equal(3);
    pkgInst.nodes[2].name.should.equal('local');

    function Thing() {
      this.local = {}
    }
    Thing.prototype.inherited = 'inherited property';
  });

  it( 'should pass the second argument to delegating packages when it\'s an object', function () {
    var
      coreInitSpy = sinon.spy(Flow.pkg('core'), 'init'),
      objArg = {},
      nonObjArg = 'not an object'
    ;
    new Flow('anything', objArg);
    coreInitSpy.should.have.been.calledWithExactly(objArg);

    new Flow('anything', nonObjArg);
    coreInitSpy.should.not.have.been.calledWith(nonObjArg);
    Flow.pkg('core').init.restore();
  });

  describe( '::pkg()', function () {

    it( 'should be a member function', function () {
      Flow.should.itself.respondTo('pkg');
    });

    it( 'should return an array of strings when called with no arguments', function () {
      Flow.pkg().should.be.an.instanceOf(Array);
    });

    it( 'should list "core" as the only defined package', function () {
      Flow.pkg()[0].should.equal('core');
    });

    it( 'should return a package-definition (singleton function) when given the same string', function () {
      Flow.pkg('core').should.equal(Flow.pkg('core'));
      Flow.pkg('core').should.be.a('function');
    });
  });

  describe( '.version', function () {

    it( 'should be a member property', function () {
      Flow.hasOwnProperty('version').should.be.ok;
    });

    it( 'should be a semver formatted string', function () {
      Flow.version
        .should.be.a('string')
        .and.match(/^\d+\.\d+\.\d+$/);
    });

  });

});