describe( 'Program', function () {

  var
    salt,
    source,
    corePkgDef,
    coreInst
  ;

  before(function () {
    corePkgDef = Salt.pkg('core');
  });

  describe( 'source object', function () {

    it( 'should be the first initialization argument', function () {
      source = {};
      corePkgDef(new Salt(source)).nodes[1].value.should.equal(source);
    });

    it( 'should be any value', function () {
      (new Salt()).should.be.ok;
      (new Salt(undefined)).should.be.ok;
      (new Salt(null)).should.be.ok;
      (new Salt('')).should.be.ok;
      (new Salt('foo bar')).should.be.ok;
      (new Salt([])).should.be.ok;
      (new Salt([1,'foo', {}])).should.be.ok;
      (new Salt({})).should.be.ok;
      (new Salt({hello: {world: 'foobar'}})).should.be.ok;
      (new Salt(1)).should.be.ok;
      (new Salt(true)).should.be.ok;
      (new Salt(false)).should.be.ok;
      (new Salt(/foo/)).should.be.ok;
    });

    it( 'should be reused from a given Salt instance', function () {
      source = {
        cats: {
          dogs: {}
        }
      };
      salt = new Salt(source);
      salt.query('//cats/dogs').should.be.ok;
      var clonedSalt = new Salt(salt);
      clonedSalt.query('//cats/dogs').should.be.ok;
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
      salt = new Salt(source);
      salt.query('//a/b/c/').should.be.ok;
    });

    it( 'should ignore inherited members', function () {
      function Obj() {}
      Obj.prototype.foo = 1;
      source = new Obj();
      source.bar = 1;
      salt = new Salt(source);
      salt.query('//foo').should.not.be.ok;
      salt.query('//bar').should.be.ok;
    });

    it( 'should preserve the source object', function () {
      "use strict";
      source = {};
      Object.freeze(source);
      Object.isFrozen(source).should.be.ok;
      expect(function () {
        new Salt(source);
      }).to.not.throw();
    });

  });

  describe( 'first state', function () {

    before(function () {
      salt = new Salt();
      coreInst = corePkgDef(salt);
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
      salt = new Salt(source);
      coreInst = corePkgDef(salt);
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

  describe( 'state', function () {

    describe( 'names', function () {

      it( 'should not begin with a number', function () {
        salt = new Salt({
          '2fail': 1,
          'success2': 1
        });
        salt.query('//2fail').should.not.be.ok;
        salt.query('//success2').should.be.ok;
      });

      it( 'should not begin with the greater-than symbol (">")', function () {
        salt = new Salt({
          '>fail': 1,
          'success>': 1
        });
        salt.query('//>fail').should.not.be.ok;
        salt.query('//success>').should.be.ok;
      });

      it( 'should not begin with the at-symbol ("@")', function () {
        salt = new Salt({
          '@fail': 1,
          'success@': 1
        });
        salt.query('//@fail').should.not.be.ok;
        salt.query('//success@').should.be.ok;
      });

      it( 'should begin with a letter', function () {
        salt = new Salt({
          'success >2@': 1
        });
        salt.query('//success >2@').should.be.ok;
      });

      it( 'should not be "toString"', function () {
        salt = new Salt({
          toString: 1,
          tostring: 1
        });
        salt.query('//toString').should.not.be.ok;
        salt.query('//tostring').should.be.ok;
      });

      it( 'should not contain period ("."), forward-slash ("/"), or pipe ("|") characters', function () {
        salt = new Salt({
          'hello world': 1,
          'hello.world': 1,
          'hello/world': 1,
          'hello|world': 1
        });

        salt.query('//hello.world').should.not.be.ok;
        salt.query('//hello/world').should.not.be.ok;
        salt.query('//hello|world').should.not.be.ok;
        salt.query('//hello world').should.be.ok;
      });

      it( 'should allow spaces', function () {
        salt = new Salt({
          'hello world': {
            'good bye, universe': {}
          }
        });
        salt.query('//hello world/good bye, universe/').should.be.ok;
      });

    });

    describe( 'attributes (or tags)', function () {

      it( 'should begin with an underscore ("_")', function () {
        salt = new Salt({
          _tag: 1,
          state_: 1
        });
        salt.query('//_tag').should.not.be.ok;
        salt.query('//state_').should.be.ok;
        corePkgDef(salt).nodes[1].attrs
          .should.include.keys('_tag')
          .and.not.include.keys('state_');
      });

    });

  });

});