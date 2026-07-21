import { presetDefault } from '../presets/default';

import { defaultTheme } from './default-theme';

import type {
  BasicValue,
  BreakpointEntry,
  Declaration,
  NamedValue,
  ResolvedConfig,
  Ruleset,
  XStyleUserConfig,
} from './types';

// This file must stay isomorphic — no Node built-ins. The dev runtime calls it
// lazily, the CLI and the Vite plugin call it on every (re)build.

function tokenNameOf(value: BasicValue | NamedValue): string {
  return Array.isArray(value) ? value[0] : String(value);
}

// Names end up verbatim in readable-mode class names. Codegen escapes CSS
// selectors, so most characters are fine — but whitespace would split the
// space-separated `class` attribute (no escape can fix that), and `@` is
// reserved as the key grammar's breakpoint separator.
const SAFE_NAME_PATTERN = /^[^\s@]+$/;

// Style names must additionally survive the runtime's camelCase round trip
// (`overflow-x` → `overflowX` → `overflow-x`): lowercase kebab-case with each
// segment starting with a letter — a digit after a hyphen would not restore.
const STYLE_NAME_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z][a-z0-9]*)*$/;

const MIN_WIDTH_PATTERN = /^(\d+(?:\.\d+)?)([a-z%]*)$/;

function resolveBreakpoints(
  breakpoints: Record<string, string>,
  errors: string[],
): readonly BreakpointEntry[] {
  const entries = Object.entries(breakpoints).map(([name, minWidth]) => {
    if (!SAFE_NAME_PATTERN.test(name)) {
      errors.push(`Breakpoint "${name}": invalid name — must not contain whitespace or "@".`);
    }

    const match = MIN_WIDTH_PATTERN.exec(minWidth);

    if (!match) {
      errors.push(`Breakpoint "${name}": min-width "${minWidth}" is not a numeric CSS length.`);
    }

    return {
      name,
      minWidth,
      min: match ? Number.parseFloat(match[1]) : Number.NaN,
      unit: match ? match[2] || '(unitless)' : null,
    };
  });

  // Min-widths sort numerically, so they must all share one unit — "40em" and
  // "600px" cannot be compared.
  const units = new Set(entries.flatMap(({ unit }) => (unit === null ? [] : [unit])));

  if (units.size > 1) {
    errors.push(
      `theme.breakpoints mixes units (${[...units].sort().join(', ')}) — min-widths are ` +
        'sorted numerically, so give every breakpoint the same unit.',
    );
  }

  return entries.sort((a, b) => a.min - b.min).map(({ name, minWidth }) => ({ name, minWidth }));
}

function validateRule(
  styleName: string,
  declaration: Declaration,
  source: string,
  breakpointNames: ReadonlySet<string>,
  errors: string[],
): void {
  const { responsive, values } = declaration;

  if (!STYLE_NAME_PATTERN.test(styleName)) {
    errors.push(
      `Rule "${styleName}" (${source}): invalid style name — use lowercase kebab-case with ` +
        'each segment starting with a letter (e.g. "background-color").',
    );
  }

  if (responsive !== undefined && responsive !== true) {
    for (const breakpoint of responsive) {
      if (!breakpointNames.has(breakpoint)) {
        errors.push(
          `Rule "${styleName}" (${source}): unknown breakpoint "${breakpoint}" in \`responsive\` — ` +
            `theme.breakpoints defines: ${[...breakpointNames].join(', ')}.`,
        );
      }
    }
  }

  const seen = new Set<string>();
  const reported = new Set<string>();

  for (const value of values) {
    const token = tokenNameOf(value);

    if (!seen.has(token) && !SAFE_NAME_PATTERN.test(token)) {
      errors.push(
        `Rule "${styleName}" (${source}): invalid token "${token}" — tokens must not contain ` +
          'whitespace or "@".',
      );
    }

    if (seen.has(token) && !reported.has(token)) {
      errors.push(`Rule "${styleName}" (${source}): duplicate token "${token}" in \`values\`.`);
      reported.add(token);
    }
    seen.add(token);
  }
}

export function resolveConfig(config: XStyleUserConfig): ResolvedConfig {
  const errors: string[] = [];

  // `theme` omitted → the built-in defaultTheme (whole-replace: an explicit
  // theme is used exactly as given, no merging). Mirrored at the type level
  // by `ThemeOf` in src/infer/resolve.ts.
  const theme = config.theme ?? defaultTheme;

  const breakpoints = resolveBreakpoints(theme.breakpoints, errors);
  const breakpointNames = new Set(breakpoints.map(({ name }) => name));

  // `presets` omitted → the default preset built from the effective theme;
  // an explicit list — including [] — is used exactly as given. Mirrored at
  // the type level by `RulesOf`'s fallback in src/infer/resolve.ts.
  const presets = config.presets ?? [presetDefault({ theme })];

  // Merge order: presets[0] ← … ← presets[n] ← config.rules; a rule replaces
  // as a whole (values are never deep-merged). Only the winning occurrence of
  // a rule is validated, labeled with the source it came from.
  const sources: ReadonlyArray<{ label: string; rules: Ruleset }> = [
    ...presets.map(({ name, rules }) => ({ label: `preset "${name}"`, rules })),
    ...(config.rules ? [{ label: 'config rules', rules: config.rules }] : []),
  ];

  const rules: Record<string, Declaration> = {};
  const sourceOf = new Map<string, string>();

  for (const { label, rules: sourceRules } of sources) {
    for (const [styleName, declaration] of Object.entries(sourceRules)) {
      rules[styleName] = declaration;
      sourceOf.set(styleName, label);
    }
  }

  for (const [styleName, declaration] of Object.entries(rules)) {
    validateRule(styleName, declaration, sourceOf.get(styleName)!, breakpointNames, errors);
  }

  const prefix = config.prefix ?? 'xs-';

  // Same constraint as tokens: the prefix lands in the `class` attribute.
  if (/\s/.test(prefix)) {
    errors.push(`prefix "${prefix}" must not contain whitespace.`);
  }

  if (errors.length > 0) {
    throw new Error(`Invalid xstyle config:\n${errors.map((error) => `  - ${error}`).join('\n')}`);
  }

  return {
    rules,
    breakpoints,
    classNames: config.classNames ?? 'hashed',
    prefix,
    layer: config.layer ?? 'utilities',
    hashSalt: config.hashSalt ?? '',
    output: config.output ?? './xstyle.generated.css',
  };
}
