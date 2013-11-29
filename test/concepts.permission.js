describe( 'Permission', function () {

  var flow;

  it( 'should deny access to privileged methods and tags, based on the caller', function () {
    flow = new Flow({
      deny: {
        _perms: '!world'
      }
    });
    flow.perms().world.should.be.ok;
    flow.go(1).should.be.ok;
    flow.target(0).should.be.ok;
    flow.go('//deny');
    flow.perms().world.should.not.be.ok;
    flow.go(1).should.not.be.ok;
    flow.target(0).should.not.be.ok;
  });

  it( 'should be ignored by blessed callbacks', function () {
    var callback;
    flow = new Flow(function () {
      this.perms(false);
      callback = this.callbacks(0, 0, 1);
    });
    flow.go(1);
    flow.perms().world.should.not.be.ok;
    flow.go(0).should.not.be.ok;
    flow.state.index.should.equal(1);
    callback();
    flow.state.index.should.equal(0);
  });

  it( 'should allow "owner", "sub", and "world" by default', function () {
    flow = new Flow();
    flow.perms().should.eql({owner:true, world: true, sub: true});
  });

  describe( 'format', function () {

    it( 'should be read as an object via `.perms()`', function () {
      flow = new Flow();
      flow.perms().should.be.a('object');
    });

    describe ( 'string', function () {

      it( 'should permit the named group', function () {
        var spy = sinon.spy();
        flow = new Flow({
          _perms: false,
          _on: function () {
            this.perms().world.should.not.be.ok;
            this.perms('world');
            this.perms().world.should.be.ok;
            spy();
          }
        });
        flow.go(1);
        spy.should.have.been.calledOnce;
      });

      it( 'should deny the named group if prefixed by an exclamation', function () {
        var spy = sinon.spy();
        flow = new Flow({
          _perms: true,
          _on: function () {
            this.perms().world.should.be.ok;
            this.perms('!world');
            this.perms().world.should.not.be.ok;
            spy();
          }
        });
        flow.go(1);
        spy.should.have.been.calledOnce;
      });

    });

    describe ( 'object', function () {

      it( 'should permit groups matching keys paired to a truthy value', function () {
        var spy = sinon.spy();
        flow = new Flow({
          _perms: false,
          _on: function () {
            this.perms().world.should.not.be.ok;
            this.perms({
              world: 1
            });
            this.perms().world.should.be.ok;
            spy();
          }
        });
        flow.go(1);
        spy.should.have.been.calledOnce;
      });

      it( 'should deny groups matching keys paired to a falsy value', function () {
        var spy = sinon.spy();
        flow = new Flow({
          _perms: true,
          _on: function () {
            this.perms().world.should.be.ok;
            this.perms({
              world: 0
            });
            this.perms().world.should.not.be.ok;
            spy();
          }
        });
        flow.go(1);
        spy.should.have.been.calledOnce;
      });

    });

    describe ( 'boolean', function () {

      it( 'should permit all groups when `true`', function () {
        var spy = sinon.spy();
        flow = new Flow({
          _perms: false,
          _on: function () {
            this.perms().should.eql({world:false, owner: false, sub: false});
            this.perms(true);
            this.perms().should.eql({world:true, owner: true, sub: true});
            spy();
          }
        });
        flow.go(1);
        spy.should.have.been.calledOnce;
      });

      it( 'should deny all groups when `false`', function () {
        var spy = sinon.spy();
        flow = new Flow({
          _perms: true,
          _on: function () {
            this.perms().should.eql({world:true, owner: true, sub: true});
            this.perms(false);
            this.perms().should.eql({world:false, owner: false, sub: false});
            spy();
          }
        });
        flow.go(1);
        spy.should.have.been.calledOnce;
      });

    });

  });

  describe( 'setting', function () {

    it( 'should be done via `_capture` and `.perms()`', function () {
      flow = new Flow({
        _perms: '!owner',
        _on: function () {
          this.perms().owner.should.not.be.ok;
          this.perms('!world');
        }
      });
      flow.go(1);
      flow.perms().world.should.not.be.ok;
    });

    it( 'should impact nearest `_perms` ancestor branch', function () {
      flow = new Flow({
        _perms: 'world',
        a: function () {
          this.perms('!owner');
        }
      });
      flow.go(1);
      flow.perms().owner.should.be.ok;
      flow.go('//a');
      flow.perms().owner.should.not.be.ok;
      flow.go(1);
      flow.perms().owner.should.not.be.ok;
      flow.go(0);
      flow.perms().owner.should.be.ok;
    });

  });

  describe( 'group', function () {

    var corePkgDef;

    before(function () {
      corePkgDef = Flow.pkg('core');
      corePkgDef.proxy.groupIs = function (group) {
        return corePkgDef(this).is(group);
      };
    });

    after(function () {
      delete corePkgDef.proxy.groupIs;
    });

    describe( 'self', function () {

      it( 'should apply when the invoker is the invokee', function () {
        flow = new Flow(function () {
          this.groupIs('self').should.be.ok;
          this.groupIs('owner').should.not.be.ok;
          this.groupIs('sub').should.not.be.ok;
          this.groupIs('world').should.not.be.ok;
        });
        flow.go(1);
      });

    });

    describe( 'owner', function () {

      it( 'should apply when the invoker is a flow instance that owns the invokee', function () {
        flow = new Flow(function () {
          var owned = new Flow({
            _owner: -1
          });
          owned.groupIs('self').should.not.be.ok;
          owned.groupIs('owner').should.be.ok;
          owned.groupIs('sub').should.not.be.ok;
          owned.groupIs('world').should.not.be.ok;
        });
        flow.go(1);
      });

    });

    describe( 'sub', function () {

      it( 'should apply when the invoker is a flow instance that was captured by the invokee', function () {
        flow = new Flow({
          _capture: true,
          _on: function () {
            new Flow(function () {
              flow.groupIs('self').should.not.be.ok;
              flow.groupIs('owner').should.not.be.ok;
              flow.groupIs('sub').should.be.ok;
              flow.groupIs('world').should.not.be.ok;
            });
            this.subs()[0].go(1);
          }
        });
        flow.go(1);
      });

    });

    describe( 'world', function () {

      it( 'should apply when the invoker is not a flow instance', function () {
        flow = new Flow();
        flow.groupIs('self').should.not.be.ok;
        flow.groupIs('owner').should.not.be.ok;
        flow.groupIs('sub').should.not.be.ok;
        flow.groupIs('world').should.be.ok;
      });


    });

  });

});