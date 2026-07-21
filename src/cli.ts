import console from 'node:console';
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, relative } from 'node:path';
import process from 'node:process';
import { parseArgs } from 'node:util';
import { watch as createWatcher } from 'chokidar';

import { buildCSS, generateFromConfig } from './node/build-css';

import type { GenerateOptions } from './node/build-css';

const USAGE = `Usage: xstyle <command> [options]

Commands:
  build   Generate the CSS file from the xstyle config
  watch   Rebuild whenever the config or its local imports change

Options:
  -c, --config <path>   Config file (default: discover xstyle.config.{ts,mts,js,mjs,cjs})
  -o, --output <path>   Output CSS file (default: config \`output\` or ./xstyle.generated.css)
  -h, --help            Show this help`;

// All logs go to stderr: stdout stays clean for piping.
function log(message: string): void {
  console.error(`[xstyle] ${message}`);
}

async function runBuild(options: GenerateOptions): Promise<number> {
  try {
    const { outputPath } = await buildCSS(options);

    log(`wrote ${relative(options.cwd ?? process.cwd(), outputPath)}`);

    return 0;
  } catch (error) {
    log((error as Error).message);

    return 1;
  }
}

async function runWatch(options: GenerateOptions): Promise<number> {
  const cwd = options.cwd ?? process.cwd();
  const watcher = createWatcher([], { ignoreInitial: true });
  let watched = new Set<string>();
  let lastCss: string | null = null;

  // Chokidar fires event bursts; serialize rebuilds so writes never interleave.
  // An event arriving mid-build queues exactly one follow-up run.
  let building = false;
  let dirty = false;

  const rebuild = async (): Promise<void> => {
    if (building) {
      dirty = true;

      return;
    }
    building = true;

    try {
      const { css, outputPath, dependencies } = await generateFromConfig(options);

      const next = new Set(dependencies);

      watcher.add([...next].filter((path) => !watched.has(path)));
      watcher.unwatch([...watched].filter((path) => !next.has(path)));
      watched = next;

      // Only write when the CSS actually changed — no pointless HMR churn.
      if (css !== lastCss) {
        await mkdir(dirname(outputPath), { recursive: true });
        await writeFile(outputPath, css, 'utf8');
        lastCss = css;
        log(`wrote ${relative(cwd, outputPath)}`);
      }
    } catch (error) {
      // A broken config must not clobber the previous CSS; keep watching.
      log((error as Error).message);
    } finally {
      building = false;

      if (dirty) {
        dirty = false;
        await rebuild();
      }
    }
  };

  await rebuild();
  watcher.on('all', () => {
    rebuild().catch(() => undefined);
  });
  log('watching for changes…');

  // Runs until the process is killed.
  return new Promise<number>(() => {});
}

export async function runCli(argv: string[], options: { cwd?: string } = {}): Promise<number> {
  let values: { config?: string; output?: string; help?: boolean };
  let positionals: string[];

  try {
    ({ values, positionals } = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        config: { type: 'string', short: 'c' },
        output: { type: 'string', short: 'o' },
        help: { type: 'boolean', short: 'h' },
      },
    }));
  } catch (error) {
    log((error as Error).message);
    console.error(USAGE);

    return 1;
  }

  const command = positionals.at(0);

  if (values.help || command === undefined) {
    console.error(USAGE);

    return values.help ? 0 : 1;
  }

  const generateOptions: GenerateOptions = {
    cwd: options.cwd,
    configFile: values.config,
    output: values.output,
  };

  switch (command) {
    case 'build':
      return runBuild(generateOptions);
    case 'watch':
      return runWatch(generateOptions);
    default:
      log(`Unknown command "${command}".`);
      console.error(USAGE);

      return 1;
  }
}
