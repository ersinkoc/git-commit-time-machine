module.exports = {
  env: {
    browser: false,
    es2021: true,
    node: true,
    jest: true
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'commonjs'
  },
  rules: {
    'indent': ['warn', 2],
    'linebreak-style': 'off',
    'quotes': ['warn', 'single'],
    'semi': ['warn', 'always'],
    'no-unused-vars': 'off',
    'no-console': 'off',
    'no-undef': 'off',
    'no-empty': 'off',
    'no-constant-condition': 'off',
    'no-fallthrough': 'off',
    'no-unreachable': 'off',
    'no-prototype-builtins': 'off'
  },
  overrides: [
    {
      files: ['test/**/*.js'],
      env: {
        jest: true
      }
    }
  ],
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    '.gctm-*/',
    '*.min.js'
  ]
};