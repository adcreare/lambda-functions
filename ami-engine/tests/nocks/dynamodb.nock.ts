import * as nock from 'nock';

export default function()
{
  nock('https://dynamodb.us-east-1.amazonaws.com/')
  .persist()
  .post('/')
  .reply(200, (uriRequest, body) => {

    const response = {
      Item: {
        callid: {
          S: 'test-Dynamodb-Call-ID'
        },
        Caller: {
          S: 'test-Dynamodb-Caller'
        },
        CallerCity: {
          S: 'test-Dynamodb-CallerCity'
        },
        CallerCountry: {
          S: 'test-Dynamodb-CallerCountry'
        },
        CallerState: {
          S: 'test-Dynamodb-CallerState'
        },
        CallerZip: {
          S: 'test-Dynamodb-CallerZip'
        }
      }
    };
    return response;
  });

}
