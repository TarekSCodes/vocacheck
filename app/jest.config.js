/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testPathIgnorePatterns: [
    '/node_modules/',
    '/public/__tests__/',
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/public/',
    '/__tests__/',
  ],
  coverageThreshold: {
    global: {
      statements: 80,
    },
  },
};
