import { defineConfig } from '../../../src';
import { theme } from './theme';

export default defineConfig({
  theme,
  classNames: 'readable',
  rules: {
    display: { property: 'display', responsive: true, values: ['flex', 'block'] },
    padding: { property: 'padding', values: [['4', '0.25rem']] },
  },
});
