'use strict';

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

  // Use this code if you don't use the http event with the LAMBDA-PROXY integration
  callback(null, { message: 'Go Serverless v1.0! Your function executed successfully!', event });
};
