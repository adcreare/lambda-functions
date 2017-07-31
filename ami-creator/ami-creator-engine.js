'use strict';
const waterfall = require('async/waterfall');
const AWS = require('aws-sdk');
const AdmZip = require('adm-zip');
const s3 = new AWS.S3();
const ec2 = new AWS.EC2();

const snapShotDescription = 'snap taken by ami-creator-engine';
const snapShotName = 'mytestsnapshot'

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
  waterfall(
    [
      getFileFromS3(inputObject.bucketname,inputObject.objectkey),
      extractFile,
      processCFStackResponse,
      createAMIMachineImage(snapShotName,snapShotDescription)

  ],
  function (err, message) {
    console.log('Error received - error object: '+JSON.stringify(err)+' - message: '+message);
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
      if(err) getfileCallback(err);
      else getfileCallback(null,data);
    });
}

//Function to extract a zip file
function extractFile(buffer,extractFileCallBack)
{
  var zip = new AdmZip(buffer);
  var zipEntries = zip.getEntries();

  if (zipEntries.length != 1) throw new Error('Zip file appears to have multiple files instead of the expected 1');

  extractFileCallBack(zip.readAsText(zipEntries[0]));
}

function processCFStackResponse(dataContainedInFile)
{
  return JSON.parse(dataContainedInFile);
}

function createAMIMachineImage(instanceId,snapshotName,snapShotDescription, callback)
{
  const params = {
    InstanceId: 'STRING_VALUE', /* required */
    Name: 'STRING_VALUE', /* required */
    Description: 'STRING_VALUE',
  };
  ec2.createImage(params, function(err, data) {
    if (err) callback(err); // an error occurred
    else callback(null,data);           // successful response
  });
}

/*

 */
function validateInputAndProvideKeyData(event)
{

  let bucketName, objectKey;

  try{
    bucketName = event["CodePipeline.job"].data.inputArtifacts[0].location.s3Location.bucketName;
    objectKey = event["CodePipeline.job"].data.inputArtifacts[0].location.s3Location.objectKey;
  }
  catch(err)
  {
    return false;
  }
  return {'bucketname':bucketName,'objectkey':objectKey};
}
