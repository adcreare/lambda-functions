'use strict';
const async = require('async');
const AWS = require('aws-sdk');

const ec2 = new AWS.EC2();
const cloudformation = new AWS.CloudFormation();
const sqs = new AWS.SQS();

var sqsQueueName =  process.env.sqsQueueName;
var sqsURL;

module.exports.handlerequest = (event, context, callback) => {

  sqsURL = generateSQSUrl(context,sqsQueueName);

  async.waterfall([ async.constant(sqsURL), getMessagesFromSQS],
    function(err,response)
    {
      if(err)
      {
        let error = `Error response received talking to sqs - err object: ${err}`;
        console.log(error);
        callback(err,error);
        return;
      }

      else
      {
        processSQSResponse(response,sqsURL,callback);
      }

    });

}; //end handlerequest


function processSQSResponse(response,sqsURL,lambdaCallback)
{
  try{
    if(typeof(response.Messages) === 'undefined')
    {
      console.log('No messages to process in sqs');
      lambdaCallback(null,' no messages to process in sqs');
      return;
    }
    else if(response.Messages.length > 0)
    {
      response.Messages.forEach(function(item){processMessage(item,lambdaCallback);});
    }
    else
    {
      console.log('No messages to process in sqs');
      lambdaCallback(null,' no messages to process in sqs');
    }

  } //end try
  catch(e)
  {
    console.log('exception thrown in processing SQS messages: '+e);
    lambdaCallback(e,'exception thrown - sqs data object: '+response);
  }

}

function processMessage(item,callback)
{
  try {
    let sqsbody = JSON.parse(item.Body);

    isAmiIStopped(sqsbody.amiID,function(isStopped){
      if(isStopped)
      {
        deleteStack(sqsbody.stackName);
        deleteSQSMessage(sqsURL,item.ReceiptHandle);
        console.log(`successfully cleaned up after ami:${sqsbody.amiID} and deleted stack ${sqsbody.stackName}`);

      }
      else {
        console.log('ami is not stopped: '+sqsbody.amiID);
      }
    }); //end callback

  }
  catch (e) {
    console.log('exception thrown in process message');
    callback(e,'exception thrown in process message');
  }
}


function isAmiIStopped(amiId,callback)
{
  const params = {ImageIds:[amiId]};

  ec2.describeImages(params,function(err,response){
    if(err)
    {
      console.log('error performing describe images: '+err);
      callback(false);
      return;
    }
    console.log(`describe images response ${JSON.stringify(response)}`);

    let imageComplete = false;
    if(response.Images[0].State === "available") imageComplete = true;

    callback(imageComplete);

  });

}



function deleteStack(stackName)
{
  const params = {  StackName: stackName };
  cloudformation.deleteStack(params, function(err, data) {
    if (err) console.log(`error received attempting to delete stack: ${err} - ${err.stack}`); // an error occurred
    else     console.log(`Deleted stack successfully ${data}`);           // successful response
  });
}

function deleteSQSMessage(queueURL,receipt)
{
  const params = {
    QueueUrl: queueURL, /* required */
    ReceiptHandle: receipt /* required */
  };

  sqs.deleteMessage(params, function(err, data) {
    if (err) console.log(`error received attempting to delete sqs message: ${err} - ${err.stack}`); // an error occurred
    else     console.log(`Deleted message from SQS - ${data}`);           // successful response
  });

}

function getMessagesFromSQS(sqsQueueURL,callback)
{
  const params = {
    QueueUrl: sqsQueueURL
  };

  sqs.receiveMessage(params, callback);

}


function generateSQSUrl(context,sqsQueueName)
{
  try{
    let lambdaARNArray = context.invokedFunctionArn.split(':');
    let region = lambdaARNArray[3];
    let accountID = lambdaARNArray[4];
    return `https://sqs.${region}.amazonaws.com/${accountID}/${sqsQueueName}`;
  }
  catch (e){
    console.log('generateSQSUrl failed');
    return false;
  }

}
