import * as nock from 'nock';

export default function()
{
  nock('https://dynamodb.us-east-1.amazonaws.com/')
  .persist()
  .post('/')
  .reply(200, (uriRequest, body) => {

    const response = {}
    return response;
  });

}
