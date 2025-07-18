module.exports = {
  env: {
    node: true,
    es2021: true,
    jest: true
  },
  extends: [
    'eslint:recommended',
    'airbnb-base',
    'prettier'
  ],
  plugins: [
    'prettier'
  ],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module'
  },
  rules: {
    // Prettier integration
    'prettier/prettier': 'error',
    
    // Custom rules for Node.js/Express
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'consistent-return': 'off',
    'func-names': 'off',
    'object-shorthand': 'error',
    'no-process-exit': 'off',
    'no-param-reassign': ['error', { props: false }],
    'no-return-await': 'off',
    'class-methods-use-this': 'off',
    
    // Import rules
    'import/prefer-default-export': 'off',
    'import/no-dynamic-require': 'off',
    'import/no-extraneous-dependencies': [
      'error',
      {
        devDependencies: [
          '**/*.test.js',
          '**/*.spec.js',
          '**/tests/**/*',
          '**/scripts/**/*'
        ]
      }
    ],
    
    // Security rules
    'security/detect-object-injection': 'off'
  },
  overrides: [
    {
      files: ['**/*.test.js', '**/*.spec.js'],
      env: {
        jest: true
      },
      rules: {
        'no-unused-expressions': 'off'
      }
    }
  ]
};
