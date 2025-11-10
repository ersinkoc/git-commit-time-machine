module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],
  collectCoverageFrom: [
    'src/**/*.js',
    'bin/**/*.js',
    '!src/**/*.test.js',
    '!test/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: [],
  testTimeout: 10000,
  verbose: true,
  testPathIgnorePatterns: [
    '/node_modules/'
  ]
};