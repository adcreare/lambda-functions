import * as nock from 'nock';

export default function()
{
  nock('https://cloudformation.us-east-1.amazonaws.com/')
  .persist()
  .post(() => true)
  .reply(200, (uriRequest, body) => {

    console.log(uriRequest);
    console.log(body);

    return;
  });

}


