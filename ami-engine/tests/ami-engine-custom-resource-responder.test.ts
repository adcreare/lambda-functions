import * as assert from 'assert';
import * as nock from 'nock';
import {run} from '../src/ami-engine-custom-resource-responder.js';

import customResourceNock from './nocks/customResourceCallback.nock';
import dynamoDBNock from './nocks/dynamodb.nock';
import ec2Nock from './nocks/ec2.nock';



customResourceNock();
dynamoDBNock();
nock.disableNetConnect();

describe('Test responder', () => {


  /*
    NOTE: Some of these tests rely on the customResourceNock to check the http request
     and throw an exception to break the test if they get the wrong data back

     In prod these call backs would actually be hitting the cloudformation API
  */

  it('Test delete response - VERY IMPORTANT FUNCTION', async (done) => {

    const event = {
      ResourceProperties: {
        AMIImageName: 'special-test-ami'
      },
      ResponseURL: 'https://cloudformation.callback.url.delete.local',
      RequestType: 'Delete' };

    run(event, {}, (err, result) => {

      assert.strictEqual(err, null);
      assert.strictEqual(result, 'completed');

      done();

    });

  });

  it('Test without AMIname', async (done) => {

    const event = {
      ResponseURL: 'https://cloudformation.callback.url.amimissing.local',
      RequestType: 'Create' };

    run(event, {}, (err, result) => {

      assert.strictEqual(err, null);
      assert.strictEqual(result, 'completed');

      done();

    });

  });


  it('Test query with full ami', async (done) => {

    const event = {
      ResourceProperties: {
        AMIImageName: 'special-test-ami'
      },
      ResponseURL: 'https://cloudformation.callback.url.getami.local',
      RequestType: 'Create' };

    run(event, {}, (err, result) => {

      assert.strictEqual(err, null);
      assert.strictEqual(result, 'completed');

      done();

    });

  });



}); // end describe
