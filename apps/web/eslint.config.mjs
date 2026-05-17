import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

const asArray = (c) => (Array.isArray(c) ? c : [c]);

const config = [
  ...asArray(nextCoreWebVitals),
  ...asArray(nextTypescript),
  {
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { prefer: 'type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'react/no-unescaped-entities': 'off',
    },
  },
  { ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts'] },
];

export default config;
