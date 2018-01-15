'use strict';
const async = require('async');
var AWS = require('aws-sdk');
const https = require("https");
const url = require("url");

var dynamodb = new AWS.DynamoDB();

const dynamodbTableName =  process.env.dynamodbTableName;


module.exports.run = (event, context, callback) => {

  console.log("REQUEST RECEIVED:\n" + JSON.stringify(event));

  

  // For Delete requests, immediately send a SUCCESS response.
  if (event.RequestType == "Delete") {
      sendResponse(event, context, callback, "SUCCESS");
      return;
  }

  //if the name of the image isn't set we can't search for it, throw error back to CF stack
  let amiImageName;
  try{
    amiImageName = event.ResourceProperties.AMIImageName;
  }
  catch(e){
    console.log('ERROR: The cloudformation custom Resource property "AMIImageName: "value" was NOT set\n Function will now exit');
    sendResponse(event, context, callback, "FAILED",'the cloudformation custom Resource property "AMIImageName: "value" was NOT set');
    return;
  }
  

  async.waterfall(
    [
    async.apply(queryDynamoDB,dynamodbTableName,amiImageName),
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
      console.log(`ERROR: ${err}`);
      sendResponse(event, context, callback, "FAILED", err);
      callback(err,'ERROR');
      return;
    }

  }
);

};

function findLatestAMI(arrayOfAMIFromDynamoDB, callback)
{
  console.log('findLatestAMI');
  console.log(arrayOfAMIFromDynamoDB);
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
  console.log('queryDynamodb');
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
    else{
      if(data.Items.length >= 1) callback(null,data.Items);           // successful response
      else callback(`No images found matching: ${imageName} in table ${tableName}`);
    }
  });
}


// Send response to the pre-signed S3 URL
function sendResponse(event, context, callback ,responseStatus, responseData) {

  var responseReason = "See the details in CloudWatch Log Stream: " + context.logStreamName;
  if (responseStatus==='FAILED') //if we get an error use the responseData as the error message then flush it
  {
    responseReason = `${responseData} - ${responseReason}`;
    responseData = undefined;
  }

    var responseBody = JSON.stringify({
        Status: responseStatus,
        Reason: responseReason,
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
