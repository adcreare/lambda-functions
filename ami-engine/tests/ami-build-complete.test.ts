import * as assert from 'assert';
import * as nock from 'nock';
import {run} from '../src/ami-build-complete';
import {StateMachineInput} from '../src/objects/StateMachine';

import cloudFormationNock from './nocks/cloudformation.nock';
import codePipeLineNock from './nocks/codepipeline.nock';
import dynamodbNock from './nocks/dynamodb.nock';
import ec2Nock from './nocks/ec2.nock';
import s3Nock from './nocks/s3.nock';

nock.disableNetConnect();

process.env.dynamodbTableName = 'myTable';

describe('ami-build-complete tests', () => {

  codePipeLineNock();
  dynamodbNock();
  ec2Nock();
  s3Nock();
  cloudFormationNock();

  it('full test run', async (done) => {

    const event: StateMachineInput = {
      ImageId: 'ami-4fa54026',
      AMIBuildComplete: false,
      ImageName: 'linux-ecs-build',
      CodePipelineJobId: '08dcc619-ca93-4ab0-98b1-a468975fa160',

    };

    run(event, {} , (err , result) => {
      console.log(result);

      assert.deepStrictEqual(result,
        { ImageId: 'ami-4fa54026',
          AMIBuildComplete: true,
          ImageName: 'linux-ecs-build',
          CodePipelineJobId: '08dcc619-ca93-4ab0-98b1-a468975fa160' });

      done();
    });

  }); // end IT


}); // end describe
