import { buildDefaultRuleGroups, buildDefaultRules } from './rules';

import type { Declaration, Ruleset, Theme } from '../../config/types';

export type DefaultRules<T extends Theme> = ReturnType<typeof buildDefaultRules<T>>;

/** Rule names of the default preset — the ruleset's shape is theme-independent. */
export type DefaultRuleName = Extract<keyof DefaultRules<Theme>, string>;

type DefaultGroups = ReturnType<typeof buildDefaultRuleGroups<Theme>>;

/** Group names of the default preset — see ./README.md for what each contains. */
export type DefaultGroupName = Extract<keyof DefaultGroups, string>;

// Distributive: a union of group names expands to the union of their rule
// names. Exported for the type test that pins groups ⊆ flat ruleset; not part
// of the package surface.
export type RuleNamesInGroups<G extends DefaultGroupName> = G extends unknown
  ? Extract<keyof DefaultGroups[G], string>
  : never;

export interface PresetDefaultOptions<
  T extends Theme,
  E extends DefaultRuleName,
  G extends DefaultGroupName,
> {
  theme: T;
  /** Individual rules to drop — removed from the generated CSS and the inferred types alike. */
  exclude?: readonly E[];
  /** Whole groups to drop — every rule in the group goes, CSS and types alike. */
  excludeGroups?: readonly G[];
}

export function presetDefault<
  const T extends Theme,
  const E extends DefaultRuleName = never,
  const G extends DefaultGroupName = never,
>(
  options: PresetDefaultOptions<T, E, G>,
): { name: 'default'; rules: Omit<DefaultRules<T>, E | RuleNamesInGroups<G>> } {
  const excludedRules = new Set<string>(options.exclude ?? []);
  const excludedGroups = new Set<string>(options.excludeGroups ?? []);
  const rules: Record<string, Declaration> = {};

  // The generic group objects don't structurally match `Ruleset` while `T` is
  // unresolved; the flat return type is what carries the precise rule types.
  const groups = buildDefaultRuleGroups(options.theme) as Record<string, Ruleset>;

  for (const [groupName, groupRules] of Object.entries(groups)) {
    if (excludedGroups.has(groupName)) continue;

    for (const [ruleName, declaration] of Object.entries(groupRules)) {
      if (!excludedRules.has(ruleName)) rules[ruleName] = declaration;
    }
  }

  return { name: 'default', rules: rules as Omit<DefaultRules<T>, E | RuleNamesInGroups<G>> };
}
