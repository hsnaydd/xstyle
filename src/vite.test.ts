import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { afterAll, describe, expect, it } from 'vitest';
import type { Rollup } from 'vite';
import xstyle from './vite';

type RollupOutput = Rollup.RollupOutput;

const fixturesDir = fileURLToPath(new URL('../test/fixtures', import.meta.url));
const tempDirs: string[] = [];

afterAll(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
});

async function buildFixtureProject(): Promise<RollupOutput> {
  const root = await mkdtemp(join(tmpdir(), 'xstyle-vite-'));

  tempDirs.push(root);
  await writeFile(join(root, 'entry.js'), "import 'virtual:xstyle.css';\n");

  const result = await build({
    root,
    logLevel: 'silent',
    plugins: [xstyle({ cwd: resolve(fixturesDir, 'valid') })],
    build: {
      write: false,
      rollupOptions: { input: join(root, 'entry.js') },
    },
  });

  return result as RollupOutput;
}

describe('xstyle vite plugin', () => {
  it('emits the generated CSS as an asset via virtual:xstyle.css', async () => {
    const { output } = await buildFixtureProject();

    const cssAsset = output.find((item) => item.type === 'asset' && item.fileName.endsWith('.css'));

    expect(cssAsset).toBeDefined();
    const source = String((cssAsset as { source: string | Uint8Array }).source);
    expect(source).toContain('.xs-display-flex{display:flex}');
    // Vite's CSS minifier may rewrite `min-width: 640px` to `width >= 640px`.
    expect(source).toMatch(/@media \((?:min-width:\s*640px|width\s*>=\s*640px)\)/);
    expect(source).toContain('@layer utilities');
    expect(source).toContain('.xs-display-flex\\@sm{display:flex}');
  });

  it('fails the build when the config is broken', async () => {
    const root = await mkdtemp(join(tmpdir(), 'xstyle-vite-'));

    tempDirs.push(root);
    await writeFile(join(root, 'entry.js'), "import 'virtual:xstyle.css';\n");

    await expect(
      build({
        root,
        logLevel: 'silent',
        plugins: [xstyle({ cwd: resolve(fixturesDir, 'broken') })],
        build: { write: false, rollupOptions: { input: join(root, 'entry.js') } },
      }),
    ).rejects.toThrow(/boom from broken config/);
  });
});
