describe( 'Flow#wait()', function () {

  var flow;

  it( 'should fail when the instance is idle (outside a state callback)', function () {
    flow = new Flow();
    flow.wait(0).should.not.be.ok;
    flow.wait('//', 0).should.not.be.ok;
    flow.wait('//', 0, 'foo').should.not.be.ok;
  });

  it( 'should pause navigation', function () {
    flow = new Flow({
      _in: function () {
        this.wait();
      },
      foo: {}
    });
    flow.go('//foo/');
    flow.status().paused.should.equal(true);
    flow.state.path.should.equal('//');
  });

  it( 'should delay navigation', function (done) {
    flow = new Flow({
      _in: function () {
        this.wait(0);
      },
      _on: function (passedThru) {
        passedThru();
      }
    });
    flow.target(1, done);
  });

  it( 'should redirect after delay', function (done) {
    flow = new Flow({
      _on: function () {
        this.wait('end', 0);
      },
      end: function () {
        done();
      }
    });
    flow.go(1);
  });

  it( 'should pass-through arguments to delayed navigation', function (done) {
    flow = new Flow({
      _on: function (passedThru) {
        this.wait('end', 0, passedThru);
      },
      end: function (passedThru) {
        passedThru();
      }
    });
    flow.target(1, done);
  });

  it( 'should pass-through arguments to delayed callbacks', function (done) {
    flow = new Flow(function (passedThru) {
      this.wait(function (delayFnc) {
        delayFnc();
      }, 0, passedThru);
    });
    flow.target(1, done);
  });

  it( 'should work via (multiple) delayed callbacks', function (done) {
    flow = new Flow(function () {
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
    flow.go(1);
  });

  it( 'should prevent parent Flow from completing', function () {
    var
      spy = sinon.spy(),
      pender = new Flow(function () {
        this.wait();
      })
    ;
    flow = new Flow({
      _in: function () {
        pender.go(1);
      },
      _on: spy
    });
    flow.go(1);
    spy.should.not.have.been.called;
    flow.status().pending.should.equal(true);
    pender.status().paused.should.equal(true);
    pender.go();
    flow.status().pending.should.equal(false);
    spy.should.have.been.calledOnce;
  });

  it( 'should invoke callback with same permissions as caller', function (done) {
    flow = new Flow({
      _perms: '!world',
      _on: function () {
        this.wait('a', 0);
      },
      a: done
    });
    flow.go(1);
  });

});