/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'jsdom',
    roots: ['<rootDir>/tests'],
    testPathIgnorePatterns: ['<rootDir>/tests/e2e'],
    moduleNameMapper: {
        // Mock CSS/Static assets if imported in TS files
        '\\.(css|less)$': '<rootDir>/tests/__mocks__/styleMock.js',
    },
    transform: {
        '^.+\\.tsx?$': ['ts-jest', {
            tsconfig: {
                module: 'commonjs',
            },
        }],
    },
};
