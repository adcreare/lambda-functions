import { Callback, Handler } from 'aws-lambda';
import CloudFormation = require('aws-sdk/clients/cloudformation');
import CodePipeline = require('aws-sdk/clients/codepipeline');
import Dynamodb = require('aws-sdk/clients/dynamodb');
import EC2 = require ('aws-sdk/clients/ec2');
import S3 = require('aws-sdk/clients/s3');

import {StateMachineInput} from './objects/StateMachine';

const cloudformation = new CloudFormation();
const codepipeline = new CodePipeline();
const dynamodb = new Dynamodb();
const ec2 = new EC2();

const tableName = process.env.dynamodbTableName;

export const run: Handler = async (event: StateMachineInput, context: any, cb: Callback) => {

  try{
    if (amiComplete(event.ImageId))
    {
      await putAmiINDynamoDb(tableName, event);
      await cloudformation.deleteStack({StackName: event.ImageName}).promise();
      event.AMIBuildComplete = true;
    }

  }
  catch (e)
  {
    console.log('exception thrown');
    console.log(e);
  }


  cb(null, event);

};


async function amiComplete(amiId: string)
{
  const params = {
    ImageIds: [ amiId ]
  };
  const amiStatus = await ec2.describeImages(params).promise();
  if (amiStatus.Images.length !== 1)
  {
    return false;
  }

  const image = amiStatus.Images[0];
  if (image.State === 'available')
  {
    return true;
  }

  return false;

}


async function putAmiINDynamoDb(dbTableName: string, amiInfo: StateMachineInput)
{

  const params = {
    TableName: dbTableName,
    Item: {
      amiid: {
       S: amiInfo.ImageId
      },
      imagename: {
       S: amiInfo.ImageName
      },
      timestamp: {
       S: getTimeStamp().toString()
      }
    }
  };

  console.log(params);
  await dynamodb.putItem(params).promise();
  return;
}


function getTimeStamp()
{
  return (new Date().getTime());
}
