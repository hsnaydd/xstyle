import type { ClassNameMode } from '../shared/class-name';

export type BasicValue = string | number;
export type NamedValue = readonly [string, BasicValue];
export type Value = ReadonlyArray<BasicValue | NamedValue>;

// Which breakpoints a rule is responsive at:
//  true  → all breakpoints in the theme
//  list  → only the listed breakpoint names (a single one is `['md']`)
//  unset → not responsive (base only)
export type ResponsiveConfig = true | readonly string[];

export interface Declaration {
  property: string;
  responsive?: ResponsiveConfig;
  values: Value;
}

export type Ruleset = Record<string, Declaration>;

export type TokenScale = Record<string | number, string>;

// `breakpoints` is the only slice the core interprets (name → min-width; no
// base tier — the base declaration has no media query). The token scales are
// read by presets only.
export interface Theme {
  breakpoints: Record<string, string>;
  colors?: TokenScale;
  space?: TokenScale;
  size?: TokenScale;
  radius?: TokenScale;
  fonts?: TokenScale;
  shadows?: TokenScale;
}

// A preset is plain data; factories like `presetDefault({ theme })` are called
// by the user inside the config so rule types flow through without loss.
export interface Preset<R extends Ruleset = Ruleset> {
  name: string;
  rules: R;
}

export interface XStyleUserConfig {
  /**
   * Omitted → the built-in `defaultTheme`. An explicit theme replaces it
   * wholesale — spread `defaultTheme` to extend it instead.
   */
  theme?: Theme;
  presets?: readonly Preset[];
  /** Extra rules and preset overrides — last wins, a rule replaces as a whole. */
  rules?: Ruleset;
  classNames?: ClassNameMode;
  prefix?: string;
  layer?: string | false;
  /** Only meaningful in `hashed` mode; change it to resolve a hash collision. */
  hashSalt?: string;
  /** CLI output path, resolved relative to the config file. */
  output?: string;
}

export interface BreakpointEntry {
  name: string;
  minWidth: string;
}

/** Post-merge, validated config — what codegen, the CLI and the Vite plugin consume. */
export interface ResolvedConfig {
  rules: Ruleset;
  /** Sorted ascending by min-width. */
  breakpoints: readonly BreakpointEntry[];
  classNames: ClassNameMode;
  prefix: string;
  layer: string | false;
  hashSalt: string;
  output: string;
}
