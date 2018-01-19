# SABS - Serverless AMI(amazon machine image) build system 
SABS is a collection of tools that unrolls to fully functional AMI building system.
It will trigger a build on a simple commit to git.

### Why build this?
Unfortunately AWS doesn't make it easy to keep images updated. Even if your machines are in autoscaling groups auto imaging patching isn't well handled by default. HashiCorp make packer which can do this, however requires a server/CI tool to drive it and frankly I've found the windows server build to be error prone, fails once for odd reason, works the second time with no change!! 
Additionally you need winrm/ssh access to the build instance #hassles #notcloudlike

This repo will help you get your own AMI building system up without reinventing the wheel, without the need of a build server! Hnce calling it serverless!

This system involves the use of the following aws magic pixie dust:
* dynamodb - to store the ami IDs of all the images
* cloudformation - for deployment of the code pipeline, lambda and for as the OS configuration part of the image build
* code commit - to store all cloudformation files for our various images
* code pipeline - to manage the image build
* lambda functions - to create the AMI image, to cleanup the image build and provide a custom resource handler for cloudformation templates to ask for the current newest image
* step functions - to handle some delayed taskes
* serverless framework to deploy the lambda functions, step and dynamodb tables


### Pre-requisites
1. Somewhat obviously, you need an AWS account
2. Install the serverless framework `npm -g install serverless`
3. Have aws-cli installed with working api keys or profiles https://docs.aws.amazon.com/cli/latest/userguide/installing.html 
4. VPC with at least one subnet that has internet access

### Deployment

1. Deploy the ami-engine lambda functions `cd ami-engine` followed by deployment `serverless deploy` (add --aws-profile YOURprofileNAMEhere) see https://commscentral.net/tech/?post=49 for setting up profiles
2. Create a code-commit repository in your AWS account and upload the contents of the `cloudformation/` folder to it 
3. Deploy code pipeline template located in: `cloudformation/code-pipeline/code-pipeline-template.yml`
4. Run the Code pipeline job
5. Deploy the sample template `cloudformation/sample-linux.yml` using cloudformation. Machine will be spun up using the AMI that was created from step 4

### Creating your own images
TODO: 

### Components
* The following lambda functions deployed via serverless framework
  * ami-engine-createimage - called by cloudpipeline, ensures the build image has shutdown, take the AMI snapshot, put AMi record in dynamodb and drop a cleanup message into SQS
  * ami-engine-cleanup-sqs - runs every few hours, checks if there are any messages in SQS from createimage and will cleanup those builds if the AMI has been created successfully
  * ami-engine-custom-resource-responder - provides a custom resource service for cloudformation that allows a CF template to ask what is the most recent AMI is. 
* Cloudformation used in several ways
  1. To deploy the code-pipeline used to orchestrate the build
  2. To build the image (os configuration etc)
  3. Used with custom resource to launch an instance using the newest AMI (some examples provided)
* Code Commit - to store the cloudformation templates and build configurations. Updates to these templates or build items will trigger a new image build
* Code Pipeline - to handle checking most recent templates from code commit, deploying the image building cloudformation template, monitoring to ensure it builds successfully and triggering the lambda function to take the snapshot
* Dynamodb - aws no sql database to store the ami values vs image names so they can be found by the custom resource lambda function
* SQS - used to handle the async messages from when a snapshot is created to the cleanup function which runs periodically to clean up!
* The serverless framework https://serverless.com/


