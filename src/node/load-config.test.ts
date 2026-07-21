import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import { loadConfig } from './load-config';

const fixturesDir = fileURLToPath(new URL('../../test/fixtures', import.meta.url));
const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'xstyle-test-'));

  tempDirs.push(dir);

  return dir;
}

afterAll(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('loadConfig', () => {
  it('discovers and evaluates a TS config, listing its local dependencies', async () => {
    const cwd = resolve(fixturesDir, 'valid');
    const { config, configPath, dependencies } = await loadConfig({ cwd });

    expect(configPath).toBe(resolve(cwd, 'xstyle.config.ts'));
    expect(config.classNames).toBe('readable');
    expect(config.theme?.breakpoints).toEqual({ sm: '640px', md: '768px' });

    // The watch list: the config itself plus the sibling module it imported.
    expect(dependencies).toContain(resolve(cwd, 'xstyle.config.ts'));
    expect(dependencies).toContain(resolve(cwd, 'theme.ts'));
    expect(dependencies.every((path) => !path.includes('node_modules'))).toBe(true);
  });

  it('accepts a config without a theme (zero-config)', async () => {
    const cwd = resolve(fixturesDir, 'zero-config');
    const { config } = await loadConfig({ cwd });

    expect(config.theme).toBeUndefined();
    expect(config.classNames).toBe('readable');
  });

  it('accepts an explicit config path relative to cwd', async () => {
    const { configPath } = await loadConfig({
      cwd: fixturesDir,
      configFile: 'valid/xstyle.config.ts',
    });

    expect(configPath).toBe(resolve(fixturesDir, 'valid/xstyle.config.ts'));
  });

  it('rejects when no config exists, listing the tried file names', async () => {
    const cwd = await makeTempDir();

    await expect(loadConfig({ cwd })).rejects.toThrow(/No xstyle config found/);
    await expect(loadConfig({ cwd })).rejects.toThrow(/xstyle\.config\.ts/);
  });

  it('rejects when the explicit config path does not exist', async () => {
    await expect(
      loadConfig({ cwd: fixturesDir, configFile: 'nope/xstyle.config.ts' }),
    ).rejects.toThrow(/not found at/);
  });

  it('prefixes evaluation errors with the config path', async () => {
    const cwd = resolve(fixturesDir, 'broken');

    await expect(loadConfig({ cwd })).rejects.toThrow(/Failed to load .*xstyle\.config\.ts/);
    await expect(loadConfig({ cwd })).rejects.toThrow(/boom from broken config/);
  });
});
