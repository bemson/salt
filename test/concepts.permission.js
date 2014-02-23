describe( 'Permission', function () {

  var salt;

  it( 'should deny access to privileged methods and tags, based on the caller', function () {
    salt = new Salt({
      deny: {
        _perms: '!world'
      }
    });
    salt.state.perms.world.should.be.ok;
    salt.go(1).should.be.ok;
    salt.get(0).should.be.ok;
    salt.go('//deny');
    salt.state.perms.world.should.not.be.ok;
    salt.go(1).should.not.be.ok;
    salt.get(0).should.not.be.ok;
  });

  it( 'should be ignored by blessed callbacks', function () {
    var callback;
    salt = new Salt(function () {
      this.perms(false);
      callback = this.callbacks(0, 0, 1);
    });
    salt.go(1);
    salt.state.perms.world.should.not.be.ok;
    salt.go(0).should.not.be.ok;
    salt.state.index.should.equal(1);
    callback();
    salt.state.index.should.equal(0);
  });

  it( 'should list "owner", "sub", and "world" access groups', function () {
    salt = new Salt();
    salt.state.perms.should.eql({owner:true, world: true, sub: true, self: true});
  });

  describe( 'format', function () {

    it( 'should be read from the object `state.perms`', function () {
      salt = new Salt();
      salt.state.perms.should.be.a('object');
    });

    describe ( 'string', function () {

      it( 'should permit a named group', function () {
        var spy = sinon.spy();
        salt = new Salt({
          _perms: false,
          _on: function () {
            this.state.perms.world.should.not.be.ok;
            this.perms('world').should.be.ok;
            this.state.perms.world.should.be.ok;
            spy();
          }
        });
        salt.go(1);
        spy.should.have.been.calledOnce;
      });

      it( 'should deny a named group when prefixed with an exclamation', function () {
        var spy = sinon.spy();
        salt = new Salt({
          _perms: true,
          _on: function () {
            this.state.perms.world.should.be.ok;
            this.perms('!world').should.be.ok;
            this.state.perms.world.should.not.be.ok;
            spy();
          }
        });
        salt.go(1);
        spy.should.have.been.calledOnce;
      });

    });

    describe ( 'object', function () {

      it( 'should permit groups matching keys paired to a truthy value', function () {
        var spy = sinon.spy();
        salt = new Salt({
          _perms: false,
          _on: function () {
            this.state.perms.world.should.not.be.ok;
            this.perms({ world: 1 }).should.be.ok;
            this.state.perms.world.should.be.ok;
            spy();
          }
        });
        salt.go(1);
        spy.should.have.been.calledOnce;
      });

      it( 'should deny groups matching keys paired to a falsy value', function () {
        var spy = sinon.spy();
        salt = new Salt({
          _perms: true,
          _on: function () {
            this.state.perms.world.should.be.ok;
            this.perms({ world: 0 }).should.be.ok;
            this.state.perms.world.should.not.be.ok;
            spy();
          }
        });
        salt.go(1);
        spy.should.have.been.calledOnce;
      });

    });

    describe ( 'boolean', function () {

      it( 'should permit all groups when `true`', function () {
        var spy = sinon.spy();
        salt = new Salt({
          _perms: false,
          _on: function () {
            this.state.perms.should.eql({world:false, owner: false, sub: false, self: true});
            this.perms(true).should.be.ok;
            this.state.perms.should.eql({world:true, owner: true, sub: true, self: true});
            spy();
          }
        });
        salt.go(1);
        spy.should.have.been.calledOnce;
      });

      it( 'should deny all groups when `false`', function () {
        var spy = sinon.spy();
        salt = new Salt({
          _perms: true,
          _on: function () {
            this.state.perms.should.eql({world:true, owner: true, sub: true, self: true});
            this.perms(false);
            this.state.perms.should.eql({world:false, owner: false, sub: false, self: true});
            spy();
          }
        });
        salt.go(1);
        spy.should.have.been.calledOnce;
      });

    });

  });

  describe( 'setting', function () {

    it( 'should be done via `_perms` and `.perms()`', function () {
      salt = new Salt({
        _perms: '!owner',
        _on: function () {
          this.state.perms.owner.should.not.be.ok;
          this.perms('!world');
        }
      });
      salt.go(1);
      salt.state.perms.world.should.not.be.ok;
    });

    it( 'should impact nearest `_perms` ancestor branch', function () {
      salt = new Salt({
        _perms: 'world',
        a: function () {
          this.perms('!owner');
        }
      });
      salt.go(1);
      salt.state.perms.owner.should.be.ok;
      salt.go('//a');
      salt.state.perms.owner.should.not.be.ok;
      salt.go(1);
      salt.state.perms.owner.should.not.be.ok;
      salt.go(0);
      salt.state.perms.owner.should.be.ok;
    });

    it( 'should ignore lettercase', function () {
      salt = new Salt({
        _perms: '!OWNEr',
        _on: function () {
          this.perms('!SUB');
          this.perms({WORLD: false});
        }
      });
      salt.go(1);
      salt.state.perms.world.should.not.be.ok;
      salt.state.perms.owner.should.not.be.ok;
      salt.state.perms.sub.should.not.be.ok;
    });

    it( 'should ignore object keys when prefixed with an exclamation', function () {
      salt = new Salt({
        _perms: {'!world': false}
      });
      salt.state.perms.world.should.be.ok;
      salt.go(1);
      salt.state.perms.world.should.be.ok;
      salt.state.perms.should.not.haveOwnProperty('!world');
    });

    it( 'should sequentially process an array', function () {
      salt = new Salt({
        _sequence: 1,
        simple: {
          _perms: ['!world', true, '!sub'],
          _on: function () {
            salt.state.perms.owner.should.be.ok;
            salt.state.perms.world.should.be.ok;
            salt.state.perms.sub.should.not.be.ok;
          }
        },
        complex: {
          _perms: [false, {world: false}, 'sub'],
          _on: function () {
            salt.state.perms.owner.should.not.be.ok;
            salt.state.perms.world.should.not.be.ok;
            salt.state.perms.sub.should.be.ok;
          }
        },
        'left-to-right': {
          _perms: [false, true, false],
          _on: function () {
            salt.state.perms.owner.should.not.be.ok;
            salt.state.perms.world.should.not.be.ok;
            salt.state.perms.sub.should.not.be.ok;
          }
        }
      });

      salt.go(1);
      salt.state.name.should.equal('left-to-right');
    });

  });

  describe( 'group', function () {

    var corePkgDef;

    before(function () {
      corePkgDef = Salt.pkg('core');
      corePkgDef.proxy.groupIs = function (group) {
        return corePkgDef(this).is(group);
      };
    });

    after(function () {
      delete corePkgDef.proxy.groupIs;
    });

    describe( 'self', function () {

      it( 'should apply when the invoker is the invokee', function () {
        salt = new Salt(function () {
          this.groupIs('self').should.be.ok;
          this.groupIs('owner').should.not.be.ok;
          this.groupIs('sub').should.not.be.ok;
          this.groupIs('world').should.not.be.ok;
        });
        salt.go(1);
      });

      describe( 'denial', function () {

        it( 'should not be possible via .perms() or _perms', function () {
          salt = new Salt({
            _perms: '!self',
            _on: function () {
              this.state.perms.self.should.be.ok;
              this.perms('!self');
              this.state.perms.self.should.be.ok;
              this.go(0);
            }
          });
          salt.go(1);
          salt.state.index.should.equal(0);
        });

      });

    });

    describe( 'owner', function () {

      it( 'should apply when the invoker is a salt instance that owns the invokee', function () {
        salt = new Salt(function () {
          var owned = new Salt({
            _owner: -1
          });
          owned.groupIs('self').should.not.be.ok;
          owned.groupIs('owner').should.be.ok;
          owned.groupIs('sub').should.not.be.ok;
          owned.groupIs('world').should.not.be.ok;
        });
        salt.go(1);
      });

      describe( 'denial', function () {

        it( 'should work via _perms', function () {
          salt = new Salt(function () {
            var owned = new Salt({
              _owner: -1,
              _perms: '!owner'
            });
            owned.state.perms.owner.should.be.ok;
            owned.go(1).should.be.ok;
            owned.state.perms.owner.should.not.be.ok;
            owned.perms().should.not.be.ok;
            owned.go(0).should.not.be.ok;
          });
        });

        it( 'should work via .perms()', function () {
          salt = new Salt(function () {
            var owned = new Salt({
              _owner: -1,
              _on: function () {
                this.perms('!owner');
              }
            });
            owned.state.perms.owner.should.be.ok;
            owned.go(1).should.be.ok;
            owned.state.perms.owner.should.not.be.ok;
            owned.perms().should.not.be.ok;
            owned.go(0).should.not.be.ok;
          });
        });

        it( 'should be reversible via .perms()', function () {
          salt = new Salt(function () {
            var owned = new Salt({
              _owner: -1,
              _perms: '!owner',
              _on: function () {
                this.perms('owner');
              }
            });
            owned.state.perms.owner.should.be.ok;
            owned.go(1).should.be.ok;
            owned.state.perms.owner.should.be.ok;
            owned.perms().should.be.ok;
            owned.go(0).should.be.ok;
          });
        });

      });

    });

    describe( 'sub', function () {

      it( 'should apply when the invoker is a salt instance that was captured by the invokee', function () {
        salt = new Salt({
          _capture: true,
          _on: function () {
            new Salt(function () {
              salt.groupIs('self').should.not.be.ok;
              salt.groupIs('owner').should.not.be.ok;
              salt.groupIs('sub').should.be.ok;
              salt.groupIs('world').should.not.be.ok;
            });
            this.subs()[0].go(1);
          }
        });
        salt.go(1);
      });

      describe( 'denial', function () {

        it( 'should work via `_perms`', function () {
          salt = new Salt({
            _capture: true,
            _perms: '!sub',
            _on: function () {
              new Salt(function () {
                salt.perms().should.not.be.ok;
              });
              this.subs()[0].go(1).should.be.ok;
            }
          });
          salt.go(1);
        });

        it( 'should work via `.perms()`', function () {
          salt = new Salt({
            _capture: true,
            _on: function () {
              this.perms('!sub');
              new Salt(function () {
                salt.perms().should.not.be.ok;
              });
              this.subs()[0].go(1).should.be.ok;

              this.perms('sub');
              new Salt(function () {
                salt.perms().should.be.ok;
              });
              this.subs()[1].go(1).should.be.ok;
            }
          });
          salt.go(1);
        });

        it( 'should be reversible via .perms()', function () {
          salt = new Salt({
            _capture: true,
            _perms: '!sub',
            _on: function () {
              new Salt(function () {
                salt.perms().should.be.ok;
              });
              this.perms('sub');
              this.subs()[0].go(1).should.be.ok;
            }
          });
          salt.go(1);
        });
      });

    });

    describe( 'world', function () {

      it( 'should apply when the invoker is not a salt instance', function () {
        salt = new Salt();
        salt.groupIs('self').should.not.be.ok;
        salt.groupIs('owner').should.not.be.ok;
        salt.groupIs('sub').should.not.be.ok;
        salt.groupIs('world').should.be.ok;
      });

      describe( 'denial', function () {

        it( 'should work via _perms', function () {
          salt = new Salt({
            denied: {
              _perms: '!world'
            }
          });
          salt.go(1).should.be.ok;
          salt.go('denied').should.be.ok;
          salt.go(1).should.not.be.ok;
          salt.state.perms.world.should.not.be.ok;
        });

        it( 'should work via .perms()', function () {
          salt = new Salt();
          salt = new Salt({
            denied: function () {
              this.perms('!world');
            }
          });
          salt.go(1).should.be.ok;
          salt.go('denied').should.be.ok;
          salt.go(1).should.not.be.ok;
          salt.state.perms.world.should.not.be.ok;
        });

        it( 'should be reversible via .perms()', function () {
          salt = new Salt({
            denied: {
              _perms: '!world',
              _on: function () {
                this.perms('world');
              }
            }
          });
          salt.go(1).should.be.ok;
          salt.go('//denied').should.be.ok;
          salt.go(1).should.be.ok;
          salt.state.perms.world.should.be.ok;
        });
      });

    });

  });

});