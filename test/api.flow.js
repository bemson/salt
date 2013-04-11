describe( 'Flow', function () {

    it( 'should throw without the `new` statement', function () {
      expect(Flow).to.throw();
    });

    it( 'should return an instance', function () {
      (new Flow()).should.be.an.instanceOf(Flow);
    });

});