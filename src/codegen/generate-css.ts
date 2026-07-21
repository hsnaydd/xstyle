import { escapeClassName, makeClassName, makeKey } from '../shared/class-name';

import type {
  BasicValue,
  NamedValue,
  ResolvedConfig,
  ResponsiveConfig,
  Value,
} from '../config/types';

function isBasicValue(value: BasicValue | NamedValue): value is BasicValue {
  return Array.isArray(value) === false;
}

function normalizeValues(values: Value): Array<[string, BasicValue]> {
  return values.map((item) => {
    if (!isBasicValue(item)) {
      return [item[0], item[1]];
    }
    return [String(item), item];
  });
}

function resolveResponsive(
  config: ResponsiveConfig | undefined,
  breakpointNames: readonly string[],
): readonly string[] {
  if (!config) {
    return [];
  }
  if (config === true) {
    return breakpointNames;
  }
  // Filter the ascending-ordered list by membership so media blocks keep their
  // order even when the rule lists breakpoints out of order.
  return breakpointNames.filter((name) => config.includes(name));
}

export function generateCSS(resolved: ResolvedConfig): string {
  const baseRules: string[] = [];
  const breakpointRules = new Map<string, string[]>();

  // Two invariants, both fatal:
  //  - key uniqueness: two rule/token pairs must not serialize to the same key
  //    (latent ambiguity in the grammar, mode-independent);
  //  - class uniqueness: two keys must not hash to the same class (hashed mode
  //    only — readable derives the class injectively from the key).
  const sourceOfKey = new Map<string, string>();
  const keyOfClass = new Map<string, string>();
  const errors: string[] = [];

  function classFor(styleName: string, token: string, breakpoint?: string): string {
    const key = makeKey(styleName, token, breakpoint);
    const source = `rule "${styleName}" token "${token}"${breakpoint ? ` at "${breakpoint}"` : ''}`;
    const previousSource = sourceOfKey.get(key);
    const className = makeClassName(resolved, key);

    if (previousSource !== undefined) {
      errors.push(`Ambiguous key "${key}": ${previousSource} and ${source} both produce it.`);
      return className;
    }
    sourceOfKey.set(key, source);

    const previousKey = keyOfClass.get(className);

    if (previousKey !== undefined) {
      errors.push(
        `Hash collision: keys "${previousKey}" and "${key}" both map to class "${className}". ` +
          'Set or change `hashSalt` to resolve it.',
      );
    } else {
      keyOfClass.set(className, key);
    }

    return className;
  }

  const breakpointNames = resolved.breakpoints.map(({ name }) => name);

  for (const [styleName, { property, values, responsive }] of Object.entries(resolved.rules)) {
    const normalized = normalizeValues(values);

    for (const [token, cssValue] of normalized) {
      const className = classFor(styleName, token);
      baseRules.push(`.${escapeClassName(className)}{${property}:${cssValue}}`);
    }

    for (const bp of resolveResponsive(responsive, breakpointNames)) {
      const bucket = breakpointRules.get(bp) ?? [];
      for (const [token, cssValue] of normalized) {
        const className = classFor(styleName, token, bp);
        bucket.push(`.${escapeClassName(className)}{${property}:${cssValue}}`);
      }
      breakpointRules.set(bp, bucket);
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `xstyle CSS generation failed:\n${errors.map((error) => `  - ${error}`).join('\n')}`,
    );
  }

  // Media blocks come after the base rules and run ascending by min-width so a
  // wider breakpoint wins over a narrower one at equal specificity.
  const mediaBlocks = resolved.breakpoints.flatMap(({ name, minWidth }) => {
    const rules = breakpointRules.get(name);

    return rules ? [`@media (min-width:${minWidth}){\n${rules.join('\n')}\n}`] : [];
  });

  const body = [...baseRules, ...mediaBlocks].join('\n');

  return resolved.layer === false ? `${body}\n` : `@layer ${resolved.layer} {\n${body}\n}\n`;
}
