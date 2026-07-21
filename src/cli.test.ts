import console from 'node:console';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { runCli } from './cli';

const fixturesDir = fileURLToPath(new URL('../test/fixtures', import.meta.url));
const validConfig = resolve(fixturesDir, 'valid/xstyle.config.ts');
const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'xstyle-cli-'));

  tempDirs.push(dir);

  return dir;
}

const MINIMAL_CONFIG = `export default {
  theme: { breakpoints: { sm: '640px' } },
  classNames: 'readable',
  rules: { display: { property: 'display', values: ['flex'] } },
};`;

beforeEach(() => {
  // The CLI logs to stderr; keep the test output clean.
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('runCli build', () => {
  it('writes the generated CSS to the -o path and exits 0', async () => {
    const cwd = await makeTempDir();
    const out = join(cwd, 'out.css');

    const code = await runCli(['build', '-c', validConfig, '-o', out], { cwd });

    expect(code).toBe(0);
    const css = await readFile(out, 'utf8');
    expect(css).toContain('@layer utilities {');
    expect(css).toContain('.xs-display-flex{display:flex}');
    expect(css).toContain('@media (min-width:640px){');
    expect(css).toContain('.xs-padding-4{padding:0.25rem}');
    // the fixture defines no `presets`, so the default preset is auto-injected
    // end-to-end through jiti → resolveConfig → codegen
    expect(css).toContain('.xs-margin-auto{margin:auto}');
  });

  it('builds a zero-config fixture from the built-in defaultTheme', async () => {
    const cwd = await makeTempDir();
    const out = join(cwd, 'out.css');

    const code = await runCli(
      ['build', '-c', resolve(fixturesDir, 'zero-config/xstyle.config.ts'), '-o', out],
      { cwd },
    );

    expect(code).toBe(0);
    const css = await readFile(out, 'utf8');
    expect(css).toContain('.xs-color-gray-500{color:#737373}');
    expect(css).toContain('.xs-padding-16{padding:1rem}');
    expect(css).toContain('@media (min-width:640px){');
    expect(css).toContain('@media (min-width:1536px){');
  });

  it('defaults the output next to the config file', async () => {
    const cwd = await makeTempDir();

    await writeFile(join(cwd, 'xstyle.config.ts'), MINIMAL_CONFIG);
    const code = await runCli(['build'], { cwd });

    expect(code).toBe(0);
    expect(existsSync(join(cwd, 'xstyle.generated.css'))).toBe(true);
  });

  it("resolves the config's `output` relative to the config file", async () => {
    const configDir = await makeTempDir();
    const otherCwd = await makeTempDir();

    await writeFile(
      join(configDir, 'xstyle.config.ts'),
      MINIMAL_CONFIG.replace('};', "  output: './generated/out.css',\n};"),
    );

    const code = await runCli(['build', '-c', join(configDir, 'xstyle.config.ts')], {
      cwd: otherCwd,
    });

    expect(code).toBe(0);
    expect(existsSync(join(configDir, 'generated/out.css'))).toBe(true);
  });

  it('lets -o take precedence over the config `output`', async () => {
    const cwd = await makeTempDir();

    await writeFile(
      join(cwd, 'xstyle.config.ts'),
      MINIMAL_CONFIG.replace('};', "  output: './from-config.css',\n};"),
    );

    const code = await runCli(['build', '-o', 'from-flag.css'], { cwd });

    expect(code).toBe(0);
    expect(existsSync(join(cwd, 'from-flag.css'))).toBe(true);
    expect(existsSync(join(cwd, 'from-config.css'))).toBe(false);
  });

  it('exits 1 when no config can be found', async () => {
    const cwd = await makeTempDir();

    expect(await runCli(['build'], { cwd })).toBe(1);
  });

  it('exits 1 when the config fails to evaluate, without writing anything', async () => {
    const cwd = await makeTempDir();
    const out = join(cwd, 'out.css');

    const code = await runCli(
      ['build', '-c', resolve(fixturesDir, 'broken/xstyle.config.ts'), '-o', out],
      { cwd },
    );

    expect(code).toBe(1);
    expect(existsSync(out)).toBe(false);
  });
});

describe('runCli argument handling', () => {
  it('prints usage and exits 0 for --help', async () => {
    expect(await runCli(['--help'])).toBe(0);
  });

  it('exits 1 without a command', async () => {
    expect(await runCli([])).toBe(1);
  });

  it('exits 1 for an unknown command', async () => {
    expect(await runCli(['deploy'])).toBe(1);
  });

  it('exits 1 for an unknown flag', async () => {
    expect(await runCli(['build', '--nope'])).toBe(1);
  });
});
