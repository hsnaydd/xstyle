// Type-only module: the generic port of the old `types.ts` machinery. Instead
// of reading a hardcoded `styleDefinitions`, everything is parameterized by
// the ruleset and breakpoint names inferred from the user config.

import type { BasicValue, Ruleset, Value, XStyleUserConfig } from '../config/types';
import type { BreakpointNamesOf, RulesOf } from './resolve';

type CamelCase<S extends string> = S extends `${infer Head}-${infer Tail}`
  ? `${Head}${Capitalize<CamelCase<Tail>>}`
  : S;

type ExtractTokenItem<T> = T extends string | number
  ? `${T}`
  : T extends readonly [infer K extends string, BasicValue]
    ? K
    : never;

type ExtractTokens<T extends Value> =
  T extends ReadonlyArray<infer Item> ? ExtractTokenItem<Item> : never;

// Breakpoints a rule's `responsive` config resolves to: `true` → all, a list →
// its members (unknown names are rejected at the `defineConfig` boundary).
type ToBreakpointUnion<R, AllB extends string> = R extends true
  ? AllB
  : R extends readonly (infer N extends string)[]
    ? Extract<N, AllB>
    : never;

type ResponsiveOf<D, AllB extends string> = D extends { responsive: infer R }
  ? ToBreakpointUnion<R, AllB>
  : never;

// Properties available inside a given breakpoint block — only those responsive at `B`.
type ResponsiveBlock<R extends Ruleset, AllB extends string, B extends AllB> = {
  [K in Extract<keyof R, string> as B extends ResponsiveOf<R[K], AllB> ? CamelCase<K> : never]?:
    false | null | ExtractTokens<R[K]['values']>;
};

type ResponsiveDeclarations<R extends Ruleset, AllB extends string> = {
  [B in AllB as `@${B}`]?: ResponsiveBlock<R, AllB, B>;
};

export type DeclarationOf<R extends Ruleset, AllB extends string> = Readonly<
  {
    [K in Extract<keyof R, string> as CamelCase<K>]?: false | null | ExtractTokens<R[K]['values']>;
  } & ResponsiveDeclarations<R, AllB>
>;

export type XStyleDeclarationFor<C extends XStyleUserConfig> =
  RulesOf<C> extends infer R extends Ruleset ? DeclarationOf<R, BreakpointNamesOf<C>> : never;

/** Token-name union of a single rule, e.g. `XStyleTokensFor<Config, 'color'>`. */
export type XStyleTokensFor<
  C extends XStyleUserConfig,
  K extends keyof RulesOf<C>,
> = RulesOf<C>[K] extends { values: infer V extends Value } ? ExtractTokens<V> : never;
