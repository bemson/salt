describe( 'Sub-instance', function () {

  var
    flow,
    subInst
  ;

  it( 'should be an instance created and captured by another Flow\'s callback', function () {
    var spy = sinon.spy();
    flow = new Flow({
      _capture: true,
      _in: function () {
        subInst = new Flow();
      },
      _on: function () {
        this.subs()
          .should.have.a.lengthOf(1)
          .and.contain(subInst);
        spy();
      }
    });
    flow.go(1);
    spy.should.have.been.called;
  });

  it( 'should be an instance added to another Flow', function () {
    var spy = sinon.spy();
    subInst = new Flow();
    flow = new Flow(function () {
      this.subs().should.have.lengthOf(0);
      this.subs(subInst).should.equal(true);
      this.subs()
        .should.have.lengthOf(1)
        .and.contain(subInst);
      spy();
    });
    flow.go(1);
    spy.should.have.been.called;
  });

  describe( 'capturing', function () {

    it( 'should occur in `_capture` branches', function () {
      flow = new Flow({
        foo: {
          _capture: true,
          _on: function () {
            this.subs().should.have.lengthOf(0);
            new Flow();
            this.subs().should.have.lengthOf(1);
          }
        },
        bar: function () {
          this.subs().should.have.lengthOf(1);
          new Flow();
          this.subs().should.have.lengthOf(1);
        }
      });
      flow.subs().should.equal(0);
      flow.go('//foo', '//bar').should.be.ok;
      flow.subs().should.equal(1);
    });

    it( 'should use a buffer to collect new instances', function () {
      flow = new Flow({
        _capture: true,
        _on: function () {
          this.subs({buffer: 0}).should.have.lengthOf(0);
          new Flow();
          new Flow();
          this.subs({buffer: 1}).should.have.lengthOf(2);
        }
      });
      flow.go(1).should.be.ok;
    });

    it( 'should commit buffered items when traversal completes', function () {
      flow = new Flow({
        _capture: true,
        _in: function () {
          new Flow();
          new Flow();
          new Flow();
          this.subs({buffer:1}).should.have.lengthOf(3);
          this.subs({buffer:0}).should.have.lengthOf(0);
          this.wait();
        },
        _on: function () {
          this.subs({buffer:1}).should.have.lengthOf(0);
          this.subs({buffer:0}).should.have.lengthOf(3);
        }
      });
      flow.go(1).should.be.ok;
      flow.status().paused.should.equal(true);
      flow.subs({buffer:1}).should.equal(3);
      flow.go();
      flow.subs({buffer:1}).should.equal(0);
      flow.subs({buffer:0}).should.equal(3);
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
        flow = new Flow({
          _sequence: 1,
          _capture: true,
          foo: {
            _on: function () {
              new Flow();
            },
            bar: function () {
              new Flow();
              new Flow();
            }
          },
          foobar: function () {
            new Flow();
            new Flow();
            new Flow();
            new Flow();
          }
        });
        flow.go(1);
        flow.subs({from:'fo'}).should.equal(0);
        flow.subs({from:'ba'}).should.equal(0);
        flow.subs({from:'foo'}).should.equal(3);
        flow.subs({from:'bar'}).should.equal(2);
        flow.subs({from:'foobar'}).should.equal(4);
      });

      it( 'should be matched against whole sub-paths if there is a forward-slash', function () {
        flow = new Flow({
          _sequence: 1,
          _capture: true,
          foo: {
            _on: function () {
              new Flow();
            },
            bar: function () {
              new Flow();
              new Flow();
            }
          },
          foobar: function () {
            new Flow();
            new Flow();
            new Flow();
            new Flow();
          }
        });
        flow.go(1);
        flow.subs({from:'/fo'}).should.equal(0);
        flow.subs({from:'/ba'}).should.equal(0);
        flow.subs({from:'oo/bar'}).should.equal(0);
        flow.subs({from:'/bar'}).should.equal(2);
        flow.subs({from:'foo/bar'}).should.equal(2);
      });

    });

    describe( 'regular-expressions', function () {

      it( 'should be matched against state names with no forward-slash', function () {
        flow = new Flow({
          _sequence: 1,
          _capture: true,
          foo: {
            _on: function () {
              new Flow();
            },
            bar: function () {
              new Flow();
              new Flow();
            }
          },
          foobar: function () {
            new Flow();
            new Flow();
            new Flow();
            new Flow();
          }
        });
        flow.go(1);
        flow.subs({from:/fo/}).should.equal(7);
        flow.subs({from:/ba/}).should.equal(6);
        flow.subs({from:/foo/}).should.equal(7);
        flow.subs({from:/bar/}).should.equal(6);
        flow.subs({from:/foobar/}).should.equal(4);
      });

      it( 'should be matched against full paths if there is a forward-slash', function () {
        flow = new Flow({
          _sequence: 1,
          _capture: true,
          foo: {
            _on: function () {
              new Flow();
            },
            bar: function () {
              new Flow();
              new Flow();
            }
          },
          foobar: function () {
            new Flow();
            new Flow();
            new Flow();
            new Flow();
          }
        });
        flow.go(1);
        flow.subs({from:/\/fo/}).should.equal(7);
        flow.subs({from:/\/ba/}).should.equal(2);
        flow.subs({from:/oo\/bar/}).should.equal(2);
        flow.subs({from:/\/bar/}).should.equal(2);
        flow.subs({from:/foo\/bar/}).should.equal(2);
      });

    });

    describe( 'option', function () {

      describe( 'from', function () {

        it( 'should filter items captured/added on or within the given state name', function () {
          flow = new Flow({
            _in: 'home',
            home: {
              _capture: true,
              _in: function () {
                new Flow();
                new Flow();
              },
              _on: 'base',
              base: function () {
                new Flow();
              }
            },
            _on: function () {
              this.subs({from:'home'}).should.have.lengthOf(3);
              this.subs({from:'base'}).should.have.lengthOf(1);
            }
          });
          flow.go(1).should.be.ok;
        });

        it( 'should filter items captured/added on or within the given state path', function () {
          flow = new Flow({
            _in: 'home',
            home: {
              _capture: true,
              _in: function () {
                new Flow();
                new Flow();
              },
              _on: 'base',
              base: function () {
                new Flow();
              }
            },
            _on: function () {
              this.subs({from:'//'}).should.have.lengthOf(3);
              this.subs({from:'home/base'}).should.have.lengthOf(1);
            }
          });
          flow.go(1).should.be.ok;
        });

        it( 'should filter items captured/added at the given state index', function () {
          flow = new Flow({
            _in: 'home',
            home: {
              _capture: true,
              _in: function () {
                new Flow();
                new Flow();
              },
              _on: 'base',
              base: function () {
                new Flow();
              }
            },
            _on: function () {
              this.subs({from:2}).should.have.lengthOf(2);
              this.subs({from:3}).should.have.lengthOf(1);
            }
          });
          flow.go(1).should.be.ok;
        });

      });

      describe( 'has', function () {

        it( 'should filter items that have the given state name', function () {
          flow = new Flow(function () {
            this.subs(new Flow(fooProgram));
            this.subs(new Flow(barProgram));
          });
          flow.go(1);
          flow.subs().should.equal(2);
          flow.subs({has: 'foo'}).should.equal(1);
          flow.subs({has: 'bar'}).should.equal(1);
          flow.subs({has: /./}).should.equal(2);
          flow.subs({has: /f\w/}).should.equal(1);
        });

        it( 'should filter items that contain the given path', function () {
          flow = new Flow(function () {
            this.subs(new Flow(fooProgram));
            this.subs(new Flow(barProgram));
          });
          flow.go(1);
          flow.subs().should.equal(2);
          flow.subs({has: 'foo/bo'}).should.equal(1);
          flow.subs({has: '/play'}).should.equal(1);
          flow.subs({has: /\/./}).should.equal(2);
          flow.subs({has: /r\/p/}).should.equal(1);
        });

        it( 'should filter items that have the given state index', function () {
          flow = new Flow(function () {
            this.subs(new Flow(fooProgram));
            this.subs(new Flow(barProgram));
          });
          flow.go(1);
          flow.subs().should.equal(2);
          flow.subs({has: 1}).should.equal(2);
          flow.subs({has: 3}).should.equal(2);
          flow.subs({has: 4}).should.equal(1);
        });

      });

      describe( 'is', function () {
        
        it( 'should filter items sourced by the given value', function () {
          flow = new Flow(function () {
            this.subs(new Flow(fooProgram));
            this.subs(new Flow(barProgram));
          });
          flow.go(1);
          flow.subs().should.equal(2);
          flow.subs({is: fooProgram}).should.equal(1);
          flow.subs({is: barProgram}).should.equal(1);
        });

      });

      describe( 'on', function () {

        it( 'should filter items that are on the given state name', function () {
          flow = new Flow(function () {
            var
              foo = new Flow(fooProgram),
              bar = new Flow(barProgram)
            ;
            foo.go(4).should.be.ok;
            this.subs(foo, bar);
            this.subs().should.have.lengthOf(2);
            bar.go('//bar/play').should.be.ok;
          });
          flow.go(1);
          flow.subs().should.equal(2);
          flow.subs({on: 'foo'}).should.equal(0);
          flow.subs({on: 'peep'}).should.equal(1);
          flow.subs({on: 'play'}).should.equal(1);
          flow.subs({on: /fo/}).should.equal(0);
          flow.subs({on: /pe.p/}).should.equal(1);
          flow.subs({on: /y$/}).should.equal(1);
        });

        it( 'should filter items that are on or within the given state path', function () {
          flow = new Flow(function () {
            var
              foo = new Flow(fooProgram),
              bar = new Flow(barProgram)
            ;
            foo.go(4).should.be.ok;
            this.subs(foo, bar);
            this.subs().should.have.lengthOf(2);
            bar.go('//bar/play').should.be.ok;
          });
          flow.go(1);
          flow.subs().should.equal(2);
          flow.subs({on: '/fo'}).should.equal(0);
          flow.subs({on: 'peep/'}).should.equal(1);
          flow.subs({on: '/play'}).should.equal(1);
          flow.subs({on: /\w\/fo/}).should.equal(0);
          flow.subs({on: /o\/pe.p/}).should.equal(1);
          flow.subs({on: /r\/p/}).should.equal(1);
        });

        it( 'should filter items that are on the given state index', function () {
          flow = new Flow(function () {
            var
              foo = new Flow(fooProgram),
              bar = new Flow(barProgram)
            ;
            foo.go(4).should.be.ok;
            this.subs(foo, bar);
            this.subs().should.have.lengthOf(2);
            bar.go('//bar/play').should.be.ok;
          });
          flow.go(1);
          flow.subs().should.equal(2);
          flow.subs({on: 0}).should.equal(0);
          flow.subs({on: 4}).should.equal(1);
          flow.subs({on: 3}).should.equal(1);
        });

      });

      describe( 'within', function () {

        it( 'should filter items that are within the given state name', function () {
          flow = new Flow(function () {
            var
              foo = new Flow(fooProgram),
              bar = new Flow(barProgram)
            ;
            foo.go(4).should.be.ok;
            this.subs(foo, bar);
            this.subs().should.have.lengthOf(2);
            bar.go('//bar/play').should.be.ok;
          });
          flow.go(1);
          flow.subs().should.equal(2);
          flow.subs({within: 'peep'}).should.equal(0);
          flow.subs({within: 'foo'}).should.equal(1);
          flow.subs({within: 'bar'}).should.equal(1);
          flow.subs({within: /ep/}).should.equal(0);
          flow.subs({within: /f.o/}).should.equal(1);
          flow.subs({within: /[a-c]a/}).should.equal(1);
        });

        it( 'should filter items that are within or within the given state path', function () {
          flow = new Flow(function () {
            var
              foo = new Flow(fooProgram),
              bar = new Flow(barProgram)
            ;
            foo.go(4).should.be.ok;
            this.subs(foo, bar);
            this.subs().should.have.lengthOf(2);
            bar.go('//bar/play').should.be.ok;
          });
          flow.go(1);
          flow.subs({within: '/peep'}).should.equal(0);
          flow.subs({within: 'foo/bo/'}).should.equal(1);
          flow.subs({within: 'bar/'}).should.equal(1);
          flow.subs({within: /o\/b$/}).should.equal(0);
          flow.subs({within: /o\/b/}).should.equal(1);
          flow.subs({within: /r\/$/}).should.equal(1);
        });

        it( 'should filter items that are within the given state index', function () {
          flow = new Flow(function () {
            var
              foo = new Flow(fooProgram),
              bar = new Flow(barProgram)
            ;
            foo.go(4).should.be.ok;
            this.subs(foo, bar);
            this.subs().should.have.lengthOf(2);
            bar.go('//bar/play').should.be.ok;
          });
          flow.go(1);
          flow.subs({within: 0}).should.equal(2);
          flow.subs({within: 3}).should.equal(1);
          flow.subs({within: 2}).should.equal(2);
        });

      });

      describe( 'buffer', function () {

        it( 'should filter temporary items when truthy', function () {
          var spy = sinon.spy();
          flow = new Flow({
            _capture: true,
            _on: function () {
              new Flow();
              new Flow();
              this.subs(new Flow());
              this.subs(new Flow());
              this.subs({buffer: 1}).should.have.lengthOf(2);
              spy();
            }
          });
          flow.go(1);
          spy.should.have.been.calledOnce;
        });

        it( 'should filter committed items when falsy', function () {
          var spy = sinon.spy();
          flow = new Flow({
            _capture: true,
            _on: function () {
              new Flow();
              new Flow();
              this.subs(new Flow());
              this.subs(new Flow());
              this.subs({buffer: 0}).should.have.lengthOf(2);
              spy();
            }
          });
          flow.go(1);
          spy.should.have.been.calledOnce;
        });

        it( 'should filter both temporary and committed items when omitted or -1', function () {
          var spy = sinon.spy();
          flow = new Flow({
            _capture: true,
            _on: function () {
              new Flow();
              new Flow();
              this.subs(new Flow());
              this.subs(new Flow());
              this.subs({buffer: -1}).should.have.lengthOf(4);
              this.subs().should.have.lengthOf(4);
              spy();
            }
          });
          flow.go(1);
          spy.should.have.been.calledOnce;
        });

        it( 'should be ignored via the _capture tag', function () {
          var spy = sinon.spy();
          flow = new Flow({
            _capture: {buffer: 0},
            _on: function () {
              new Flow();
              new Flow();
              this.subs(new Flow());
              this.subs(new Flow());
              this.subs({buffer: 1}).should.have.lengthOf(2);
              this.subs({buffer: 0}).should.have.lengthOf(2);
              this.subs().should.have.lengthOf(4);
              spy();
            }
          });
          flow.go(1);
          spy.should.have.been.calledOnce;
        });

      });

    });

    describe( 'short-form', function () {

      it( 'should let `true` include all captured items', function () {
        flow = new Flow({
          _capture: true,
          _on: function () {
            new Flow();
            new Flow();
            this.subs(new Flow());
            this.subs(new Flow());
          }
        });
        flow.go(1);
        flow.subs(true).should.equal(4);
      });

      it( 'should let `false` exclude all captured items', function () {
        flow = new Flow({
          _capture: true,
          _on: function () {
            new Flow();
            new Flow();
            this.subs(new Flow());
            this.subs(new Flow());
          }
        });
        flow.go(1);
        flow.subs(false).should.equal(0);
      });

      it( 'should let a number filter items on the matching state index', function () {
        flow = new Flow(function () {
          var
            foo = new Flow(fooProgram),
            bar = new Flow(barProgram)
          ;
          foo.go(4).should.be.ok;
          bar.go('//bar/play').should.be.ok;
          this.subs(foo, bar);
        });
        flow.go(1);
        flow.subs(4).should.equal(1);
        flow.subs(3).should.equal(1);
        flow.subs(0).should.equal(0);
      });

      it( 'should let a string/regexp filter items on or within the matching state name', function () {
        flow = new Flow(function () {
          var
            foo = new Flow(fooProgram),
            bar = new Flow(barProgram)
          ;
          foo.go(4).should.be.ok;
          bar.go('//bar/play').should.be.ok;
          this.subs(foo, bar);
        });
        flow.go(1);
        flow.subs('peep').should.equal(1);
        flow.subs('play').should.equal(1);
        flow.subs('foo').should.equal(0);
        flow.subs(/^./).should.equal(2);
      });

      it( 'should let a string/regexp filter items on or within the matching state path', function () {
        flow = new Flow(function () {
          var
            foo = new Flow(fooProgram),
            bar = new Flow(barProgram)
          ;
          foo.go(4).should.be.ok;
          bar.go('//bar/play').should.be.ok;
          this.subs(foo, bar);
        });
        flow.go(1);
        flow.subs('bo/peep').should.equal(1);
        flow.subs('bar/play').should.equal(1);
        flow.subs('bar/p').should.equal(0);
        flow.subs('//').should.equal(2);
        flow.subs(/\/p/).should.equal(2);
      });

    });

  });

});