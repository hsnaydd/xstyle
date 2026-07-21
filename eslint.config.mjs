import config from '@atolye15/eslint-config';
import { defineConfig } from 'eslint/config';

export default defineConfig([
  config.base,
  config.vitest,
  {
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json'],
      },
    },
  },
]);
