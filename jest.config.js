module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  moduleNameMapper: {
    '^cf-url-rewriter/(.*)$': '<rootDir>/resources/cf-url-rewriter/$1',
    '^cf-url-rewriter$': '<rootDir>/resources/cf-url-rewriter/cf-url-rewriter'
  }
};
