import * as assert from 'assert';
import * as fs from 'fs';
import {run} from '../src/create-ami';


describe('Test create-ami', () => {


  it('Test bad input', async (done) => {

    run({} , { identity: 'test' } , (err, result) => {
      console.log(err);
      console.log(result);

      assert.deepStrictEqual(result, {message: 'Incorrect input supplied: {}'});
      assert.strictEqual(err, null);
      done();

    });


  });


  it('Test ', async (done) => {
    const inputEvent = fs.readFileSync('./sample-events/codepipeline-events.json');
    run({} , { identity: 'test' } , (err, result) => {
      console.log(err);
      console.log(result);

      assert.deepStrictEqual(result, {message: 'Incorrect input supplied: {}'});
      assert.strictEqual(err, null);
      done();

    });


  });

});
