import * as AdmZip from 'adm-zip';
import { Callback, Handler } from 'aws-lambda';
import CodePipeline = require('aws-sdk/clients/codepipeline');
import EC2 = require ('aws-sdk/clients/ec2');
import S3 = require('aws-sdk/clients/s3');
import StepFunction = require('aws-sdk/clients/stepfunctions');

import {StateMachineInput} from './objects/StateMachine';


const codepipeline = new CodePipeline();
const ec2 = new EC2();
const s3 = new S3();
const stepFunctions = new StepFunction();

const snapShotDescription = process.env.snapShotDescription;
const stateMachineArnStr = process.env.stateMachineArn;

export interface CodePipeLineJob {
  S3Bucket: string;
  S3ObjectKey: string;
  JobId: string;
}

export interface StackOutput {
  InstanceID: string;
  StackName: string;
}

export const run: Handler = async (event: any, context: any, cb: Callback) => {

  const keyData = validateInputAndProvideKeyData(event);
  try {

    if (keyData === undefined) {
      cb(null, { message: 'Incorrect input supplied: ' + JSON.stringify(event) });
      return;
    }

    // get information about the stack cd deployed
    const stackInfo = await getBuildImageStackInformation(keyData);

    const isMachineIsShutdown: boolean = await machineIsShutdown(stackInfo.InstanceID);
    if (!isMachineIsShutdown) {
      cb(new Error(`Error: machine still running? even after waits and retries.`
        + `Please retry lambda if possible and check the instance has stopped`));
      return;
    }

    // take image
    const imageId = await triggerCreateAMI(stackInfo, snapShotDescription);

    // if we don't have the state machine setup - just exit
    if (stateMachineArnStr === undefined)
    {
      await putCodePipelineJobSuccess(keyData.JobId);
    }
    else
    {
      const inputValue: StateMachineInput = {
        ImageId: imageId,
        CodePipelineJobId: keyData.JobId,
        AMIBuildComplete: false,
        ImageName: stackInfo.StackName
      };

      const params = {
        stateMachineArn: stateMachineArnStr, /* required */
        input: JSON.stringify(inputValue)
      };

      await stepFunctions.startExecution(params).promise();
    }

    cb(null, 'completed sucessfully');

  }
  catch (e) {
    console.log(e);
    putJobFailed(keyData.JobId, String(e), context, cb);
  }

};


async function putCodePipelineJobSuccess(cpJobId: string): Promise<any>
{
  await codepipeline.putJobSuccessResult({jobId: cpJobId}).promise();
}

async function triggerCreateAMI(stackInfo: StackOutput, description: string): Promise<string>
{

  const params = {
    InstanceId: stackInfo.InstanceID, /* required */
    Name: `${stackInfo.StackName}-${getDate()}`, /* required */
    Description: description,
  };

  const result = await ec2.createImage(params).promise();
  return result.ImageId;

}

async function machineIsShutdown(instanceId: string): Promise<boolean>
{
  try
  {
    const params = { InstanceIds: [ instanceId ] };

    const ec2Instance = await ec2.describeInstances(params).promise();
    if (ec2Instance.Reservations[0].Instances[0].State.Name === 'stopped')
    {
      return true;
    }
    else
    {
      await sleep(15000);
      return await machineIsShutdown(instanceId);
    }
  }
  catch (e)
  {
    throw(e);
    console.log(e);
    return false;
  }
}


async function getBuildImageStackInformation(cpJob: CodePipeLineJob): Promise<StackOutput>
{
  // get file from S3
  const fileFromS3 = (await s3.getObject({Bucket: cpJob.S3Bucket, Key: cpJob.S3ObjectKey}).promise()).Body;

  // unzip file
  const stackInfo: StackOutput = extractAndParseFile(fileFromS3);
  return stackInfo;
}

function extractAndParseFile(buffer)
{
  const zip = new AdmZip(buffer);
  const zipEntries = zip.getEntries();

  if (zipEntries.length !== 1)
  {
    throw new Error('Zip file appears to have multiple files instead of the expected 1');
  }
  return JSON.parse(zip.readAsText(zipEntries[0]));
}



function validateInputAndProvideKeyData(event: any): CodePipeLineJob
{
  try{
    const returnObject: CodePipeLineJob = {
      S3Bucket: event['CodePipeline.job'].data.inputArtifacts[0].location.s3Location.bucketName,
      S3ObjectKey: event['CodePipeline.job'].data.inputArtifacts[0].location.s3Location.objectKey,
      JobId: event['CodePipeline.job'].id
    };

    return returnObject;
  }
  catch (err)
  {
    return;
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getDate()
{
  return (new Date().toISOString()).replace(/:/g, '.');
}

function putJobFailed(codePipeLineJobId: string,
                      errorMessage: string,
                      lambdaContext,
                      lambdaCallback: Callback)
{
  const params = {
    jobId: codePipeLineJobId,
    failureDetails: {
        message: errorMessage,
        type: 'JobFailed',
        externalExecutionId: lambdaContext.invokeid
    }
  };
  codepipeline.putJobFailureResult(params, (err, data) => {
    if (err)
    {
      console.log('Call to put failed job data: ' + data + ' err:' + err);
    }
    lambdaCallback(null, 'put job failed ' + errorMessage);
  });
}
