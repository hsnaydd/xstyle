// The single contract between codegen and runtime: every utility is identified
// by a key in the `styleName-token[@bp]` grammar, and its class name is derived
// from that key by a pure function. There is no mapping module.
//
// This file must stay isomorphic — no Node built-ins.

export type ClassNameMode = 'hashed' | 'readable';

/** The naming slice of `ResolvedConfig` that class-name derivation depends on. */
export interface ClassNameOptions {
  classNames: ClassNameMode;
  prefix: string;
  hashSalt: string;
}

// Everything outside the CSS-ident charset gets a backslash. Never escape
// alphanumerics this way — `\5` would be a hex escape, not a literal.
const SPECIAL_CHARS = /[^a-zA-Z0-9_-]/g;

/**
 * Escapes a class name for use inside a CSS selector (`.${escapeClassName(name)}`).
 * Only needed at codegen time — the runtime emits the unescaped name, which is
 * what the `class` attribute must contain for the selector to match.
 */
export function escapeClassName(value: string): string {
  return value.replace(SPECIAL_CHARS, '\\$&');
}

export function makeKey(styleName: string, token: string, breakpoint?: string): string {
  return breakpoint === undefined ? `${styleName}-${token}` : `${styleName}-${token}@${breakpoint}`;
}

const HASH_LENGTH = 6;
const HASH_SPACE = 36 ** HASH_LENGTH;

// djb2-xor over `salt + key`, folded into base36. 6 chars ≈ 2.2e9 possible
// names, so collisions are unlikely but possible — codegen detects them and
// fails with both keys; the remedy is changing `hashSalt`.
function hashKey(key: string, salt: string): string {
  const input = salt + key;
  let hash = 5381;

  for (let index = 0; index < input.length; index += 1) {
    // eslint-disable-next-line no-bitwise
    hash = Math.imul(hash, 33) ^ input.charCodeAt(index);
  }

  // eslint-disable-next-line no-bitwise
  return ((hash >>> 0) % HASH_SPACE).toString(36).padStart(HASH_LENGTH, '0');
}

/**
 * Derives the class name for a key. The result is the literal token that goes
 * into the `class` attribute; it is NOT selector-escaped (see `escapeClassName`).
 */
export function makeClassName(options: ClassNameOptions, key: string): string {
  return options.classNames === 'readable'
    ? `${options.prefix}${key}`
    : `${options.prefix}${hashKey(key, options.hashSalt)}`;
}
