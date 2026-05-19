module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
            jsx: true,
        },
    },
    settings: {
        react: {
            version: 'detect',
        },
    },
    env: {
        browser: true,
        es2021: true,
        node: true,
    },
    plugins: ['react', '@typescript-eslint', 'react-hooks'],
    extends: [
        'eslint:recommended',
        'plugin:react/recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:react-hooks/recommended',
        'prettier', // nếu bạn có dùng prettier
    ],
    rules: {
        // ⚡ tuỳ chỉnh rule cho phù hợp
        'no-unused-vars': 'off', // tắt rule mặc định
        '@typescript-eslint/no-unused-vars': [
            'warn',
            { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
        ],
        'react/react-in-jsx-scope': 'off', // với React 17+ không cần import React
        'react/prop-types': 'off', // vì dùng TypeScript nên tắt
    },
};
