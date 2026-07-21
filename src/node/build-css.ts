import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, resolve } from 'node:path';
import process from 'node:process';

import { generateCSS } from '../codegen/generate-css';
import { resolveConfig } from '../config/resolve-config';
import { loadConfig } from './load-config';

import type { LoadConfigOptions } from './load-config';

export interface GenerateOptions extends LoadConfigOptions {
  /** Overrides the config's `output`; resolved against `cwd` (a flag, not config data). */
  output?: string;
}

export interface GenerateResult {
  css: string;
  /** Absolute output path after precedence: `output` option > config `output` > default. */
  outputPath: string;
  configPath: string;
  dependencies: string[];
}

function resolveAgainst(base: string, path: string): string {
  return isAbsolute(path) ? path : resolve(base, path);
}

/** Shared core of the CLI and the Vite plugin: load → resolve → generate. No writes. */
export async function generateFromConfig(options: GenerateOptions = {}): Promise<GenerateResult> {
  const { config, configPath, dependencies } = await loadConfig(options);
  const resolved = resolveConfig(config);
  const css = generateCSS(resolved);

  const cwd = options.cwd ?? process.cwd();
  const outputPath = options.output
    ? resolve(cwd, options.output)
    : resolveAgainst(dirname(configPath), resolved.output);

  return { css, outputPath, configPath, dependencies };
}

export async function buildCSS(options: GenerateOptions = {}): Promise<GenerateResult> {
  const result = await generateFromConfig(options);

  await mkdir(dirname(result.outputPath), { recursive: true });
  await writeFile(result.outputPath, result.css, 'utf8');

  return result;
}
