describe( 'Query', function () {

  var
    flow
  ;

  before(function () {
    flow = new Flow({
      a: {
        b: {}
      }
    });
  });

  it( 'should resolve a state path', function () {
    flow.query('//a/b/').should.equal('//a/b/');
  });

  describe( 'compatible methods', function () {

    before(function () {
      flow = new Flow({
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

    it( 'should be .go(), .target(), .query(), and .wait()', function (done) {
      flow.go('//state/').should.be.ok;
      flow.target('//state/').should.be.ok;
      flow.query('//state/').should.be.ok;
      // navigate (and pass callback) to state that invokes .wait()
      flow.target('//delay/', done);
    });

    it( 'should return `false` when resolution fails', function () {
      flow.query('//non-existent/path/').should.equal(false);
      flow.query(-1).should.equal(false);
    });

  });

  describe( 'type', function () {

    before(function () {
      flow = new Flow({
        a: {
          _root: true,
          b: {}
        },
        b: {}
      });
    });

    describe( 'strings', function () {

      before(function () {
        flow.go(0);
      });

      it( 'should list state names and/or query-tokens, delimited by forward-slashes ("/")', function () {
        flow.query('//a/').should.be.ok;
        flow.query('//a/b/').should.be.ok;
        flow.query('//a/b/c/').should.not.be.ok;
      });

      it( 'should allow omitting the final slash', function () {
        flow.query('//a/').should.equal(flow.query('//a'));
      });

    });

    describe( 'absolute strings, prefixed with two slashes', function () {

      it( 'should start resolution at the program root', function () {
        var absQuery = '//b';

        flow.go('//a/');
        flow.query(absQuery).should.equal('//b/');
      });

    });

    describe( 'rooted strings, prefixed with one slash', function () {

      it( 'should start resolution at the (current or ancestor) rooted state', function () {
        var rootQuery = '/b';

        flow.go('//');
        flow.query(rootQuery).should.equal('//b/');

        flow.go('//a/');
        flow.query(rootQuery).should.equal('//a/b/');
      });

    });
    
    describe( 'relative strings, with no prefix', function () {

      it( 'should start resolution from the current state', function () {
        var relativeQuery = 'b';

        flow.go('//');
        flow.query(relativeQuery).should.equal('//b/');

        flow.go('//a/');
        flow.query(relativeQuery).should.equal('//a/b/');
      });

    });

    describe( 'integers', function () {

      it( 'should be the zero-indexed position of a state', function () {
        flow.query(1).should.equal('//');
        flow.query(3).should.equal('//a/b/');
        flow.query(-1).should.not.be.ok;
      });

    });

    describe( 'functions from .callbacks()', function () {

      before(function () {
        flow.go(1);
      });

      it( 'should behave like strings', function () {
        var
          absQuery = flow.callbacks().a.b,
          tokenizedQuery = flow.callbacks('@child/@oldest')
        ;

        flow.query(absQuery).should.equal('//a/b/');
        flow.query(tokenizedQuery).should.equal('//b/');
      });

    });

  });

  describe( 'token', function () {

    describe( '"..//" (null state)', function () {

      before(function () {
        flow = new Flow();
      });

      it( 'should return the first "null" state', function () {
        flow.query('..//').should.equal(flow.query(0));
      });

    });

    describe( '"//" (program state)', function () {

      before(function () {
        flow = new Flow();
      });

      it( 'should return the second "program" state', function () {
        flow.query('//').should.equal(flow.query(1));
      });

    });

    describe( '".." (parent)', function () {

      before(function () {
        flow = new Flow({
          father: {
            son: {}
          }
        });
      });

      it( 'should return the parent state', function () {
        flow.go('//father/son/');
        flow.query('..').should.equal('//father/');
      });

    });

    describe( '"." (self)', function () {

      before(function () {
        flow = new Flow();
      });

      it( 'should return the current state', function () {
        flow.state.path.should.equal(flow.query('.'));
      });

    });

    describe( '@null', function () {

      before(function () {
        flow = new Flow();
      });

      it( 'should return the first "null" state', function () {
        flow.query('@null').should.equal('..//');
      });

    });

    describe( '@program', function () {

      before(function () {
        flow = new Flow();
      });

      it( 'should return the second "program" state', function () {
        flow.query('@program').should.equal('//');
      });

    });

    describe( "@root", function () {

      before(function () {
        flow = new Flow({
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
        flow.go('//rooted/child/');
        flow.query('@root').should.equal('//rooted/');
      });

      it( 'should return the current state when on the "program" or "null" states', function () {
        flow.go('@null');
        flow.query('@root').should.equal('..//');

        flow.go('@program');
        flow.query('@root').should.equal('//');
      });

    });

    describe( '@self', function () {

      before(function () {
        flow = new Flow();
      });

      it( 'should return the current state', function () {
        flow.state.path.should.equal(flow.query('@self'));
      });

    });

    describe( '@parent', function () {

      before(function () {
        flow = new Flow({
          father: {
            son: {}
          }
        });
      });

      it( 'should return the parent state', function () {
        flow.go('//father/son/');
        flow.query('@parent').should.equal('//father/');
      });

    });

    describe( '@child', function () {

      before(function () {
        flow = new Flow({
          father: {
            son: {}
          }
        });
      });

      it( 'should return the first child state', function () {
        flow.go('//father/');
        flow.query('@child').should.equal('//father/son/');
      });

    });

    describe( '@next', function () {

      before(function () {
        flow = new Flow({
          a: {},
          b: {}
        });
      });

      it( 'should return the adjacent older/right state', function () {
        flow.go('//a/');
        flow.query('@next').should.equal('//b/');
      });

    });

    describe( '@previous', function () {

      before(function () {
        flow = new Flow({
          a: {},
          b: {}
        });
      });

      it( 'should return the adjacent younger/left state', function () {
        flow.go('//b/');
        flow.query('@previous').should.equal('//a/');
      });

    });

    describe( '@youngest', function () {

      before(function () {
         flow = new Flow({
          a: {},
          b: {}
        });
      });

      it( 'should return the youngest/left-most sibling state', function () {
        flow.go('//b/');
        flow.query('@youngest').should.equal('//a/');
      });

    });

    describe( '@oldest', function () {

      before(function () {
         flow = new Flow({
          a: {},
          b: {}
        });
      });

      it( 'should return the oldest/right-most sibling state', function () {
        flow.go('//a/');
        flow.query('@oldest').should.equal('//b/');
      });

    });

    describe( 'defined by the _name tag', function () {

      before(function () {
        flow = new Flow({
          deep: {
            deep: {
              alias: {
                _name: 'custom'
              }
            }
          },
          fake: {
            _name: 'program'
          }
        })
      });

      it('should return the corresponding state', function () {
        flow.query('@custom').should.equal('//deep/deep/alias/');
      });

      it( 'should not alter what built-in tokens resolve', function () {
        flow.query('@program').should.equal('//')
          .and.not.equal('//fake/');
      });

    });

    describe( 'pointing to child states', function () {

      before(function () {
        flow = new Flow({
          foo: {}
        });
      });

      it( 'should return the matching child state', function () {
        flow.go(1);
        flow.query('foo').should.be.ok;
      });

      it( 'should deny targeting the program state by name', function () {
        flow.go(0);
        flow.query('_program').should.not.be.ok;
      });
    });


    describe( 'lists', function () {

      before(function () {
        flow = new Flow({
          a: {
            _restrict: true,
            b: {}
          },
          c: {}
        });
      });

      it( 'should be delimited with pipe characters', function () {
        flow.query('bacon|foo|@null').should.be.ok;
      });

      it( 'should return the first valid token per slash-group', function () {
        flow.query('@next|@previous|@null/@next|@parent|@child|@null/bar|zee|a/b').should.be.ok;
      });

    });

  });

  describe( 'limits for untrusted routines', function () {

    describe( 'with the _restrict tag', function () {

      before(function () {
        flow = new Flow({
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
        flow.query('//free/').should.be.ok;
        flow.go('//jail/');
        flow.query('//free/').should.not.be.ok;

        flow.go('escape');
        flow.query('//free/').should.be.ok;
      });

    });

    describe( 'with the _conceal tag', function () {

      before(function () {
        flow = new Flow({
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
        flow.query('//superman').should.be.ok;
        flow.query('//superman/identity').should.not.be.ok;
      });

      it( 'should allow resolving revealed paths within a hidden branch', function () {
        flow.query('//superman').should.be.ok;
        flow.query('//superman/identity').should.not.be.ok;
        flow.query('//superman/identity/loves').should.not.be.ok;
        flow.query('//superman/identity/loves/loise_lane').should.be.ok;
      });
    });

    describe( 'with the _ingress tag', function () {

      before(function () {
        flow = new Flow({
          hallway: {
            _ingress: true,
            kitchen: {}
          }
        });
      });

      it('should deny resolving paths within a state, until it is entered', function () {
        flow.query('//hallway/kitchen/').should.not.be.ok;
        flow.go('//hallway/');
        flow.query('//hallway/kitchen/').should.be.ok;
      });

    });

  });

});