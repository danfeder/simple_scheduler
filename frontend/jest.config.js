module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/components/ui/button$': '<rootDir>/app/components/__mocks__/ui/button.tsx',
    '^@/components/ui/card$': '<rootDir>/app/components/__mocks__/ui/card.tsx',
    '^@/components/ui/input$': '<rootDir>/app/components/__mocks__/ui/input.tsx',
    '^@/components/ui/label$': '<rootDir>/app/components/__mocks__/ui/label.tsx',
    '^@/components/ui/switch$': '<rootDir>/app/components/__mocks__/ui/switch.tsx',
    '^@/components/ui/use-toast$': '<rootDir>/app/components/__mocks__/ui/use-toast.ts',
    '^@/lib/api$': '<rootDir>/app/lib/__mocks__/api.ts',
    '^@/lib/(.*)$': '<rootDir>/app/lib/$1',
    '\\.css$': 'identity-obj-proxy',
    '^shared/(.*)$': '<rootDir>/../shared/$1'
  },
  testMatch: ['**/__tests__/**/*.test.tsx', '**/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.test.json'
    }]
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
}; 