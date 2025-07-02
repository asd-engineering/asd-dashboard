module.exports = {
  root: true,
  plugins: ['jsdoc'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    'jsdoc/require-jsdoc': ['error', {
      require: {
        FunctionDeclaration: true,
        MethodDefinition: true,
        ClassDeclaration: true,
        ArrowFunctionExpression: false,
        FunctionExpression: false
      }
    }],
    'jsdoc/require-param': 'warn',
    'jsdoc/require-returns': 'warn',
    'jsdoc/require-description': ['warn', {
      contexts: [
        'FunctionDeclaration',
        'MethodDefinition',
        'ClassDeclaration'
      ]
    }]
  }
}
