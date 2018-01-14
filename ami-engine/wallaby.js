// force the aws api to make api calls
process.env.AWS_REGION = 'us-east-1';
process.env.AWS_ACCESS_KEY_ID = 'noaccesskeyhere';
process.env.AWS_SECRET_ACCESS_KEY = 'nosecretkeyhere';

module.exports = function (wallaby) {

  return {
    files: [
      './**/*.ts',
      { pattern: '**/*test.ts', ignore: true },
      { pattern: '/tests/sample-events/*', ignore: true}
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