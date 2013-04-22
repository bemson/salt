describe( 'Program', function () {

  var
    flow,
    source,
    corePkgDef,
    coreInst
  ;

  before(function () {
    corePkgDef = Flow.pkg('core');
  });

  describe( 'source object', function () {

    it( 'should be the first initialization argument', function () {
      source = {};
      corePkgDef(new Flow(source)).nodes[1].value.should.equal(source);
    });

    it( 'should be any value', function () {
      (new Flow()).should.be.ok;
      (new Flow(undefined)).should.be.ok;
      (new Flow(null)).should.be.ok;
      (new Flow('')).should.be.ok;
      (new Flow('foo bar')).should.be.ok;
      (new Flow([])).should.be.ok;
      (new Flow([1,'foo', {}])).should.be.ok;
      (new Flow({})).should.be.ok;
      (new Flow({hello: {world: 'foobar'}})).should.be.ok;
      (new Flow(1)).should.be.ok;
      (new Flow(true)).should.be.ok;
      (new Flow(false)).should.be.ok;
      (new Flow(/foo/)).should.be.ok;
    });

    it( 'should be reused from a given Flow instance', function () {
      source = {
        cats: {
          dogs: {}
        }
      };
      flow = new Flow(source);
      flow.query('//cats/dogs').should.be.ok;
      var clonedFlow = new Flow(flow);
      clonedFlow.query('//cats/dogs').should.be.ok;
    });

  });

  describe( 'compilation', function () {

    it( 'should recursively index members, depth-first', function () {
      source = {
        a: {
          b: {
            c: {}
          }
        }
      };
      flow = new Flow(source);
      flow.query('//a/b/c/').should.be.ok;
    });

    it( 'should ignore inherited members', function () {
      function Obj() {}
      Obj.prototype.foo = 1;
      source = new Obj();
      source.bar = 1;
      flow = new Flow(source);
      flow.query('//foo').should.not.be.ok;
      flow.query('//bar').should.be.ok;
    });

    it( 'should preserve the source object', function () {
      "use strict";
      source = {};
      Object.freeze(source);
      Object.isFrozen(source).should.be.ok;
      expect(function () {
        new Flow(source);
      }).to.not.throw();
    });

  });

  describe( 'first state', function () {

    before(function () {
      flow = new Flow();
      coreInst = corePkgDef(flow);
    });

    it( 'should have a value of `undefined`', function () {
      expect(coreInst.nodes[0].value).to.equal(undefined);
    });

    it( 'should be named "_null"', function () {
      coreInst.nodes[0].name.should.equal('_null');
    });

    it( 'should have the path "..//"', function () {
      coreInst.nodes[0].path.should.equal('..//');
    });

  });

  describe( 'second state', function () {

    before(function () {
      source = {};
      flow = new Flow(source);
      coreInst = corePkgDef(flow);
    });

    it( 'should have the source object as it\'s value', function () {
      coreInst.nodes[1].value.should.equal(source);
    });

    it( 'should be named "_program"', function () {
      coreInst.nodes[1].name.should.equal('_program');
    });

    it( 'should have the path "..//"', function () {
      coreInst.nodes[1].path.should.equal('//');
    });

  });

  describe( 'states', function () {

    describe( 'names', function () {

      it( 'should begin with a letter', function () {
        flow = new Flow({
          '*fail': 1,
          ' fail': 1,
          '@fail': 1,
          '|fail': 1,
          '/fail': 1,
          'success* 2': 1
        });
        flow.query('//*fail').should.not.be.ok;
        flow.query('// fail').should.not.be.ok;
        flow.query('//@fail').should.not.be.ok;
        flow.query('//|fail').should.not.be.ok;
        flow.query('///fail').should.not.be.ok;
        flow.query('//success* 2').should.be.ok;
      });

      it( 'should not be "toString"', function () {
        flow = new Flow({
          toString: 1,
          tostring: 1
        });
        flow.query('//toString').should.not.be.ok;
        flow.query('//tostring').should.be.ok;
      });

      it( 'should not contain a ".", "/", or "|" character', function () {
        flow = new Flow({
          'hello world': 1,
          'hello.world': 1,
          'hello/world': 1,
          'hello|world': 1
        });

        flow.query('//hello world').should.be.ok;
        flow.query('//hello.world').should.not.be.ok;
        flow.query('//hello/world').should.not.be.ok;
        flow.query('//hello|world').should.not.be.ok;
      });

      it( 'should allow spaces', function () {
        flow = new Flow({
          'hello world': {
            'good bye, universe': {}
          }
        });
        flow.query('//hello world/good bye, universe/').should.be.ok;
      });

    });

    describe( 'attributes (or tags)', function () {

      it( 'should begin with an underscore ("_")', function () {
        flow = new Flow({
          _tag: 1,
          state_: 1
        });
        flow.query('//_tag').should.not.be.ok;
        flow.query('//state_').should.be.ok;
        corePkgDef(flow).nodes[1].attrs
          .should.include.keys('_tag')
          .and.not.include.keys('state_');
      });

    });

  });

});