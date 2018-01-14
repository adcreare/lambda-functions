import * as nock from 'nock';

export default function(){

  nock('https://s3.amazonaws.com/')
  .persist()
  .get(() =>  true) // match all
  .reply(200, (uri) => {

    return '';
  });


}
