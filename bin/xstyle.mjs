#!/usr/bin/env node
import('../dist/cli.js')
  .then(({ runCli }) => runCli(process.argv.slice(2)))
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    console.error(`[xstyle] ${error instanceof Error ? error.message : error}`);
    process.exitCode = 1;
  });
