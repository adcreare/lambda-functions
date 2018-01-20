import { Callback, Handler } from 'aws-lambda';
import * as AWS from 'aws-sdk';
import * as https from 'https';
import * as url from 'url';


const dynamodb = new AWS.DynamoDB();
const dynamodbTableName =  process.env.dynamodbTableName;


export const run: Handler = async (event, context, cb: Callback) => {

  console.log('REQUEST RECEIVED:\n' + JSON.stringify(event));

  // For Delete requests, immediately send a SUCCESS response.
  if (event.RequestType === 'Delete') {
      console.log('Delete received');
      sendResponse(event, context, cb, 'SUCCESS');
      return;
  }

  // if the name of the image isn't set we can't search for it, throw error back to CF stack
  let amiImageName;
  try{
    amiImageName = event.ResourceProperties.AMIImageName;
  }
  catch (e){
    console.log(`ERROR: The cloudformation custom Resource property "AMIImageName: "value" was NOT set\n`
                + `Function will now exit`);
    sendResponse(event,
      context,
      cb,
      'FAILED', 'the cloudformation custom Resource property "AMIImageName: "value" was NOT set');
    return;
  }

  let latestAmi;
  try{
    const dynamodbResult = await queryDynamoDB(dynamodbTableName, amiImageName);
    if (dynamodbResult.Items.length >= 1){
      latestAmi = await findLatestAMI(dynamodbResult.Items);
    }
    else {
      throw new Error(`No images found matching: ${amiImageName} in table ${dynamodbTableName}`);
    }

    const responseStatus = 'SUCCESS';
    const responseData = {Id: latestAmi};
    sendResponse(event, context, cb, responseStatus, responseData);


  }
  catch (err)
  {
    console.log(`ERROR: ${err}`);
    sendResponse(event, context, cb, 'FAILED', err);
    cb(err, 'ERROR');
    return;
  }



};

function findLatestAMI(arrayOfAMIFromDynamoDB: any[]): string
{
  console.log('findLatestAMI');
  console.log(arrayOfAMIFromDynamoDB);
  const currentDate: any = new Date();
  let smallest = Number(arrayOfAMIFromDynamoDB[0].timestamp.S);
  smallest = Math.abs(currentDate - smallest);

  let latestAmi = arrayOfAMIFromDynamoDB[0].amiid.S;

  arrayOfAMIFromDynamoDB.forEach((item) => {

    const time: any = new Date(Number(item.timestamp.S));
    const timeDifference = Math.abs(currentDate - time);
    if (timeDifference <  smallest)
    {
      smallest = timeDifference;
      latestAmi = item.amiid.S;
    }

  });
  return latestAmi;
}

function queryDynamoDB(tableName, imageName)
{
  console.log('queryDynamodb');
  const params = {
     ExpressionAttributeValues: {
        ':image': { S: imageName}
     },
     KeyConditionExpression: 'imagename = :image',
     TableName: tableName,
     IndexName: 'ami-lookup-index'
    };

  return dynamodb.query(params).promise();
}


// Send response to the pre-signed S3 URL
function sendResponse(event, context, lambdaCallback , responseStatus, responseData?: any) {

  let responseReason = 'See the details in CloudWatch Log Stream: ' + context.logStreamName;
  if (responseStatus === 'FAILED') // if we get an error use the responseData
                                   // as the error message then flush it
  {
    responseReason = `${responseData} - ${responseReason}`;
    responseData = undefined;
  }

  const responseBody = JSON.stringify({
    Status: responseStatus,
    Reason: responseReason,
    PhysicalResourceId: context.logStreamName,
    StackId: event.StackId,
    RequestId: event.RequestId,
    LogicalResourceId: event.LogicalResourceId,
    Data: responseData
  });

  console.log('RESPONSE BODY:\n', responseBody);


  const parsedUrl = url.parse(event.ResponseURL);
  const options = {
        hostname: parsedUrl.hostname,
        port: 443,
        path: parsedUrl.path,
        method: 'PUT',
        headers: {
            'content-type': '',
            'content-length': responseBody.length
        }
  };

  console.log('SENDING RESPONSE...\n');

  const request = https.request(options, (response) => {
        console.log('STATUS: ' + response.statusCode);
        console.log('HEADERS: ' + JSON.stringify(response.headers));
        // Tell AWS Lambda that the function execution is done
        lambdaCallback(null, 'completed');
    });

  request.on('error', (error) => {
        console.log('sendResponse Error:' + error);
        // Tell AWS Lambda that the function execution is done
        lambdaCallback(error);
    });

    // write data to request body
  request.write(responseBody);
  request.end();
}
