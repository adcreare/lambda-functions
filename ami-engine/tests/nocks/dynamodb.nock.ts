import * as nock from 'nock';

export default function()
{
  nock('https://dynamodb.us-east-1.amazonaws.com/')
  .persist()
  .post('/')
  .matchHeader('X-Amz-Target', 'DynamoDB_20120810.PutItem')
  .reply(200, (uriRequest, body) => {

    const response = {};
    return response;
  });

  nock('https://dynamodb.us-east-1.amazonaws.com/')
  .persist()
  .post('/')
  .matchHeader('X-Amz-Target', 'DynamoDB_20120810.Query')
  .reply(200, (uriRequest, body) => {

    const response = {
      Items: [{
        imagename: {
          S: 'special-test-ami'
        },
        amiid: {
          S: 'ami-35260c4e'
        },
        timestamp: {
          S: '1502391826933'
        }
      },
      {
        imagename: {
          S: 'special-test-ami'
        },
        amiid: {
          S: 'ami-35260c4f'
        },
        timestamp: {
          S: '1502391826936'
        }
      }]
    };

    return response;
  });

}
