import { describe, expect, it } from 'vitest';
import { escapeClassName, makeClassName, makeKey } from './class-name';

import type { ClassNameOptions } from './class-name';

const hashed: ClassNameOptions = { classNames: 'hashed', prefix: 'xs-', hashSalt: '' };
const readable: ClassNameOptions = { classNames: 'readable', prefix: 'xs-', hashSalt: '' };

describe('makeKey', () => {
  it('joins style name and token with a dash', () => {
    expect(makeKey('display', 'flex')).toBe('display-flex');
    expect(makeKey('padding', '24')).toBe('padding-24');
  });

  it('appends @breakpoint when given', () => {
    expect(makeKey('display', 'block', 'md')).toBe('display-block@md');
  });
});

describe('makeClassName (hashed)', () => {
  // Wire format: djb2-xor over `hashSalt + key`, base36, 6 chars. This table
  // pins it — a change here breaks every previously generated stylesheet.
  it.each([
    ['display-flex', 'xs-90lrz9'],
    ['display-block@md', 'xs-8x051u'],
    ['padding-24', 'xs-3nmfrz'],
    ['padding-24@md', 'xs-ksrehi'],
    ['width-100%', 'xs-pclztm'],
    ['grid-column-1/-1', 'xs-vg5lt5'],
  ])('hashes %s to %s', (key, className) => {
    expect(makeClassName(hashed, key)).toBe(className);
  });

  it('is deterministic', () => {
    expect(makeClassName(hashed, 'display-flex')).toBe(makeClassName(hashed, 'display-flex'));
  });

  it('uses the configured prefix', () => {
    expect(makeClassName({ ...hashed, prefix: 'u-' }, 'display-flex')).toBe('u-90lrz9');
  });

  it('changes with hashSalt', () => {
    expect(makeClassName({ ...hashed, hashSalt: 'v2' }, 'display-flex')).toBe('xs-8ozv1d');
  });

  it('can collide for distinct keys — codegen must detect this, a salt resolves it', () => {
    // Pair found by birthday search against the pinned wire format.
    const a = 'color-t579045';
    const b = 'height-t591014';

    expect(a).not.toBe(b);
    expect(makeClassName(hashed, a)).toBe(makeClassName(hashed, b));

    const salted = { ...hashed, hashSalt: 'v2' };
    expect(makeClassName(salted, a)).not.toBe(makeClassName(salted, b));
  });
});

describe('makeClassName (readable)', () => {
  it('prefixes the key verbatim — unescaped, as the class attribute needs it', () => {
    expect(makeClassName(readable, 'display-flex')).toBe('xs-display-flex');
    expect(makeClassName(readable, 'padding-24@md')).toBe('xs-padding-24@md');
    expect(makeClassName(readable, 'width-100%')).toBe('xs-width-100%');
  });

  it('cannot collide: distinct keys map to distinct names', () => {
    expect(makeClassName(readable, 'color-t579045')).not.toBe(
      makeClassName(readable, 'height-t591014'),
    );
  });
});

describe('escapeClassName', () => {
  it('escapes % with backslash', () => {
    expect(escapeClassName('xs-width-100%')).toBe('xs-width-100\\%');
  });

  it('escapes / with backslash', () => {
    expect(escapeClassName('xs-grid-column-1/-1')).toBe('xs-grid-column-1\\/-1');
  });

  it('escapes @ with backslash', () => {
    expect(escapeClassName('xs-display-block@md')).toBe('xs-display-block\\@md');
  });

  it('escapes . with backslash — never as a hex escape', () => {
    expect(escapeClassName('xs-margin-0.5')).toBe('xs-margin-0\\.5');
  });

  it('escapes every character outside the CSS-ident charset', () => {
    expect(escapeClassName('xs-a:b(c)')).toBe('xs-a\\:b\\(c\\)');
  });

  it('leaves normal strings unchanged', () => {
    expect(escapeClassName('xs-flex-end')).toBe('xs-flex-end');
    expect(escapeClassName('xs-rotate--45deg')).toBe('xs-rotate--45deg');
  });
});
