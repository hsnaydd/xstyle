import type { Plugin, ViteDevServer } from 'vite';
import { generateFromConfig } from './node/build-css';

import type { GenerateOptions } from './node/build-css';

export type XStyleVitePluginOptions = Pick<GenerateOptions, 'cwd' | 'configFile'>;

const VIRTUAL_ID = 'virtual:xstyle.css';
// Rooted pseudo-path ending in `.css`: Vite's own CSS pipeline picks the
// module up — postcss, extraction, HMR all come for free.
const RESOLVED_ID = '/__xstyle.css';

export default function xstyle(options: XStyleVitePluginOptions = {}): Plugin {
  let css: string | null = null;
  let dependencies: string[] = [];
  let loadError: Error | null = null;
  let server: ViteDevServer | undefined;

  async function regenerate(): Promise<void> {
    try {
      const result = await generateFromConfig(options);

      css = result.css;
      dependencies = result.dependencies;
      loadError = null;
    } catch (error) {
      loadError = error as Error;
      throw loadError;
    }
  }

  async function handleChange(file: string): Promise<void> {
    if (!server || !dependencies.includes(file)) {
      return;
    }

    try {
      await regenerate();
      server.watcher.add(dependencies);

      const mod = server.moduleGraph.getModuleById(RESOLVED_ID);

      if (mod) {
        server.moduleGraph.invalidateModule(mod);
      }
      // Config changes are rare; a full reload keeps things simple and correct.
      server.ws.send({ type: 'full-reload' });
    } catch (error) {
      // Broken config: show the overlay, keep serving the last valid CSS.
      server.ws.send({
        type: 'error',
        err: { message: (error as Error).message, stack: (error as Error).stack ?? '' },
      });
    }
  }

  return {
    name: 'xstyle',

    async configResolved(config) {
      try {
        await regenerate();
      } catch (error) {
        // In a build the config must be valid; in dev the overlay reports it.
        if (config.command === 'build') {
          throw error;
        }
      }
    },

    resolveId(id) {
      return id === VIRTUAL_ID ? RESOLVED_ID : undefined;
    },

    load(id) {
      if (id !== RESOLVED_ID) {
        return undefined;
      }

      // No valid CSS yet (initial config error): fail the request so the dev
      // overlay points at the config instead of silently serving nothing.
      if (css === null) {
        throw loadError ?? new Error('xstyle: CSS was requested before it was generated.');
      }

      return css;
    },

    configureServer(devServer) {
      server = devServer;
      devServer.watcher.add(dependencies);
      // `all`, not `change`: atomic saves can surface as unlink + add, and a
      // dependency being deleted must regenerate too. `handleChange` ignores
      // files outside the dependency list.
      devServer.watcher.on('all', (_event, file) => {
        handleChange(file).catch(() => undefined);
      });
    },
  };
}
