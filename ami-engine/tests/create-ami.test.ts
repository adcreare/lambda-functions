import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import {run} from '../src/create-ami';
import codePipeLineNock from './nocks/codepipeline.nock';
import ec2Nock from './nocks/ec2.nock';
import s3Nock from './nocks/s3.nock';



describe('Test create-ami', () => {

  codePipeLineNock();
  ec2Nock();
  s3Nock();

  it('Test bad input', async (done) => {

    run({} , { identity: 'test' } , (err, result) => {
      console.log(err);
      console.log(result);

      assert.deepStrictEqual(result, {message: 'Incorrect input supplied: {}'});
      assert.strictEqual(err, null);
      done();

    });


  });


  it('Test run with correct input ', async (done) => {
    const inputFile = fs.readFileSync(path.resolve(__dirname, 'sample-events/codepipeline-events.json'));
    const input = inputFile.toString();

    run(JSON.parse(input) , { identity: 'test' } , (err, result) => {
      console.log(err);
      console.log(result);

      assert.deepStrictEqual(result, 'completed sucessfully');
      assert.strictEqual(err, null);
      done();

    });


  });

});
