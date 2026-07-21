import type { BreakpointNamesOf } from '../infer/resolve';
import type { XStyleUserConfig } from './types';

// When a rule's `responsive` list contains a name that is not a theme
// breakpoint, demand `readonly B[]` there so the typo fails to compile with
// the valid names in the error message. Valid declarations map to `unknown`,
// which any type satisfies.
type ValidateDeclaration<D, B extends string> = D extends {
  responsive: readonly (infer N extends string)[];
}
  ? [Exclude<N, B>] extends [never]
    ? unknown
    : { responsive: readonly B[] }
  : unknown;

type ValidateRules<R, B extends string> = { [K in keyof R]: ValidateDeclaration<R[K], B> };

// Only `config.rules` is validated at the type level: preset rules come from
// factories, not user literals, and `resolveConfig` still validates everything
// at runtime.
type ValidateConfig<C extends XStyleUserConfig> = {
  rules?: ValidateRules<C['rules'], BreakpointNamesOf<C>>;
};

/**
 * Identity helper that preserves the config's literal types end-to-end
 * (`defineConfig` → `createXStyle`). Do not annotate the argument or the
 * variable holding the result with `XStyleUserConfig` — that widens the
 * literals and kills token autocomplete.
 */
export function defineConfig<const C extends XStyleUserConfig>(config: C & ValidateConfig<C>): C {
  return config;
}
