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
    flow.status().path.should.equal('//');
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

  it( 'should prevent parent Flow from completing', function (done) {
    var pender = new Flow(function () {
      this.wait();
    });
    flow = new Flow({
      _in: function () {
        pender.go(1);
      },
      _on: done
    });
    flow.go(1);
    flow.status().pending.should.be.ok;
    pender.status().paused.should.be.ok;
    pender.go();
  });

});