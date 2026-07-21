import { existsSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import process from 'node:process';
import { createJiti } from 'jiti';

import type { XStyleUserConfig } from '../config/types';

export const CONFIG_FILE_NAMES = [
  'xstyle.config.ts',
  'xstyle.config.mts',
  'xstyle.config.js',
  'xstyle.config.mjs',
  'xstyle.config.cjs',
] as const;

export interface LoadConfigOptions {
  /** Directory to search from; defaults to `process.cwd()`. */
  cwd?: string;
  /** Explicit config path (absolute or relative to `cwd`); skips discovery. */
  configFile?: string;
}

export interface LoadedConfig {
  config: XStyleUserConfig;
  /** Absolute path of the evaluated config file. */
  configPath: string;
  /** Absolute paths of the local files the config evaluated (itself included) — the watch list. */
  dependencies: string[];
}

export function findConfigFile(cwd: string, configFile?: string): string {
  if (configFile !== undefined) {
    const path = isAbsolute(configFile) ? configFile : resolve(cwd, configFile);

    if (!existsSync(path)) {
      throw new Error(`xstyle config not found at ${path}.`);
    }

    return path;
  }

  for (const name of CONFIG_FILE_NAMES) {
    const path = resolve(cwd, name);

    if (existsSync(path)) {
      return path;
    }
  }

  throw new Error(
    `No xstyle config found in ${cwd}. Tried: ${CONFIG_FILE_NAMES.join(', ')}. ` +
      'Pass one explicitly with --config.',
  );
}

export async function loadConfig(options: LoadConfigOptions = {}): Promise<LoadedConfig> {
  const cwd = options.cwd ?? process.cwd();
  const configPath = findConfigFile(cwd, options.configFile);

  // A fresh jiti instance per load: watch mode never sees a stale module
  // cache, and the instance's cache doubles as the list of files the config
  // evaluated — that becomes the watch list.
  const jiti = createJiti(import.meta.url, { interopDefault: true });

  let config: unknown;

  try {
    config = await jiti.import(configPath, { default: true });
  } catch (error) {
    throw new Error(`Failed to load ${configPath}: ${(error as Error).message}`, { cause: error });
  }

  if (typeof config !== 'object' || config === null) {
    throw new Error(
      `${configPath} must default-export an xstyle config object (see defineConfig).`,
    );
  }

  const dependencies = Object.keys(jiti.cache).filter((path) => !path.includes('node_modules'));

  if (!dependencies.includes(configPath)) {
    dependencies.unshift(configPath);
  }

  return { config: config as XStyleUserConfig, configPath, dependencies };
}
