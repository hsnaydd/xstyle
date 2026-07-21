// Type-only module: computes the effective ruleset and breakpoint names of a
// user config, mirroring `resolveConfig`'s value-level merge exactly.
// The `{}` types below are intentional: they are the identity element of the
// rules merge — "no rules", not "any value".

import type { DefaultTheme } from '../config/default-theme';
import type { Preset, Ruleset, Theme, XStyleUserConfig } from '../config/types';
import type { DefaultRules } from '../presets/default';

type Simplify<T> = { [K in keyof T]: T[K] } & {};

/** Right side wins, matching the value-level merge in `resolveConfig`. */
type MergeTwo<A, B> = Simplify<Omit<A, keyof B> & B>;

export type MergePresets<Presets> = Presets extends readonly [
  infer Head extends Preset,
  ...infer Tail,
]
  ? MergeTwo<Head['rules'], MergePresets<Tail>>
  : // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    {};

/**
 * The effective theme of a config — `theme` omitted (or undefined) → the
 * built-in `defaultTheme`, mirroring `resolveConfig`'s value-level fallback.
 * Always go through this alias instead of indexing `C['theme']` directly: a
 * bare indexed access errors on configs without the key.
 */
export type ThemeOf<C extends XStyleUserConfig> = C['theme'] extends Theme
  ? C['theme']
  : DefaultTheme;

// `presets` omitted → the default preset's rules for the config's effective
// theme, mirroring resolveConfig's value-level injection. Any explicit list —
// including the empty tuple — takes the MergePresets path.
type PresetRulesOf<C extends XStyleUserConfig> = C['presets'] extends readonly Preset[]
  ? MergePresets<C['presets']>
  : DefaultRules<ThemeOf<C>>;

export type RulesOf<C extends XStyleUserConfig> = MergeTwo<
  PresetRulesOf<C>,
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  C['rules'] extends Ruleset ? C['rules'] : {}
>;

export type BreakpointNamesOf<C extends XStyleUserConfig> = Extract<
  keyof ThemeOf<C>['breakpoints'],
  string
>;
