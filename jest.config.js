module.exports = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/src/test/setupTests.js"],
  testMatch: ["**/*.test.js"],
  transform: {
    "\\.[jt]sx?$": "babel-jest",
  },
  moduleNameMapper: {
    "\\.css$": "<rootDir>/src/test/styleMock.js",
  },
  modulePathIgnorePatterns: ["<rootDir>/dist/"],
};
