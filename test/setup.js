var
  Flow = require('../src/flow'),
  sinon = require('sinon'),
  chai = require('chai'),
  sinonChai = require('sinon-chai')
;

chai.use(sinonChai);
chai.should();

global.Flow = Flow;
global.sinon = sinon;
global.expect = chai.expect;