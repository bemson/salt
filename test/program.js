describe( 'Program', function () {

  var
    flow,
    corePkgDef,
    coreInst
  ;

  before(function () {
    corePkgDef = Flow.pkg('core');
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

    var programSource = {};

    before(function () {
      flow = new Flow(programSource);
      coreInst = corePkgDef(flow);
    });

    it( 'should have a value that is the source object', function () {
      coreInst.nodes[1].value.should.equal(programSource);
    });

    it( 'should be named "_program"', function () {
      coreInst.nodes[1].name.should.equal('_program');
    });

    it( 'should have the path "..//"', function () {
      coreInst.nodes[1].path.should.equal('//');
    });

  });

  describe( 'compilation', function () {

    var source;

    it( 'should use the first constructor argument as the source object', function () {
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

    it( 'should recompile the source of a given Flow instance', function () {
      var clonedFlow;
      source = {
        dog: {
          cat: {
          }
        }
      }
      flow = new Flow(source);
      clonedFlow = new Flow(flow);
      clonedFlow.query('//dog/cat').should.be.ok;
    });

    it( 'should recursively index source object members', function () {
    });

    it( 'should ignore inherited source object members', function () {
    });
    it( 'should not augment the source object/value', function () {
      "use strict";
      var programSource = {};
      Object.freeze(programSource);
      Object.isFrozen(programSource).should.be.ok;
      expect(function () {
        new Flow(programSource);
      }).to.not.throw();
    });

  });

  describe( 'state', function () {

    describe( 'names', function () {

      it( 'should begin with a letter', function () {
        flow = new Flow({
          '*fail': {},
          'success': {}
        });
        flow.query('//*fail').should.not.be.ok;
        flow.query('//success').should.be.ok;
      });

      it( 'should not be "toString"', function () {
        flow = new Flow({
          toString: {}
        });
        flow.query('//toString').should.not.be.ok;
      });

      it( 'should not contain a ".", "/", or "|" character', function () {
        flow = new Flow({
          'hello world': {},
          'hello.world': {},
          'hello/world': {},
          'hello|world': {}
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

      it( 'should not begin with an "@" symbol', function () {
        flow = new Flow({
          '@fail': 1
        });
        flow.query('//@fail').should.not.be.ok;
      });


      it( 'should not begin with a number ', function () {
        flow = new Flow({
          '2fail': 1
        });
        flow.query('//2fail').should.not.be.ok;
      });


      it( 'should not begin with a space ', function () {
        flow = new Flow({
          ' fail': 1
        });
        flow.query('// fail').should.not.be.ok;
      });

    });

    describe( 'attributes/tags', function () {

      it( 'should begin with an underscore ("_")', function () {
        flow = new Flow({
          _tag: 1,
          state: 1
        });
        flow.query('//_tag').should.not.be.ok;
        flow.query('//state').should.be.ok;
        corePkgDef(flow).nodes[1].attrs.should.include.keys('_tag');
      });

    });

  });

});