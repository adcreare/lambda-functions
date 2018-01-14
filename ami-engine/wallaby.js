  module.exports = function () {
    return {
      files: [
        'ami-engine-*.js',
        { pattern: 'sample-events/*', instrument: false, load: false, ignore: false }
      ],
  
      tests: [
        'tests/*.js'
      ],
  
      env: {
        type: 'node'
      }
    };
  };
  