module.exports = {
    testEnvironment: 'node',
    testMatch: [
        '**/tests/**/*.test.js'
    ],
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/test/**',
        '!**/node_modules/**'
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    setupFilesAfterEnv: ['<rootDir>/setup.js'],
    testTimeout: 30000,
    maxWorkers: 1, // Prevent worker process issues
    forceExit: true, // Force exit to prevent hanging
    detectOpenHandles: false, // Disable to prevent circular reference issues
    projects: [
        {
            displayName: 'node',
            testEnvironment: 'node',
            testMatch: [
                '**/tests/api/**/*.test.js',
                '**/tests/database/**/*.test.js',
                '**/tests/ml/**/*.test.js',
                '**/tests/security/**/*.test.js',
                '**/tests/integration/**/*.test.js'
            ],
            maxWorkers: 1
        },
        {
            displayName: 'jsdom',
            testEnvironment: 'jsdom',
            testMatch: [
                '**/tests/utils/**/*.test.js',
                '**/tests/mobile/**/*.test.js',
                '**/tests/chat/**/*.test.js'
            ],
            setupFilesAfterEnv: ['<rootDir>/setup.js'],
            maxWorkers: 1
        }
    ]
};
