module.exports = {
  testEnvironment: 'node',
  coveragePathIgnorePatterns: ['/node_modules/'],
  testMatch: ['**/__tests__/**/*.test.js'],
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.js'],
  // Charger les variables d'environnement de test
  setupFiles: ['dotenv/config'],
  testEnvironmentOptions: {
    env: {
      NODE_ENV: 'test'
    }
  }
}; 