import config from '@hsnaydd/eslint-config';
import { defineConfig } from 'eslint/config';

export default defineConfig([
  config.base,
  config.vitest,
  {
    files: ['**/*.ts?(x)'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
]);
