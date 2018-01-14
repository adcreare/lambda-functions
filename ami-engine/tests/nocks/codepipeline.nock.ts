import * as nock from 'nock';

export default function()
{
  nock('https://codepipeline.us-east-1.amazonaws.com/')
  .persist()
  .post('/')
  .reply(200, (uriRequest, body) => {
    console.log(uriRequest);
    console.log(body);

    return {};
  });

}

