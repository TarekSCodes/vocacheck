/** @type {import('jest').Config} */
module.exports = {
  displayName: 'frontend',
  testEnvironment: 'jest-environment-jsdom',
  setupFiles: ['./jest.setup.frontend.js'],
  testMatch: ['**/public/__tests__/**/*.test.js'],
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  coverageThreshold: {
    global: { statements: 80 },
  },
};
