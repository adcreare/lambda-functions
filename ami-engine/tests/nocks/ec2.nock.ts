import * as nock from 'nock';

export default function(){

  nock('https://ec2.us-east-1.amazonaws.com/')
  .persist()
  .post('/')
  .reply(200, (uri, requestBody) => {

    console.log(requestBody);

    let response;

    if (requestBody.indexOf('Action=CreateImage') > -1)
    {
      response = `<CreateImageResponse xmlns="http://ec2.amazonaws.com/doc/2016-11-15/">`
                  + `<requestId>59dbff89-35bd-4eac-99ed-be587EXAMPLE</requestId>`
                  + `<imageId>ami-4fa54026</imageId>`
                + `</CreateImageResponse>`;
    }

    if (requestBody.indexOf('Action=DescribeInstances') > -1)
    {
      response = `<DescribeInstancesResponse xmlns="http://ec2.amazonaws.com/doc/2016-11-15/">`
      + `<requestId>8f7724cf-496f-496e-8fe3-example</requestId>`
      + ` <reservationSet>`
        + `<item>`
          + `<instancesSet>`
            + `<item>`
              + `<instanceId>i-06a6b6f36049067e8</instanceId>`
                  + `<instanceState> <code>80</code> <name>stopped</name> </instanceState>`
            + `</item>`
          + `</instancesSet>`
        + `</item>`
      + ` </reservationSet>`
      + `</DescribeInstancesResponse>`;
    }

    if (requestBody.indexOf('Action=DescribeImages') > -1)
    {
      response = `<DescribeImagesResponse xmlns="http://ec2.amazonaws.com/doc/2016-11-15/">`
                  + `<requestId>59dbff89-35bd-4eac-99ed-be587EXAMPLE</requestId> `
                    + `<imagesSet>`
                      + `<item>`
                        + `<imageId>ami-1a2b3c4d</imageId>`
                        + `<imageState>available</imageState>`
                      + `</item>`
                    + `</imagesSet>`
                + `</DescribeImagesResponse>`;
    }

    return response;
  });

}
