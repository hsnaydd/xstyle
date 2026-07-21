export { defineConfig } from './config/define-config';

export { defaultTheme } from './config/default-theme';
export type { DefaultTheme } from './config/default-theme';

export { createXStyle } from './runtime/create-xstyle';
export type { XStyle } from './runtime/create-xstyle';

export { presetDefault } from './presets/default';
export { toNamedValues } from './presets/to-named-values';

export type {
  DefaultGroupName,
  DefaultRuleName,
  DefaultRules,
  PresetDefaultOptions,
} from './presets/default';

export type { DeclarationOf, XStyleDeclarationFor, XStyleTokensFor } from './infer/declaration';

export type { BreakpointNamesOf, MergePresets, RulesOf, ThemeOf } from './infer/resolve';

export type {
  BasicValue,
  BreakpointEntry,
  Declaration,
  NamedValue,
  Preset,
  ResolvedConfig,
  Ruleset,
  Theme,
  TokenScale,
  Value,
  XStyleUserConfig,
} from './config/types';
