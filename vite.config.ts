import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import dts from 'unplugin-dts/vite';

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        cli: resolve(__dirname, 'src/cli.ts'),
        vite: resolve(__dirname, 'src/vite.ts'),
      },
      formats: ['es', 'cjs'],
      fileName: (format, entryName) => `${entryName}.${format === 'es' ? 'js' : 'cjs'}`,
    },
    rollupOptions: {
      external: [/^node:/, 'jiti', 'chokidar', 'vite'],
    },
  },
  plugins: [
    dts({
      tsconfigPath: './tsconfig.build.json',
      bundleTypes: true,
    }),
  ],
  test: {
    environment: 'node',
  },
});
