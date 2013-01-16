describe( 'Flow', function () {

  // it( 'should only be used as a constructor', function () {
  //   Flow.should.be.a('function');
  //   expect(function () {
  //     Flow();
  //   }).to.throw();
  //   expect(function () {
  //     new Flow();
  //   }).to.not.throw();
  // });

  // it( 'should have a single "core" package', function () {
  //   Flow.should.itself.respondTo('pkg');
  //   Flow.pkg()
  //     .should.be.an.instanceOf(Array)
  //     .and.deep.equals(['core']);
  // });


  it( 'should execute functions as it navigates the compiled states of a program', function () {
    var
      fncs = [
        sinon.spy(),
        sinon.spy(),
        sinon.spy(),
        sinon.spy(),
        sinon.spy(),
        sinon.spy()
      ],
      flow = new Flow({
        one: {
          _in: fncs[0],
          _on: fncs[1],
          _out: fncs[2]
        },
        two: {
          _in: fncs[3],
          _on: fncs[4],
          _out: fncs[5]
        }
      });

      flow.go('//one','//two', '//');

      fncs.forEach(function (fnc, idx, ary) {
        fnc.should.have.been.calledOnce;
        if (idx + 1 < ary.length) {
          fnc.should.have.been.calledBefore(ary[idx + 1]);
        } else {
          fnc.should.have.been.calledAfter(ary[idx - 1]);
        }
      });
    ;
  });

  // describe( 'navigation');

  // describe( 'program', function () {

  //   it( 'should be any value passed to the Flow constructor');

  //   describe( 'state', function () {

  //     it( 'should be reflected the current state of it\'s program');

  //   });

  // });

});