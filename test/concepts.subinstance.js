describe( 'Sub-instance', function () {

  var
    salt,
    subInst
  ;

  it( 'should be an instance created and captured by another Salt\'s callback', function () {
    var spy = sinon.spy();
    salt = new Salt({
      _capture: true,
      _in: function () {
        subInst = new Salt();
      },
      _on: function () {
        this.subs()
          .should.have.a.lengthOf(1)
          .and.contain(subInst);
        spy();
      }
    });
    salt.go(1);
    spy.should.have.been.called;
  });

  it( 'should be an instance added to another Salt', function () {
    var spy = sinon.spy();
    subInst = new Salt();
    salt = new Salt(function () {
      this.subs().should.have.lengthOf(0);
      this.subs(subInst).should.equal(1);
      this.subs()
        .should.have.lengthOf(1)
        .and.contain(subInst);
      spy();
    });
    salt.go(1);
    spy.should.have.been.called;
  });

  describe( 'capturing', function () {

    it( 'should occur in `_capture` branches', function () {
      salt = new Salt({
        foo: {
          _capture: true,
          _on: function () {
            this.subs().should.have.lengthOf(0);
            new Salt();
            this.subs().should.have.lengthOf(1);
          }
        },
        bar: function () {
          this.subs().should.have.lengthOf(1);
          new Salt();
          this.subs().should.have.lengthOf(1);
        }
      });
      salt.subs().should.equal(0);
      salt.go('//foo', '//bar').should.be.ok;
      salt.subs().should.equal(1);
    });

    it( 'should use a buffer to collect new instances', function () {
      salt = new Salt({
        _capture: true,
        _on: function () {
          this.subs({buffer: 0}).should.have.lengthOf(0);
          new Salt();
          new Salt();
          this.subs({buffer: 1}).should.have.lengthOf(2);
        }
      });
      salt.go(1).should.be.ok;
    });

    it( 'should commit buffered items when traversal completes', function () {
      salt = new Salt({
        _capture: true,
        _in: function () {
          new Salt();
          new Salt();
          new Salt();
          this.subs({buffer:1}).should.have.lengthOf(3);
          this.subs({buffer:0}).should.have.lengthOf(0);
          this.wait();
        },
        _on: function () {
          this.subs({buffer:1}).should.have.lengthOf(0);
          this.subs({buffer:0}).should.have.lengthOf(3);
        }
      });
      salt.go(1).should.be.ok;
      salt.status().paused.should.equal(true);
      salt.subs({buffer:1}).should.equal(3);
      salt.go();
      salt.subs({buffer:1}).should.equal(0);
      salt.subs({buffer:0}).should.equal(3);
    });

  });
  
  describe( 'criteria', function () {

    var
      fooProgram,
      barProgram
    ;

    before(function () {
      fooProgram = {
        foo: {
          bo: {
            peep: 1
          }
        }
      };
      barProgram = {
        bar: {
          play: 1
        }
      };
    });

    describe( 'strings', function () {

      it( 'should be matched against whole state names if no forward-slash', function () {
        salt = new Salt({
          _sequence: 1,
          _capture: true,
          foo: {
            _on: function () {
              new Salt();
            },
            bar: function () {
              new Salt();
              new Salt();
            }
          },
          foobar: function () {
            new Salt();
            new Salt();
            new Salt();
            new Salt();
          }
        });
        salt.go(1);
        salt.subs({from:'fo'}).should.equal(0);
        salt.subs({from:'ba'}).should.equal(0);
        salt.subs({from:'foo'}).should.equal(3);
        salt.subs({from:'bar'}).should.equal(2);
        salt.subs({from:'foobar'}).should.equal(4);
      });

      it( 'should be matched against whole sub-paths if there is a forward-slash', function () {
        salt = new Salt({
          _sequence: 1,
          _capture: true,
          foo: {
            _on: function () {
              new Salt();
            },
            bar: function () {
              new Salt();
              new Salt();
            }
          },
          foobar: function () {
            new Salt();
            new Salt();
            new Salt();
            new Salt();
          }
        });
        salt.go(1);
        salt.subs({from:'/fo'}).should.equal(0);
        salt.subs({from:'/ba'}).should.equal(0);
        salt.subs({from:'oo/bar'}).should.equal(0);
        salt.subs({from:'/bar'}).should.equal(2);
        salt.subs({from:'foo/bar'}).should.equal(2);
      });

    });

    describe( 'regular-expressions', function () {

      it( 'should be matched against state names with no forward-slash', function () {
        salt = new Salt({
          _sequence: 1,
          _capture: true,
          foo: {
            _on: function () {
              new Salt();
            },
            bar: function () {
              new Salt();
              new Salt();
            }
          },
          foobar: function () {
            new Salt();
            new Salt();
            new Salt();
            new Salt();
          }
        });
        salt.go(1);
        salt.subs({from:/fo/}).should.equal(7);
        salt.subs({from:/ba/}).should.equal(6);
        salt.subs({from:/foo/}).should.equal(7);
        salt.subs({from:/bar/}).should.equal(6);
        salt.subs({from:/foobar/}).should.equal(4);
      });

      it( 'should be matched against full paths if there is a forward-slash', function () {
        salt = new Salt({
          _sequence: 1,
          _capture: true,
          foo: {
            _on: function () {
              new Salt();
            },
            bar: function () {
              new Salt();
              new Salt();
            }
          },
          foobar: function () {
            new Salt();
            new Salt();
            new Salt();
            new Salt();
          }
        });
        salt.go(1);
        salt.subs({from:/\/fo/}).should.equal(7);
        salt.subs({from:/\/ba/}).should.equal(2);
        salt.subs({from:/oo\/bar/}).should.equal(2);
        salt.subs({from:/\/bar/}).should.equal(2);
        salt.subs({from:/foo\/bar/}).should.equal(2);
      });

    });

    describe( 'option', function () {

      describe( '"from"', function () {

        it( 'should filter items captured/added on or within the given state name', function () {
          salt = new Salt({
            _in: 'home',
            home: {
              _capture: true,
              _in: function () {
                new Salt();
                new Salt();
              },
              _on: 'base',
              base: function () {
                new Salt();
              }
            },
            _on: function () {
              this.subs({from:'home'}).should.have.lengthOf(3);
              this.subs({from:'base'}).should.have.lengthOf(1);
            }
          });
          salt.go(1).should.be.ok;
        });

        it( 'should filter items captured/added on or within the given state path', function () {
          salt = new Salt({
            _in: 'home',
            home: {
              _capture: true,
              _in: function () {
                new Salt();
                new Salt();
              },
              _on: 'base',
              base: function () {
                new Salt();
              }
            },
            _on: function () {
              this.subs({from:'//'}).should.have.lengthOf(3);
              this.subs({from:'home/base'}).should.have.lengthOf(1);
            }
          });
          salt.go(1).should.be.ok;
        });

        it( 'should filter items captured/added at the given state index', function () {
          salt = new Salt({
            _in: 'home',
            home: {
              _capture: true,
              _in: function () {
                new Salt();
                new Salt();
              },
              _on: 'base',
              base: function () {
                new Salt();
              }
            },
            _on: function () {
              this.subs({from:2}).should.have.lengthOf(2);
              this.subs({from:3}).should.have.lengthOf(1);
            }
          });
          salt.go(1).should.be.ok;
        });

      });

      describe( '"has"', function () {

        it( 'should filter items that have the given state name', function () {
          salt = new Salt(function () {
            this.subs(new Salt(fooProgram));
            this.subs(new Salt(barProgram));
          });
          salt.go(1);
          salt.subs().should.equal(2);
          salt.subs({has: 'foo'}).should.equal(1);
          salt.subs({has: 'bar'}).should.equal(1);
          salt.subs({has: /./}).should.equal(2);
          salt.subs({has: /f\w/}).should.equal(1);
        });

        it( 'should filter items that contain the given path', function () {
          salt = new Salt(function () {
            this.subs(new Salt(fooProgram));
            this.subs(new Salt(barProgram));
          });
          salt.go(1);
          salt.subs().should.equal(2);
          salt.subs({has: 'foo/bo'}).should.equal(1);
          salt.subs({has: '/play'}).should.equal(1);
          salt.subs({has: /\/./}).should.equal(2);
          salt.subs({has: /r\/p/}).should.equal(1);
        });

        it( 'should filter items that have the given state index', function () {
          salt = new Salt(function () {
            this.subs(new Salt(fooProgram));
            this.subs(new Salt(barProgram));
          });
          salt.go(1);
          salt.subs().should.equal(2);
          salt.subs({has: 1}).should.equal(2);
          salt.subs({has: 3}).should.equal(2);
          salt.subs({has: 4}).should.equal(1);
        });

      });

      describe( '"is"', function () {
        
        it( 'should filter items sourced by the given value', function () {
          salt = new Salt(function () {
            this.subs(new Salt(fooProgram));
            this.subs(new Salt(barProgram));
          });
          salt.go(1);
          salt.subs().should.equal(2);
          salt.subs({is: fooProgram}).should.equal(1);
          salt.subs({is: barProgram}).should.equal(1);
        });

      });

      describe( '"on"', function () {

        it( 'should filter items that are on the given state name', function () {
          salt = new Salt(function () {
            var
              foo = new Salt(fooProgram),
              bar = new Salt(barProgram)
            ;
            foo.go(4).should.be.ok;
            this.subs(foo, bar);
            this.subs().should.have.lengthOf(2);
            bar.go('//bar/play').should.be.ok;
          });
          salt.go(1);
          salt.subs().should.equal(2);
          salt.subs({on: 'foo'}).should.equal(0);
          salt.subs({on: 'peep'}).should.equal(1);
          salt.subs({on: 'play'}).should.equal(1);
          salt.subs({on: /fo/}).should.equal(0);
          salt.subs({on: /pe.p/}).should.equal(1);
          salt.subs({on: /y$/}).should.equal(1);
        });

        it( 'should filter items that are on or within the given state path', function () {
          salt = new Salt(function () {
            var
              foo = new Salt(fooProgram),
              bar = new Salt(barProgram)
            ;
            foo.go(4).should.be.ok;
            this.subs(foo, bar);
            this.subs().should.have.lengthOf(2);
            bar.go('//bar/play').should.be.ok;
          });
          salt.go(1);
          salt.subs().should.equal(2);
          salt.subs({on: '/fo'}).should.equal(0);
          salt.subs({on: 'peep/'}).should.equal(1);
          salt.subs({on: '/play'}).should.equal(1);
          salt.subs({on: /\w\/fo/}).should.equal(0);
          salt.subs({on: /o\/pe.p/}).should.equal(1);
          salt.subs({on: /r\/p/}).should.equal(1);
        });

        it( 'should filter items that are on the given state index', function () {
          salt = new Salt(function () {
            var
              foo = new Salt(fooProgram),
              bar = new Salt(barProgram)
            ;
            foo.go(4).should.be.ok;
            this.subs(foo, bar);
            this.subs().should.have.lengthOf(2);
            bar.go('//bar/play').should.be.ok;
          });
          salt.go(1);
          salt.subs().should.equal(2);
          salt.subs({on: 0}).should.equal(0);
          salt.subs({on: 4}).should.equal(1);
          salt.subs({on: 3}).should.equal(1);
        });

      });

      describe( '"within"', function () {

        it( 'should filter items that are within the given state name', function () {
          salt = new Salt(function () {
            var
              foo = new Salt(fooProgram),
              bar = new Salt(barProgram)
            ;
            foo.go(4).should.be.ok;
            this.subs(foo, bar);
            this.subs().should.have.lengthOf(2);
            bar.go('//bar/play').should.be.ok;
          });
          salt.go(1);
          salt.subs().should.equal(2);
          salt.subs({within: 'peep'}).should.equal(0);
          salt.subs({within: 'foo'}).should.equal(1);
          salt.subs({within: 'bar'}).should.equal(1);
          salt.subs({within: /ep/}).should.equal(0);
          salt.subs({within: /f.o/}).should.equal(1);
          salt.subs({within: /[a-c]a/}).should.equal(1);
        });

        it( 'should filter items that are within or within the given state path', function () {
          salt = new Salt(function () {
            var
              foo = new Salt(fooProgram),
              bar = new Salt(barProgram)
            ;
            foo.go(4).should.be.ok;
            this.subs(foo, bar);
            this.subs().should.have.lengthOf(2);
            bar.go('//bar/play').should.be.ok;
          });
          salt.go(1);
          salt.subs({within: '/peep'}).should.equal(0);
          salt.subs({within: 'foo/bo/'}).should.equal(1);
          salt.subs({within: 'bar/'}).should.equal(1);
          salt.subs({within: /o\/b$/}).should.equal(0);
          salt.subs({within: /o\/b/}).should.equal(1);
          salt.subs({within: /r\/$/}).should.equal(1);
        });

        it( 'should filter items that are within the given state index', function () {
          salt = new Salt(function () {
            var
              foo = new Salt(fooProgram),
              bar = new Salt(barProgram)
            ;
            foo.go(4).should.be.ok;
            this.subs(foo, bar);
            this.subs().should.have.lengthOf(2);
            bar.go('//bar/play').should.be.ok;
          });
          salt.go(1);
          salt.subs({within: 0}).should.equal(2);
          salt.subs({within: 3}).should.equal(1);
          salt.subs({within: 2}).should.equal(2);
        });

      });

      describe( '"buffer"', function () {

        it( 'should filter temporary items when truthy', function () {
          var spy = sinon.spy();
          salt = new Salt({
            _capture: true,
            _on: function () {
              new Salt();
              new Salt();
              this.subs(new Salt());
              this.subs(new Salt());
              this.subs({buffer: 1}).should.have.lengthOf(2);
              spy();
            }
          });
          salt.go(1);
          spy.should.have.been.calledOnce;
        });

        it( 'should filter committed items when falsy', function () {
          var spy = sinon.spy();
          salt = new Salt({
            _capture: true,
            _on: function () {
              new Salt();
              new Salt();
              this.subs(new Salt());
              this.subs(new Salt());
              this.subs({buffer: 0}).should.have.lengthOf(2);
              spy();
            }
          });
          salt.go(1);
          spy.should.have.been.calledOnce;
        });

        it( 'should filter both temporary and committed items when omitted or -1', function () {
          var spy = sinon.spy();
          salt = new Salt({
            _capture: true,
            _on: function () {
              new Salt();
              new Salt();
              this.subs(new Salt());
              this.subs(new Salt());
              this.subs({buffer: -1}).should.have.lengthOf(4);
              this.subs().should.have.lengthOf(4);
              spy();
            }
          });
          salt.go(1);
          spy.should.have.been.calledOnce;
        });

        it( 'should be ignored via the _capture tag', function () {
          var spy = sinon.spy();
          salt = new Salt({
            _capture: {buffer: 0},
            _on: function () {
              new Salt();
              new Salt();
              this.subs(new Salt());
              this.subs(new Salt());
              this.subs({buffer: 1}).should.have.lengthOf(2);
              this.subs({buffer: 0}).should.have.lengthOf(2);
              this.subs().should.have.lengthOf(4);
              spy();
            }
          });
          salt.go(1);
          spy.should.have.been.calledOnce;
        });

      });

    });

    describe( 'short-form', function () {

      it( 'should let `true` include all captured items', function () {
        salt = new Salt({
          _capture: true,
          _on: function () {
            new Salt();
            new Salt();
            this.subs(new Salt());
            this.subs(new Salt());
          }
        });
        salt.go(1);
        salt.subs(true).should.equal(4);
      });

      it( 'should let `false` exclude all captured items', function () {
        salt = new Salt({
          _capture: true,
          _on: function () {
            new Salt();
            new Salt();
            this.subs(new Salt());
            this.subs(new Salt());
          }
        });
        salt.go(1);
        salt.subs(false).should.equal(0);
      });

      it( 'should let a number filter items on the matching state index', function () {
        salt = new Salt(function () {
          var
            foo = new Salt(fooProgram),
            bar = new Salt(barProgram)
          ;
          foo.go(4).should.be.ok;
          bar.go('//bar/play').should.be.ok;
          this.subs(foo, bar);
        });
        salt.go(1);
        salt.subs(4).should.equal(1);
        salt.subs(3).should.equal(1);
        salt.subs(0).should.equal(0);
      });

      it( 'should let a string/regexp filter items on or within the matching state name', function () {
        salt = new Salt(function () {
          var
            foo = new Salt(fooProgram),
            bar = new Salt(barProgram)
          ;
          foo.go(4).should.be.ok;
          bar.go('//bar/play').should.be.ok;
          this.subs(foo, bar);
        });
        salt.go(1);
        salt.subs('peep').should.equal(1);
        salt.subs('play').should.equal(1);
        salt.subs('foo').should.equal(0);
        salt.subs(/^./).should.equal(2);
      });

      it( 'should let a string/regexp filter items on or within the matching state path', function () {
        salt = new Salt(function () {
          var
            foo = new Salt(fooProgram),
            bar = new Salt(barProgram)
          ;
          foo.go(4).should.be.ok;
          bar.go('//bar/play').should.be.ok;
          this.subs(foo, bar);
        });
        salt.go(1);
        salt.subs('bo/peep').should.equal(1);
        salt.subs('bar/play').should.equal(1);
        salt.subs('bar/p').should.equal(0);
        salt.subs('//').should.equal(2);
        salt.subs(/\/p/).should.equal(2);
      });

    });

  });

});