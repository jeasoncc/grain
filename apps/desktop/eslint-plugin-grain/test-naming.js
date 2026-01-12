const { Linter } = require('eslint');
const plugin = require('./dist/index.js').default;

const linter = new Linter({ configType: 'flat' });

const config = {
  plugins: {
    grain: plugin,
  },
  languageOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    parser: require('@typescript-eslint/parser'),
  },
  rules: {
    'grain/file-naming': 'error',
  },
};

const code = 'const x = 1;';
const errors = linter.verify(code, config, { filename: '/src/pipes/a.ts' });

console.log('Errors:', errors);
console.log('Plugin rules:', Object.keys(plugin.rules));
