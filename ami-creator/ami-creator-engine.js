'use strict';
const waterfall = require('async/waterfall');
const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const zlib = require('zlib');

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
  else performOperations(keyData,callback);


}; //end handlerequest


function performOperations(inputObject,callback)
{
  waterfall(
    [
      getFileFromS3(inputObject.bucketname,inputObject.objectkey),
      extractFile,

      testImDoneFunction
  ],
  function (err, message) {
    console.log('Error received - error object: '+JSON.stringify(err)+' - message: '+message);
    // Node.js and JavaScript Rock!
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
  zlib.gunzip(buffer,extractFileCallBack);
}

function processCFStackResponse(test)
{
  return test;
}

// //Callback for file extraction
// function extractFileCallBack(error,result)
// {
//   if (error){
//       global.lambdaCallback(error,'unable to extract file!') //exit function
//   }
//   else
//   {
//       loadIntoES(JSON.parse(result.toString())); //now load the data into ES
//   }
// }


/*

 */
function validateInputAndProvideKeyData(event)
{
  // console.log(JSON.stringify(event));
  //check we have an S3 location

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
