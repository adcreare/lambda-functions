// force the aws api to make api calls
process.env.AWS_REGION = 'us-east-1';
process.env.AWS_ACCESS_KEY_ID = 'noaccesskeyhere';
process.env.AWS_SECRET_ACCESS_KEY = 'nosecretkeyhere';
process.env.dynamodbTableName = 'myTable';
process.env.snapShotDescription = 'my snapshot';

module.exports = function (wallaby) {

  return {
    files: [
      './**/*.ts',
      './src/*.js',
      { pattern: '**/*test.ts', ignore: true },
      { pattern: '**/sample-events/*', ignore: false, instrument: false, ignore: false }
    ],

    tests: [
      './**/*test.ts'
    ],

    env: {
      type: 'node',
      runner: 'node'
    },

    testFramework: 'jest',

    setup: function (wallaby) {
      wallaby.testFramework.configure(require('./package.json').jest);
    }

  };
};