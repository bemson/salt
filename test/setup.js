var
  Salt = require('../src/salt'),
  sinon = require('sinon'),
  chai = require('chai'),
  sinonChai = require('sinon-chai')
;

chai.use(sinonChai);
chai.should();

global.Salt = Salt;
global.sinon = sinon;
global.expect = chai.expect;