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

  // The config path doubles as the parent URL; `import.meta.url` would become
  // `undefined` in the CJS build.
  const jiti = createJiti(configPath, { interopDefault: true });

  // `jiti.cache` is Node's process-wide `require.cache`, shared by every jiti
  // instance. The modules this load adds to it are the files the config
  // evaluated, which becomes the watch list. The local ones are evicted
  // afterwards so the next load (watch mode) evaluates them again.
  const cachedBefore = new Set(Object.keys(jiti.cache));
  let dependencies: string[];
  let config: unknown;

  try {
    config = await jiti.import(configPath, { default: true });
  } catch (error) {
    throw new Error(`Failed to load ${configPath}: ${(error as Error).message}`, { cause: error });
  } finally {
    dependencies = Object.keys(jiti.cache).filter(
      (path) => !cachedBefore.has(path) && !path.includes('node_modules'),
    );

    for (const path of dependencies) {
      delete jiti.cache[path];
    }
  }

  if (typeof config !== 'object' || config === null) {
    throw new Error(
      `${configPath} must default-export an xstyle config object (see defineConfig).`,
    );
  }

  if (!dependencies.includes(configPath)) {
    dependencies.unshift(configPath);
  }

  return { config: config as XStyleUserConfig, configPath, dependencies };
}
