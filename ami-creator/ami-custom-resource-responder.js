'use strict';
const async = require('async');
var AWS = require('aws-sdk');
const https = require("https");
const url = require("url");

var dynamodb = new AWS.DynamoDB();

const dynamodbTableName =  process.env.dynamodbTableName;


module.exports.handlerequest = (event, context, callback) => {

  console.log("REQUEST RECEIVED:\n" + JSON.stringify(event));

  // For Delete requests, immediately send a SUCCESS response.
  if (event.RequestType == "Delete") {
      sendResponse(event, context, callback, "SUCCESS");
      return;
  }

  async.waterfall(
    [
    async.apply(queryDynamoDB,event,context),
    findLatestAMI
  ],
  function(err, results) {

    if(!err)
    {

      var responseStatus = "SUCCESS";
      var responseData = {};
      responseData.Id=results;
      sendResponse(event,context,callback,responseStatus,responseData);

    }
    else
    {
      console.log(`MAJOR ERROR: ${err}`);
      callback(err,'MAJOR ERROR');
      return;
    }

  }
);

};

function findLatestAMI(arrayOfAMIFromDynamoDB, callback)
{
  const currentDate = new Date();
  var smallest = parseInt(arrayOfAMIFromDynamoDB[0].timestamp.S);
  smallest = Math.abs(currentDate-smallest);

  var latestAmi = arrayOfAMIFromDynamoDB[0].amiid.S;

  arrayOfAMIFromDynamoDB.forEach(function(item){

    var time = new Date(parseInt(item.timestamp.S));
    var timeDifference = Math.abs(currentDate-time);
    if(timeDifference <  smallest)
    {
      smallest = timeDifference;
      latestAmi = item.amiid.S;
    }

  });
  callback(null,latestAmi);
}

function queryDynamoDB(tableName,imageName,callback)
{
  const params = {
     ExpressionAttributeValues: {
      ":image": {
        S: imageName
       }
     },
     KeyConditionExpression: "imagename = :image",
     TableName: tableName,
     IndexName:'ami-lookup-index'
    };

  dynamodb.query(params, function(err, data) {
  if (err) callback(err); // an error occurred
  else     callback(null,data.Items);           // successful response
  });
}


// Send response to the pre-signed S3 URL
function sendResponse(event, context, callback ,responseStatus, responseData) {

    var responseBody = JSON.stringify({
        Status: responseStatus,
        Reason: "See the details in CloudWatch Log Stream: " + context.logStreamName,
        PhysicalResourceId: context.logStreamName,
        StackId: event.StackId,
        RequestId: event.RequestId,
        LogicalResourceId: event.LogicalResourceId,
        Data: responseData
    });

    console.log("RESPONSE BODY:\n", responseBody);



    var parsedUrl = url.parse(event.ResponseURL);
    var options = {
        hostname: parsedUrl.hostname,
        port: 443,
        path: parsedUrl.path,
        method: "PUT",
        headers: {
            "content-type": "",
            "content-length": responseBody.length
        }
    };

    console.log("SENDING RESPONSE...\n");

    var request = https.request(options, function(response) {
        console.log("STATUS: " + response.statusCode);
        console.log("HEADERS: " + JSON.stringify(response.headers));
        // Tell AWS Lambda that the function execution is done
        callback(null,'completed');
    });

    request.on("error", function(error) {
        console.log("sendResponse Error:" + error);
        // Tell AWS Lambda that the function execution is done
        callback(error);
    });

    // write data to request body
    request.write(responseBody);
    request.end();
}
