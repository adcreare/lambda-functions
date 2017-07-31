'use strict';
var assert = require("chai").assert;
var expect = require("chai").expect;
var rewire = require('rewire');
const fs = require('fs');

var myCodeFile = rewire('../ami-creator-engine.js');

const testEvent = require('../sample-events/codepipeline-events.json');

var path = process.cwd();
const testEventMyStackFileOutput = fs.readFileSync(path+'/sample-events/MyStackOutputFileName');
const testEventMyStackFileOutputZipped = fs.readFileSync(path+'/sample-events/stackoutput.zip');
const testEventMyStackFileOutputZippedBadFile = fs.readFileSync(path+'/sample-events/stackoutput-badfile.zip');

var runWorkFlow = myCodeFile.__get__('runWorkFlow');
var validateInput = myCodeFile.__get__('validateInputAndProvideKeyData');
var extractFile = myCodeFile.__get__('extractFile');
var getFileFromS3 = myCodeFile.__get__('getFileFromS3');
var processCFStackResponse = myCodeFile.__get__('processCFStackResponse');
var createAMIMachineImage = myCodeFile.__get__('createAMIMachineImage');

describe("main function file", function() {

  it("exports as a function", function() {
      assert.typeOf(validateInput, "function");
      assert.typeOf(runWorkFlow, "function");
      assert.typeOf(getFileFromS3, "function");
      assert.typeOf(processCFStackResponse, "function");
      assert.typeOf(createAMIMachineImage, "function");
  });

  it("validateInput works as expected", function() {
    expect(validateInput(testEvent)).to.deep.equal({bucketname:'codepipeline-us-east-1-000000000000',objectkey:'MyTestStack/MyStackOut/BG7789K'});
    expect(validateInput({'testdata':'test'})).to.be.false;

  });

  it("extractFile works as expected to extract good file", function(done) {
    extractFile(testEventMyStackFileOutputZipped, function(err,data){
      assert.typeOf(data,"object");
      done();
    })
  });

  it("extractFile throws as expected with bad file input", function(done) {
    assert.throws(function(){
      extractFile(testEventMyStackFileOutputZippedBadFile,function(err,data){})
    }, Error, 'Zip file appears to have multiple files instead of the expected 1');
    done();
  });

  it("processCFStackResponse works as expected", function() {
    expect(processCFStackResponse(testEventMyStackFileOutput)).to.deep.equal({"InstanceID": "i-0f6d82a4ab76ce609"});
  });


  it("processCFStackResponse works as expected", function() {
    expect(processCFStackResponse('{"InstanceID":"i-0f6d82a4ab76ce609"}')).to.deep.equal({InstanceID:'i-0f6d82a4ab76ce609'});
  });



});
