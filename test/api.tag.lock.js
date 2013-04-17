describe( '_lock tag', function () {

  var flow;

  it( 'should enable locking when entering a tagged branch', function () {
    var spy = sinon.spy(function () {
      this.lock().should.equal(true);
    });
    flow = new Flow({
      _lock: 1,
      _on: spy
    });
    flow.go(1);
    spy.should.have.been.calledOnce;
  });

  it( 'should enable unlocking within a tagged branch', function () {
    var
      inSpy = sinon.spy(function () {
        this.lock().should.equal(false);
        this.lock(1);
        this.lock().should.equal(true);
      }),
      aSpy = sinon.spy(function () {
        this.lock().should.equal(false);
      })
    ;
    flow = new Flow({
      _in: inSpy,
      a: {
        _lock: 0,
        _on: aSpy
      }
    });
    flow.go('//a');
    inSpy.should.have.been.calledOnce;
    aSpy.should.have.been.calledOnce;
  });

  it( 'should restore the last parent lock state', function () {
    var doneSpy = sinon.spy();
    flow = new Flow({
      _tail: true,
      _on: doneSpy,
      from_locked: {
        _lock: 1,
        _in: 'the/test',
        _on: function () {
          this.lock().should.equal(true);
        },
        the: {
          test: {
            _lock: 0,
            _on: function () {
              this.lock().should.equal(false);
            }
          }
        }
      },
      from_unlocked: {
        _in: 'the/test',
        _on: function () {
          this.lock().should.equal(false);
        },
        the: {
          test: {
            _lock: 1,
            _on: function () {
              this.lock().should.equal(true);
            }
          }
        }
      }
    });
    flow.go('//from_locked', '//from_unlocked');
    doneSpy.should.have.been.calledOnce;
  });

  it( 'should not restore last parent lock state when using `.lock()`', function () {
    var doneSpy = sinon.spy();
    flow = new Flow({
      _tail: true,
      _on: doneSpy,
      change_lock: {
        _lock: 1,
        _in: function () {
          this.lock().should.equal(true);
          this.lock(0).should.be.ok;
          this.lock().should.equal(false);
          this.go('the/test');
        },
        _on: function () {
          this.lock().should.equal(false);
        },
        the: {
          test: {
            _lock: 0,
            _on: function () {
              this.lock().should.equal(false);
            }
          }
        }
      }
    });
    flow.go('//change_lock');
    doneSpy.should.have.been.calledOnce;
  });

  // it( 'should allow procedural unlocking (via callbacks)', function () {
  //   var doneSpy = sinon.spy();
  //   flow = new Flow({
  //     _tail: true,
  //     _on: doneSpy,
  //     locked: {
  //       _in: function () {
  //         this.lock(1);
  //         this.lock().should.equal(true);
  //       },
  //       _on: function () {
  //         this.lock().should.equal(true);
  //       },
  //       test: {
  //         _lock: 0,
  //         _in: function () {
  //           this.lock().should.equal(false);
  //         },
  //         _on: '@parent'
  //       }
  //     },
  //     unlocked: {
  //       _in: function () {
  //         this.lock().should.equal(false);
  //       },
  //       _on: function () {
  //         this.lock().should.equal(false);
  //       },
  //       test: {
  //         _lock: 1,
  //         _on: '@parent'
  //       }
  //     }
  //   });
  //   flow.go('//locked/test', '//unlocked/test').should.be.ok;
  //   doneSpy.should.have.been.calledOnce;
  // });

});