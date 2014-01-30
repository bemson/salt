describe( 'Salt#wait()', function () {

  var salt;

  it( 'should fail when the instance is idle (outside a state callback)', function () {
    salt = new Salt();
    salt.wait(0).should.not.be.ok;
    salt.wait('//', 0).should.not.be.ok;
    salt.wait('//', 0, 'foo').should.not.be.ok;
  });

  it( 'should fail when the delay is not a number', function () {
    salt = new Salt(function () {
      var f = this;
      [ 'a', {}, /a/, [] ].forEach(function (nonNumber) {
        // test with get
        f.wait(0, nonNumber).should.equal(false);
        // test without
        f.wait(nonNumber).should.equal(false);
      });
    });

  });

  it( 'should pause navigation', function () {
    salt = new Salt({
      _in: function () {
        this.wait();
      },
      foo: {}
    });
    salt.go('//foo/');
    salt.status().paused.should.equal(true);
    salt.state.path.should.equal('//');
  });

  it( 'should delay navigation', function (done) {
    salt = new Salt({
      _in: function () {
        this.wait(0);
      },
      _on: function (passedThru) {
        passedThru();
      }
    });
    salt.get(1, done);
  });

  it( 'should redirect after delay', function (done) {
    salt = new Salt({
      _on: function () {
        this.wait('end', 0);
      },
      end: function () {
        done();
      }
    });
    salt.go(1);
  });

  it( 'should pass-through arguments to delayed navigation', function (done) {
    salt = new Salt({
      _on: function (passedThru) {
        this.wait('end', 0, passedThru);
      },
      end: function (passedThru) {
        passedThru();
      }
    });
    salt.get(1, done);
  });

  it( 'should pass-through arguments to delayed callbacks', function (done) {
    salt = new Salt(function (passedThru) {
      this.wait(function (delayFnc) {
        delayFnc();
      }, 0, passedThru);
    });
    salt.get(1, done);
  });

  it( 'should work via (multiple) delayed callbacks', function (done) {
    salt = new Salt(function () {
      this.wait(
        function (passedThru1) {
          this.wait(
            function (passedThru2) {
              this.wait(passedThru2, 0);
            },
            0,
            passedThru1
          );
        },
        0,
        done
      );
    });
    salt.go(1);
  });

  it( 'should prevent parent Salt from completing', function () {
    var
      spy = sinon.spy(),
      pinner = new Salt(function () {
        this.wait();
      })
    ;
    salt = new Salt({
      _in: function () {
        pinner.go(1);
      },
      _on: spy
    });
    salt.go(1);
    spy.should.not.have.been.called;
    salt.status().pinned.should.equal(true);
    pinner.status().paused.should.equal(true);
    pinner.go();
    salt.status().pinned.should.equal(false);
    spy.should.have.been.calledOnce;
  });

  it( 'should invoke callback with permissions of "self"', function (done) {
    salt = new Salt({
      _perms: '!world',
      _on: function () {
        this.wait('a', 0).should.be.ok;
      },
      a: function () {
        // using internal/package-method "is" (for testing purposes only)
        Salt.pkg('core')(this).is('self').should.be.ok;
        done();
      }
    });
    salt.go(1);
  });

});