describe( 'Query', function () {

  var
    salt
  ;

  before(function () {
    salt = new Salt({
      a: {
        b: {}
      }
    });
  });

  it( 'should resolve a state path', function () {
    salt.query('//a/b/').should.equal('//a/b/');
  });

  describe( 'compatible methods', function () {

    before(function () {
      salt = new Salt({
        state: {},
        delay: {
          _on: function (callback) {
            this.wait('complete', 0, callback);
          },
          complete: function (callback) {
            callback();
          }
        }
      });
    });

    it( 'should be .go(), .get(), .query(), and .wait()', function (done) {
      salt.go('//state/').should.be.ok;
      salt.get('//state/').should.be.ok;
      salt.query('//state/').should.be.ok;
      // navigate (and pass callback) to state that invokes .wait()
      salt.get('//delay/', done);
    });

    it( 'should return `false` when resolution fails', function () {
      salt.query('//non-existent/path/').should.equal(false);
      salt.query(-1).should.equal(false);
    });

  });

  describe( 'type', function () {

    before(function () {
      salt = new Salt({
        a: {
          _root: true,
          b: {}
        },
        b: {}
      });
    });

    describe( 'strings', function () {

      before(function () {
        salt.go(0);
      });

      it( 'should list state names and/or query-tokens, delimited by forward-slashes ("/")', function () {
        salt.query('//a/').should.be.ok;
        salt.query('//a/b/').should.be.ok;
        salt.query('//a/b/c/').should.not.be.ok;
      });

      it( 'should allow omitting the final slash', function () {
        salt.query('//a/').should.equal(salt.query('//a'));
      });

    });

    describe( 'absolute strings, prefixed with two slashes', function () {

      it( 'should start resolution at the program root', function () {
        var absQuery = '//b';

        salt.go('//a/');
        salt.query(absQuery).should.equal('//b/');
      });

    });

    describe( 'rooted strings, prefixed with one slash', function () {

      it( 'should start resolution at the (current or ancestor) rooted state', function () {
        var rootQuery = '/b';

        salt.go('//');
        salt.query(rootQuery).should.equal('//b/');

        salt.go('//a/');
        salt.query(rootQuery).should.equal('//a/b/');
      });

    });
    
    describe( 'relative strings, with no prefix', function () {

      it( 'should start resolution from the current state', function () {
        var relativeQuery = 'b';

        salt.go('//');
        salt.query(relativeQuery).should.equal('//b/');

        salt.go('//a/');
        salt.query(relativeQuery).should.equal('//a/b/');
      });

    });

    describe( 'integers', function () {

      it( 'should be the zero-indexed position of a state', function () {
        salt.query(1).should.equal('//');
        salt.query(3).should.equal('//a/b/');
        salt.query(-1).should.not.be.ok;
      });

    });

  });

  describe( 'token', function () {

    describe( '"..//" (null state)', function () {

      before(function () {
        salt = new Salt();
      });

      it( 'should return the first "null" state', function () {
        salt.query('..//').should.equal(salt.query(0));
      });

    });

    describe( '"//" (program state)', function () {

      before(function () {
        salt = new Salt();
      });

      it( 'should return the second "program" state', function () {
        salt.query('//').should.equal(salt.query(1));
      });

    });

    describe( '".." (parent)', function () {

      before(function () {
        salt = new Salt({
          father: {
            son: {}
          }
        });
      });

      it( 'should return the parent state', function () {
        salt.go('//father/son/');
        salt.query('..').should.equal('//father/');
      });

    });

    describe( '"." (self)', function () {

      before(function () {
        salt = new Salt();
      });

      it( 'should return the current state', function () {
        salt.state.path.should.equal(salt.query('.'));
      });

    });

    describe( '@null', function () {

      before(function () {
        salt = new Salt();
      });

      it( 'should return the first "null" state', function () {
        salt.query('@null').should.equal('..//');
      });

    });

    describe( '@program', function () {

      before(function () {
        salt = new Salt();
      });

      it( 'should return the second "program" state', function () {
        salt.query('@program').should.equal('//');
      });

    });

    describe( '@root', function () {

      before(function () {
        salt = new Salt({
          rooted: {
            _root: true,
            child: {}
          },
          unrooted: {
            _root: false,
            child: {}
          }
        });
      });

      it( 'should return the nearest, rooted (current or ancestor) state', function () {
        salt.go('//rooted/child/');
        salt.query('@root').should.equal('//rooted/');
      });

      it( 'should return the current state when on the "program" or "null" states', function () {
        salt.go('@null');
        salt.query('@root').should.equal('..//');

        salt.go('@program');
        salt.query('@root').should.equal('//');
      });

    });

    describe( '@self', function () {

      before(function () {
        salt = new Salt();
      });

      it( 'should return the current state', function () {
        salt.state.path.should.equal(salt.query('@self'));
      });

    });

    describe( '@parent', function () {

      before(function () {
        salt = new Salt({
          father: {
            son: {}
          }
        });
      });

      it( 'should return the parent state', function () {
        salt.go('//father/son/');
        salt.query('@parent').should.equal('//father/');
      });

    });

    describe( '@child', function () {

      before(function () {
        salt = new Salt({
          father: {
            son: {}
          }
        });
      });

      it( 'should return the first child state', function () {
        salt.go('//father/');
        salt.query('@child').should.equal('//father/son/');
      });

    });

    describe( '@next', function () {

      before(function () {
        salt = new Salt({
          a: {},
          b: {}
        });
      });

      it( 'should return the adjacent older/right state', function () {
        salt.go('//a/');
        salt.query('@next').should.equal('//b/');
      });

    });

    describe( '@previous', function () {

      before(function () {
        salt = new Salt({
          a: {},
          b: {}
        });
      });

      it( 'should return the adjacent younger/left state', function () {
        salt.go('//b/');
        salt.query('@previous').should.equal('//a/');
      });

    });

    describe( '@youngest', function () {

      before(function () {
         salt = new Salt({
          a: {},
          b: {}
        });
      });

      it( 'should return the youngest/left-most sibling state', function () {
        salt.go('//b/');
        salt.query('@youngest').should.equal('//a/');
      });

    });

    describe( '@oldest', function () {

      before(function () {
         salt = new Salt({
          a: {},
          b: {}
        });
      });

      it( 'should return the oldest/right-most sibling state', function () {
        salt.go('//a/');
        salt.query('@oldest').should.equal('//b/');
      });

    });

    describe( 'defined by the _alias tag', function () {

      before(function () {
        salt = new Salt({
          deep: {
            deep: {
              alias: {
                _alias: 'custom'
              }
            }
          },
          fake: {
            _alias: 'program'
          }
        });
      });

      it('should return the corresponding state', function () {
        salt.query('@custom').should.equal('//deep/deep/alias/');
      });

      it( 'should not alter what built-in tokens resolve', function () {
        salt.query('@program').should.equal('//')
          .and.not.equal('//fake/');
      });

    });

    describe( 'pointing to child states', function () {

      before(function () {
        salt = new Salt({
          foo: {}
        });
      });

      it( 'should return the matching child state', function () {
        salt.go(1);
        salt.query('foo').should.be.ok;
      });

      it( 'should deny targeting the program state by name', function () {
        salt.go(0);
        salt.query('_program').should.not.be.ok;
      });
    });


    describe( 'lists', function () {

      before(function () {
        salt = new Salt({
          a: {
            _restrict: true,
            b: {}
          },
          c: {}
        });
      });

      it( 'should be delimited with pipe characters', function () {
        salt.query('bacon|foo|@null').should.be.ok;
      });

      it( 'should return the first valid token per slash-group', function () {
        salt.query('@next|@previous|@null/@next|@parent|@child|@null/bar|zee|a/b').should.be.ok;
      });

    });

  });

  describe( 'limits for untrusted routines', function () {

    describe( 'with the _restrict tag', function () {

      before(function () {
        salt = new Salt({
          jail: {
            _restrict: true,
            escape: {
              _on: 1
            }
          },
          free: {}
        });
      });

      it ( 'should deny resolving paths outside a state', function () {
        salt.query('//free/').should.be.ok;
        salt.go('//jail/');
        salt.query('//free/').should.not.be.ok;

        salt.go('escape');
        salt.query('//free/').should.be.ok;
      });

    });

    describe( 'with the _conceal tag', function () {

      before(function () {
        salt = new Salt({
          superman: {
            identity: {
              _conceal: 1,
              loves: {
                loise_lane: {
                  _conceal: 0
                }
              }
            }
          }
        });
      });

      it( 'should deny resolving paths to and within a state', function () {
        salt.query('//superman').should.be.ok;
        salt.query('//superman/identity').should.not.be.ok;
      });

      it( 'should allow resolving revealed paths within a hidden branch', function () {
        salt.query('//superman').should.be.ok;
        salt.query('//superman/identity').should.not.be.ok;
        salt.query('//superman/identity/loves').should.not.be.ok;
        salt.query('//superman/identity/loves/loise_lane').should.be.ok;
      });
    });

    describe( 'with the _ingress tag', function () {

      before(function () {
        salt = new Salt({
          hallway: {
            _ingress: true,
            kitchen: {}
          }
        });
      });

      it('should deny resolving paths within a state, until it is entered', function () {
        salt.query('//hallway/kitchen/').should.not.be.ok;
        salt.go('//hallway/');
        salt.query('//hallway/kitchen/').should.be.ok;
      });

    });

  });

});