import * as fs from 'fs';
import * as nock from 'nock';
import * as path from 'path';

export default function(){

  nock('https://codepipeline-us-east-1-000000000000.s3.amazonaws.com/')
  .persist()
  .get(() =>  true) // match all
  .reply(200, (uri, requestBody) => {

    console.log(uri);
    console.log(requestBody);

    const response = fs.readFileSync(path.resolve(__dirname, '../sample-events/stackoutput.zip'));
    return response;
  });

  // nock('https://\/[a-z0-9][a-z0-9-.]*\.s3.amazonaws.com/')
  // .persist()
  // .get('MyTestStack/MyStackOut/BG7789K')
  // .reply(200, (uriRequest, body) => {
  //   console.log(uriRequest);
  //   return '';
  // });



}
