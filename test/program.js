describe( 'Program', function () {

  var flow;

  describe( 'state', function () {

    describe( 'names', function () {

      it( 'should begin with a letter', function () {
        flow = new Flow({
          '*fail': {},
          'success': {}
        });
        flow.query('//*fail').should.not.be.ok;
        flow.query('//success').should.be.ok;
      });

      it( 'should not be "toString"', function () {
        flow = new Flow({
          toString: {}
        });
        flow.query('//toString').should.not.be.ok;
      });

      it( 'should not contain a ".", "/", or "|" character', function () {
        flow = new Flow({
          'hello world': {},
          'hello.world': {},
          'hello/world': {},
          'hello|world': {}
        });

        flow.query('//hello world').should.be.ok;
        flow.query('//hello.world').should.not.be.ok;
        flow.query('//hello/world').should.not.be.ok;
        flow.query('//hello|world').should.not.be.ok;
      });

      it( 'should allow spaces', function () {
        flow = new Flow({
          'hello world': {
            'good bye, universe': {}
          }
        });
        flow.query('//hello world/good bye, universe/').should.be.ok;
      });

      it( 'should not begin with an "@" symbol', function () {
        flow = new Flow({
          '@fail': 1
        });
        flow.query('//@fail').should.not.be.ok;
      });


      it( 'should not begin with a number ', function () {
        flow = new Flow({
          '2fail': 1
        });
        flow.query('//2fail').should.not.be.ok;
      });


      it( 'should not begin with a space ', function () {
        flow = new Flow({
          ' fail': 1
        });
        flow.query('// fail').should.not.be.ok;
      });


    });

  });

});