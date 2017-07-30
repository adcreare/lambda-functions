'use strict';
var assert = require("chai").assert;
var expect = require("chai").expect;
var rewire = require('rewire');

var myCodeFile = rewire('../ami-creator-engine.js');

const testEvent = require('../sample-events/codepipeline-events.json');


var performOperations = myCodeFile.__get__('performOperations');

var validateInput = myCodeFile.__get__('validateInputAndProvideKeyData');

describe("main function file", function() {

  it("exports as a function", function() {
      assert.typeOf(validateInput, "function");
      assert.typeOf(performOperations, "function");
  });

  it("validateInput works as expected", function() {
    expect(validateInput(testEvent)).to.deep.equal({bucketname:'codepipeline-us-east-1-000000000000',objectkey:'MyTestStack/MyStackOut/BG7789K'});
    expect(validateInput({'testdata':'test'})).to.be.false;

  });

  


});
