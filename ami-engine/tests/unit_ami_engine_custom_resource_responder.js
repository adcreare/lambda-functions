'use strict';
var assert = require("chai").assert;
var expect = require("chai").expect;
var rewire = require('rewire');

const fs = require('fs');

var AWS = require('aws-sdk');

var myCodeFile = rewire('../ami-engine-custom-resource-responder.js');
var queryDynamoDB = myCodeFile.__get__('queryDynamoDB');
var findLatestAMI = myCodeFile.__get__('findLatestAMI');

var path = process.cwd();
const listOfAMIsResponse = fs.readFileSync(path+'/sample-events/DynamoDB-AmiLooku-query-output.json').toString();



describe("main function file", function() {
  this.timeout(15000);

  it("dynamoDB query", function(done) {

    var dynamoDBMock = new AWS.DynamoDB();

    //mock dynamodb query method
    dynamoDBMock.query = function (params,callback) {
      var returnObject = {};
      returnObject.Items = JSON.parse(listOfAMIsResponse);
      callback(null,returnObject);
    };

    //inject the dependancy
    myCodeFile.__set__("dynamodb", dynamoDBMock);


    queryDynamoDB('ami-store','win-ami-builder', function(err,data){
      console.log(JSON.stringify(data));
      console.log(err);
      done();
      // assert.typeOf(data,"object"); //TODO

    });
  });


  it("find newest ami", function(done) {
    findLatestAMI(JSON.parse(listOfAMIsResponse), function(err,data){
      assert.equal(data,'ami-35260c4f');
      done();
      // assert.typeOf(data,"object");

    });
  });


});
