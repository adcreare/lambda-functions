'use strict';
const async = require('async');
const AWS = require('aws-sdk');
const AdmZip = require('adm-zip');

const s3 = new AWS.S3();
const ec2 = new AWS.EC2();
const dynamodb = new AWS.DynamoDB();
const codepipeline = new AWS.CodePipeline();
const cloudformation = new AWS.CloudFormation();

const snapShotDescription = process.env.snapShotDescription;
const dynamodbTableName =  process.env.dynamodbTableName;

module.exports.handlerequest = (event, context, callback) => {

  // TODO: tasks we need to perform
  // 1. check params - error if none exist
  // 2. download command file from S3
  // 3. check instance exists
  // 4. check instance is in a shutdown state (tied to 3 maybe)
  // 5. take AMI snapshot
  //
  // OPTIONAL:
  // 6. start state machine
  //
  //
  // TODO statemachine OPTIONAL
  // 1. check if ami snap has been completed - if not sleep and retry
  //
  //
  //
  //
  //
  const keyData = validateInputAndProvideKeyData(event);
  console.log(keyData);

  try{
    if (keyData === false) callback(null, { message: 'Incorrect input supplied: '+JSON.stringify(event) });
    else{
      getStackInformationWorkflow(keyData,context,callback);
    }
  }
  catch (e)
  {
    putJobFailed(keyData.codePipelineId,'PANIC!','PANIC! major exception',context,callback);
  }



}; //end handlerequest


function getStackInformationWorkflow(inputObject,context,lambdaCallback)
{

  async.waterfall(
    [
      async.apply(getFileFromS3,inputObject.bucketname,inputObject.objectkey),
      extractFile,
  ],
  function (err, message) {
    if(err)
    {
      processError(err,message,context,inputObject.codePipelineId,lambdaCallback);
    }
    else {
      console.log('Get and Process CF Stack information successful: '+JSON.stringify(message));
      checkMachineIsShutdown(inputObject,message,context,lambdaCallback);
    }
   }
  );

}

function checkMachineIsShutdown(inputObject,stackOutput,context,lambdaCallback)
{
  console.log('calling checkMachineIsShutdown');
  var params = {
    InstanceIds: [ stackOutput.InstanceID]
  };
  ec2.describeInstances(params, function(err, data) {
    processCheckMachineIsShutdown(inputObject,stackOutput,context,lambdaCallback,err,data);
  });
}

function processCheckMachineIsShutdown(inputObject,stackOutput,context,lambdaCallback,err,data)
{
  if (err){
    processError(err,'ec2.describeInstanceStatus error',context,inputObject.codePipelineId,lambdaCallback);
    return;
  }

  try
  {
    console.log(JSON.stringify(data));
    if(data.Reservations[0].Instances[0].State.Name === 'stopped') createAndStoreAMIWorkflow(inputObject,stackOutput,context,lambdaCallback);

    else setTimeout(checkMachineIsShutdown(inputObject,stackOutput,context,lambdaCallback),15000);

  }
  catch (e)
  {
      processError(err,'ec2.describeInstanceStatus processing error',context,inputObject.codePipelineId,lambdaCallback);
  }

}


function createAndStoreAMIWorkflow(inputObject,stackOutput,context,lambdaCallback)
{
  async.waterfall(
    [
      async.apply(createAMIMachineImage,snapShotDescription,stackOutput),
      async.apply(putAmiINDynamoDb,dynamodbTableName,stackOutput.StackName)
  ],
  function (err, message) {
    if(err)
    {
      processError(err,message,context,inputObject.codePipelineId,lambdaCallback);
    }
    else {
      console.log('job successful: '+JSON.stringify(message));
      putJobSuccess(inputObject.codePipelineId,lambdaCallback);
      //deleteStack(stackOutput.StackName,lambdaCallback); //only delete if we get a good build - reduce rerun time
      return;
    }

   }
  );
}


function processError(err,message,context,jobId,callback)
{
  console.log(`Error received - ${JSON.stringify(message)} -  error object: ${JSON.stringify(err)}`);
  putJobFailed(jobId,err,message,context,callback);
}

