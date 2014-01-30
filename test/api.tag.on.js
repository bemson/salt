describe( '_on tag', function () {
  
  var salt;

  it( 'should execute the given function when a state is targeted', function () {
    var spy = sinon.spy();
    salt = new Salt({
      _on: spy
    });
    salt.go(1);
    spy.should.have.been.calledOnce;
  });

  it( 'should scope the given function to the Salt instance', function () {
    var spy = sinon.spy();
    salt = new Salt({
      _on: spy
    });
    salt.go(1);
    spy.should.have.been.calledOn(salt);
  });

  describe( 'redirects', function () {

    it( 'should navigate to the resolved state when paired with a query', function () {
      salt = new Salt({
        _on: '@child',
        b: {}
      });
      salt.go('//');
      salt.state.path.should.equal('//b/');
    });

    it( 'should navigate queries as waypoints', function () {
      var spy = sinon.spy();
      salt = new Salt({
        a: {
          _on: '@oldest'
        },
        b: {},
        c: spy
      });
      salt.go('//a/', '//b/');
      spy.should.have.been.calledOnce;
      salt.state.path.should.equal('//b/');
    });

    it( 'should not accept queries to the current state', function () {
      var spyTraverse = sinon.spy(Salt.pkg('core'), 'onTraverse');
      salt = new Salt({
        _on: '@self'
      });
      salt.go('//');
      spyTraverse.should.have.been.calledTwice;
      Salt.pkg('core').onTraverse.restore();
    });

    describe( 'prefixed with ">"', function () {

      it( 'should set new destination state', function () {
        var
          Cspy = sinon.spy(),
          Bspy = sinon.spy()
        ;
        salt = new Salt({
          _on: '>a/b',
          a: {
            b: Bspy
          },
          c: Cspy
        });
        salt.go(1, '//c/');

        Cspy.should.not.have.been.called;
        Bspy.should.have.been.calledOnce;
        salt.state.path.should.equal('//a/b/');
      });

      it( 'should pass-thru arguments', function () {
        var
          Cspy = sinon.spy(),
          Bspy = sinon.spy(),
          arg1 = {},
          arg2 = {}
        ;
        salt = new Salt({
          _on: '>a/b',
          a: {
            b: Bspy
          },
          c: Cspy
        });
        salt.get(1, arg1, arg2);

        Cspy.should.not.have.been.called;
        Bspy.should.have.been.calledOnce;
        Bspy.should.have.been.calledWith(arg1, arg2);
        salt.state.path.should.equal('//a/b/');
      });

    });

  });

});