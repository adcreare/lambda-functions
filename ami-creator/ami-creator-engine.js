'use strict';
const async = require('async');
const AWS = require('aws-sdk');
const AdmZip = require('adm-zip');
const s3 = new AWS.S3();
const ec2 = new AWS.EC2();
const codepipeline = new AWS.CodePipeline();

const snapShotDescription = 'snap taken by ami-creator-engine';
const snapShotNamePrefix = 'mytestsnapshot';

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
  if (keyData === false) callback(null, { message: 'Incorrect input supplied: '+JSON.stringify(event) });
  else runWorkFlow(keyData,callback);


}; //end handlerequest


function runWorkFlow(inputObject,callback)
{
  async.waterfall(
    [
      async.apply(getFileFromS3,inputObject.bucketname,inputObject.objectkey),
      extractFile,
      async.apply(createAMIMachineImage,snapShotNamePrefix,snapShotDescription),
      async.apply(putJobSuccess,inputObject.jobId)
      //callback(null,'execution completed')
  ],
  function (err, message) {
    console.log(`Error received - ${message} -  error object: ${JSON.stringify(err)}`);
    callback(err,message);
   }
  );
}


function testImDoneFunction()
{
  console.log('AWESOME! - should be last');
}

function getFileFromS3(bucket,key,getfileCallback)
{
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
  // console.log(buffer);
  var zip = new AdmZip(buffer);
  var zipEntries = zip.getEntries();

  if (zipEntries.length != 1) throw new Error('Zip file appears to have multiple files instead of the expected 1');

  extractFileCallBack(null,processCFStackResponse(zip.readAsText(zipEntries[0])));
}

function processCFStackResponse(dataContainedInFile)
{
  return JSON.parse(dataContainedInFile);
}

function createAMIMachineImage(snapShotNamePrefix,snapShotDescription,awsStackOutput,callback)
{
  const params = {
    InstanceId: awsStackOutput.InstanceID, /* required */
    Name: `${snapShotNamePrefix}-${getDate()}`, /* required */
    Description: snapShotDescription,
  };
  console.log(params);
  ec2.createImage(params, function(err, data) {
    if (err) callback(err,'Unable to create AMI machine image'); // an error occurred
    else callback(null,data);           // successful response
  });
}

function putJobSuccess(jobId, callback)
{
  var params = {
      jobId: jobId
  };
  codepipeline.putJobSuccessResult(params, function(err, data) {
      if(err) callback(err,'Unable to mark codepipeline job as successful');
      else callback(null,data);
  });
}


function getDate()
{
  return (new Date().toISOString()).replace(/:/g,'.');
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
