import { resolveConfig } from '../config/resolve-config';
import { makeClassName, makeKey } from '../shared/class-name';
import hyphenateStyleName from './hyphenate-style-name';

import type { XStyleUserConfig } from '../config/types';
import type { XStyleDeclarationFor } from '../infer/declaration';

// This file must stay isomorphic — it ships to the browser, and the tsconfig
// deliberately loads no DOM/Node globals. `process` may not exist at all
// (guarded below); `console` exists in every runtime we target.
declare const process: { env?: { NODE_ENV?: string } } | undefined;
declare const console: { warn: (message: string) => void };

export interface XStyle<C extends XStyleUserConfig> {
  css: (arg: XStyleDeclarationFor<C> | ReadonlyArray<XStyleDeclarationFor<C>>) => string;
}

function isBreakpointBlock(property: string, value: unknown): value is Record<string, unknown> {
  return (
    property.startsWith('@') && typeof value === 'object' && value !== null && !Array.isArray(value)
  );
}

// Later declarations win per property. A breakpoint block counts as a set of
// properties, not one value: two `@md` blocks merge key by key instead of the
// later one replacing the earlier one wholesale.
function mergeDeclarations(
  declarations: ReadonlyArray<Record<string, unknown>>,
): Record<string, unknown> {
  const merged: Record<string, unknown> = {};

  for (const declaration of declarations) {
    for (const [property, value] of Object.entries(declaration)) {
      const previous = merged[property];

      merged[property] =
        isBreakpointBlock(property, value) && isBreakpointBlock(property, previous)
          ? { ...previous, ...value }
          : value;
    }
  }

  return merged;
}

interface DevState {
  keys: ReadonlySet<string>;
  breakpoints: ReadonlySet<string>;
}

function buildDevState(config: XStyleUserConfig): DevState {
  const resolved = resolveConfig(config);
  const breakpoints = resolved.breakpoints.map(({ name }) => name);
  const keys = new Set<string>();

  for (const [styleName, { values, responsive }] of Object.entries(resolved.rules)) {
    const ruleBreakpoints = responsive === true ? breakpoints : (responsive ?? []);

    for (const value of values) {
      const token = Array.isArray(value) ? value[0] : String(value);

      keys.add(makeKey(styleName, token));
      for (const bp of ruleBreakpoints) {
        keys.add(makeKey(styleName, token, bp));
      }
    }
  }

  return { keys, breakpoints: new Set(breakpoints) };
}

/**
 * Builds the runtime for a config: `css()` assembles class names with the same
 * pure derivation codegen uses — no mapping, no CSS lookup. In dev
 * (`NODE_ENV !== 'production'`) the config is lazily resolved to validate keys:
 * an unknown key warns once and produces no class. In prod the derivation runs
 * unchecked — the type system already guards the inputs.
 */
export function createXStyle<const C extends XStyleUserConfig>(config: C): XStyle<C> {
  const naming = {
    classNames: config.classNames ?? 'hashed',
    prefix: config.prefix ?? 'xs-',
    hashSalt: config.hashSalt ?? '',
  } as const;

  const isDev = typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production';
  let devState: DevState | null = null;
  const warned = new Set<string>();

  function warnOnce(subject: string, message: string): void {
    if (warned.has(subject)) {
      return;
    }
    warned.add(subject);
    console.warn(`[xstyle] ${message}`);
  }

  function lookupClass(property: string, value: unknown, breakpoint?: string): string | undefined {
    if (typeof value === 'undefined' || value === null || value === false) {
      return undefined;
    }

    const key = makeKey(hyphenateStyleName(property), String(value), breakpoint);

    if (isDev) {
      devState ??= buildDevState(config);
      if (!devState.keys.has(key)) {
        warnOnce(key, `Unknown style key "${key}" — no CSS was generated for it; skipping.`);
        return undefined;
      }
    }

    return makeClassName(naming, key);
  }

  function generateClasses(declaration: Record<string, unknown>): string {
    const classes: string[] = [];

    for (const [property, value] of Object.entries(declaration)) {
      if (typeof value === 'undefined' || value === null || value === false) {
        continue;
      }

      if (property.startsWith('@')) {
        // A breakpoint block must be a plain object; ignore malformed values
        // (e.g. a primitive or array sneaking past the types via `as any`).
        if (typeof value === 'object' && !Array.isArray(value)) {
          const breakpoint = property.slice(1);

          if (isDev) {
            devState ??= buildDevState(config);
            if (!devState.breakpoints.has(breakpoint)) {
              warnOnce(
                property,
                `Unknown breakpoint block "${property}" — not in theme.breakpoints; skipping.`,
              );
              continue;
            }
          }

          for (const [innerProperty, innerValue] of Object.entries(value)) {
            const className = lookupClass(innerProperty, innerValue, breakpoint);

            if (className) {
              classes.push(className);
            }
          }
        }

        continue;
      }

      const className = lookupClass(property, value);

      if (className) {
        classes.push(className);
      }
    }

    return classes.join(' ');
  }

  function css(arg: XStyleDeclarationFor<C> | ReadonlyArray<XStyleDeclarationFor<C>>): string {
    const declaration = Array.isArray(arg)
      ? mergeDeclarations(arg as ReadonlyArray<Record<string, unknown>>)
      : arg;

    return generateClasses(declaration as Record<string, unknown>);
  }

  return { css };
}
