import * as nock from 'nock';

export default function()
{
  nock('https://cloudformation.callback.url.delete.local/')
  .persist()
  .put('/')
  .reply((uri, requestBody) => {

    if (JSON.parse(requestBody).Status === 'SUCCESS') {
      return [
        200,
        'THIS IS THE REPLY BODY'
        // {'header': 'value'} // optional headers
      ];
    }

    throw new Error('bad input to nock custom Resource: delete');

  });

  nock('https://cloudformation.callback.url.amimissing.local/')
  .persist()
  .put('/')
  .reply((uri, requestBody) => {

    if (JSON.parse(requestBody).Status === 'FAILED') {
      return [
        200,
        'THIS IS THE REPLY BODY'
        // {'header': 'value'} // optional headers
      ];
    }

    throw new Error('bad input to nock custom Resource: ami-missing');

  });

  nock('https://cloudformation.callback.url.getami.local/')
  .persist()
  .put('/')
  .reply((uri, requestBody) => {

    // console.log(requestBody);
    if (JSON.parse(requestBody).Status === 'SUCCESS' &&
        JSON.parse(requestBody).Data.Id === 'ami-35260c4f' // must be the newest in the list
        ) {
      return [
        200,
        'THIS IS THE REPLY BODY'
        // {'header': 'value'} // optional headers
      ];
    }

    throw new Error('bad input to nock custom Resource: ami-missing');

  });


}