function getFileFromS3(bucket,key,getfileCallback)
{
  console.log('getfilesFromS3');
    const params = {
      Bucket: bucket,
      Key: key
    };

    s3.getObject(params, function(err,data)
    {
      if(err) getfileCallback(err,'Unable to get codepipeline stack file from S3');
      else getfileCallback(null,data.Body);
    });
}

//Function to extract a zip file
function extractFile(buffer,extractFileCallBack)
{
  console.log('extractFile');
  // console.log(buffer);
  var zip = new AdmZip(buffer);
  var zipEntries = zip.getEntries();

  if (zipEntries.length != 1) throw new Error('Zip file appears to have multiple files instead of the expected 1');

  extractFileCallBack(null,processCFStackResponse(zip.readAsText(zipEntries[0])));
}

function processCFStackResponse(dataContainedInFile)
{
  console.log('processCFStackResponse');
  return JSON.parse(dataContainedInFile);
}

function createAMIMachineImage(snapShotDescription,awsStackOutput,callback)
{
  console.log('createAMIMachineImage');
  const params = {
    InstanceId: awsStackOutput.InstanceID, /* required */
    Name: `${awsStackOutput.StackName}-${getDate()}`, /* required */
    Description: snapShotDescription,
  };
  console.log(params);
  ec2.createImage(params, function(err, data) {
    if (err) callback(err,'Unable to create AMI machine image'); // an error occurred
    else callback(null,data.ImageId);           // successful call back with AMI id
  });
}

function putAmiINDynamoDb(tableName,stackName,amiId,callback)
{
  console.log('stackname object');
  console.log(stackName);
  console.log(amiId);
  const params = {
    Item: {
     "amiid": {
       S: amiId
      },
     "imagename": {
       S: stackName
      },
     "timestamp": {
       S: getTimeStamp().toString()
      }
    },
    TableName: tableName
  };

  dynamodb.putItem(params,function(err,response){
    if (err) callback(err); // an error occurred
    else     callback(null,response);           // successful response
  });

}

function deleteStack(stackName,callback)
{
  var params = {
    StackName: stackName
  };
  cloudformation.deleteStack(params, function(err, response) {
    if (err) callback(err); // an error occurred
    else     callback(null,response);           // successful response
  });

}

function putJobSuccess(jobIdObject, callback)
{
  console.log('putJobSuccess');
  const params = {
      jobId: jobIdObject
  };

  codepipeline.putJobSuccessResult(params, function(err, data) {
      if(err) callback(err,'Unable to mark codepipeline job as successful');
      else callback(null,'job completed successfully');
  });
}

function putJobFailed(jobId,err,message,lambdaContext,lambdaCallback)
{
  // console.log('putJobFailed');
  // console.log(jobId);
  // console.log(err);
  // console.log(message);
  // console.log(lambdaContext.invokeid);

  if(typeof(message) === 'undefined') message = 'no message supplied';
  if(typeof(err) === 'undefined') err = 'no err supplied';

  const params = {
      jobId: jobId,
      failureDetails: {
          message: JSON.stringify(message),
          type: 'JobFailed',
          externalExecutionId: lambdaContext.invokeid
      }
  };

  codepipeline.putJobFailureResult(params, function(err, data) {
      if(err)
      {
        console.log('Call to put failed job data: '+data+' err:' +err);
      }
      lambdaCallback(null,message);
  });
}


function getDate()
{
  return (new Date().toISOString()).replace(/:/g,'.');
}

function getTimeStamp()
{
  return (new Date().getTime());
}

/*

 */
function validateInputAndProvideKeyData(event)
{

  let bucketName, objectKey, id;

  try{
    bucketName = event["CodePipeline.job"].data.inputArtifacts[0].location.s3Location.bucketName;
    objectKey = event["CodePipeline.job"].data.inputArtifacts[0].location.s3Location.objectKey;
    id = event["CodePipeline.job"].id;
  }
  catch(err)
  {
    return false;
  }
  return {'bucketname':bucketName,'objectkey':objectKey, codePipelineId: id};
}
