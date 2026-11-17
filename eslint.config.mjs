import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['out', 'dist', 'coverage', 'node_modules', 'design', 'build'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: { globals: { process: 'readonly', console: 'readonly' } }
  },
  {
    files: ['src/renderer/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs['recommended-latest'].rules
  },
  {
    // src/core is the pure domain layer: no Electron, no React, no Node built-ins.
    files: ['src/core/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['electron', 'electron/*', 'react', 'react-dom', 'react/*', 'node:*', 'fs', 'path', 'os', 'child_process'],
              message: 'src/core stays pure TypeScript. Put Electron, React and Node code in main, preload or renderer.'
            }
          ]
        }
      ]
    }
  }
)
