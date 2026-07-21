import { describe, expect, it } from 'vitest';
import { resolveConfig } from './resolve-config';

import type { Theme } from './types';

const theme: Theme = {
  breakpoints: { sm: '640px', md: '768px', lg: '1024px' },
};

describe('resolveConfig', () => {
  it('applies defaults', () => {
    const resolved = resolveConfig({ theme });

    expect(resolved.classNames).toBe('hashed');
    expect(resolved.prefix).toBe('xs-');
    expect(resolved.layer).toBe('utilities');
    expect(resolved.hashSalt).toBe('');
    expect(resolved.output).toBe('./xstyle.generated.css');
  });

  it('injects the default preset when `presets` is omitted', () => {
    const resolved = resolveConfig({ theme });

    expect(resolved.rules.display).toMatchObject({ property: 'display', responsive: true });
    expect(resolved.rules.padding).toMatchObject({ property: 'padding' });
    expect(Object.keys(resolved.rules)).toHaveLength(70);
  });

  it('uses an explicit `presets: []` as given — no injection', () => {
    const resolved = resolveConfig({ theme, presets: [] });

    expect(resolved.rules).toEqual({});
  });

  it('falls back to the built-in defaultTheme when `theme` is omitted', () => {
    const resolved = resolveConfig({});

    expect(resolved.breakpoints).toEqual([
      { name: 'sm', minWidth: '640px' },
      { name: 'md', minWidth: '768px' },
      { name: 'lg', minWidth: '1024px' },
      { name: 'xl', minWidth: '1280px' },
      { name: 'xxl', minWidth: '1536px' },
    ]);
    // the injected default preset carries the default tokens
    expect(resolved.rules.color.values).toEqual(
      expect.arrayContaining([
        ['white', '#fff'],
        ['gray-500', '#737373'],
      ]),
    );
    expect(resolved.rules.padding.values).toEqual(expect.arrayContaining([['16', '1rem']]));
    expect(resolved.rules['border-radius'].values).toEqual(
      expect.arrayContaining([['pill', '50rem']]),
    );
  });

  it('replaces the defaultTheme wholesale when a theme is given — no default tokens leak', () => {
    const resolved = resolveConfig({ theme });

    expect(resolved.rules.color.values).toEqual([['inherit', 'inherit']]);
    expect(resolved.rules.padding.values).toEqual([['0', '0']]);
  });

  it('keeps the theme fallback independent of the preset opt-out', () => {
    const resolved = resolveConfig({ presets: [] });

    expect(resolved.breakpoints).toHaveLength(5);
    expect(resolved.rules).toEqual({});
  });

  it('merges config rules over the injected default preset, replacing whole declarations', () => {
    const resolved = resolveConfig({
      theme,
      rules: { display: { property: 'display', values: ['flow-root'] } },
    });

    // the injected default's `responsive: true` is gone — replaced, not merged
    expect(resolved.rules.display).toEqual({ property: 'display', values: ['flow-root'] });
    expect(resolved.rules.position).toMatchObject({ property: 'position' });
  });

  it('keeps explicit options, including `layer: false`', () => {
    const resolved = resolveConfig({
      theme,
      classNames: 'readable',
      prefix: 'u-',
      layer: false,
      hashSalt: 'v2',
      output: './styles/xstyle.css',
    });

    expect(resolved.classNames).toBe('readable');
    expect(resolved.prefix).toBe('u-');
    expect(resolved.layer).toBe(false);
    expect(resolved.hashSalt).toBe('v2');
    expect(resolved.output).toBe('./styles/xstyle.css');
  });

  it('sorts breakpoints ascending by min-width regardless of declaration order', () => {
    const resolved = resolveConfig({
      theme: { breakpoints: { lg: '1024px', sm: '640px', md: '768px' } },
    });

    expect(resolved.breakpoints).toEqual([
      { name: 'sm', minWidth: '640px' },
      { name: 'md', minWidth: '768px' },
      { name: 'lg', minWidth: '1024px' },
    ]);
  });

  it('merges presets in order, config rules last, replacing a rule as a whole', () => {
    const resolved = resolveConfig({
      theme,
      presets: [
        {
          name: 'a',
          rules: {
            display: { property: 'display', responsive: true, values: ['flex', 'block'] },
            position: { property: 'position', values: ['relative'] },
          },
        },
        {
          name: 'b',
          rules: {
            display: { property: 'display', values: ['grid'] },
          },
        },
      ],
      rules: {
        position: { property: 'position', values: ['absolute'] },
        'grid-column': { property: 'grid-column', values: ['auto', '1/-1'] },
      },
    });

    // preset "b" replaced the whole declaration — `responsive` and the old
    // values are gone, not merged.
    expect(resolved.rules.display).toEqual({ property: 'display', values: ['grid'] });
    expect(resolved.rules.position).toEqual({ property: 'position', values: ['absolute'] });
    expect(resolved.rules['grid-column']).toEqual({
      property: 'grid-column',
      values: ['auto', '1/-1'],
    });
  });

  it('accepts `responsive: true` and known breakpoint lists', () => {
    expect(() =>
      resolveConfig({
        theme,
        rules: {
          display: { property: 'display', responsive: true, values: ['flex'] },
          gap: { property: 'gap', responsive: ['sm', 'lg'], values: ['0'] },
        },
      }),
    ).not.toThrow();
  });

  it('rejects unknown breakpoint names in `responsive`, naming the rule and its source', () => {
    expect(() =>
      resolveConfig({
        theme,
        presets: [
          {
            name: 'my-preset',
            rules: { display: { property: 'display', responsive: ['xl'], values: ['flex'] } },
          },
        ],
      }),
    ).toThrow(/Rule "display" \(preset "my-preset"\): unknown breakpoint "xl"/);
  });

  it('rejects duplicate token names in a rule, whether basic or named', () => {
    expect(() =>
      resolveConfig({
        theme,
        rules: {
          top: { property: 'top', values: ['0', 'auto', ['0', '0px']] },
        },
      }),
    ).toThrow(/Rule "top" \(config rules\): duplicate token "0"/);
  });

  it('collects every error into a single report instead of failing fast', () => {
    let message = '';

    try {
      resolveConfig({
        theme,
        rules: {
          display: { property: 'display', responsive: ['xl', 'xxl'], values: ['flex'] },
          top: { property: 'top', values: ['0', '0'] },
        },
      });
    } catch (error) {
      message = (error as Error).message;
    }

    expect(message).toContain('Invalid xstyle config:');
    expect(message).toContain('unknown breakpoint "xl"');
    expect(message).toContain('unknown breakpoint "xxl"');
    expect(message).toContain('duplicate token "0"');
  });

  it('does not validate preset rules that config rules override', () => {
    expect(() =>
      resolveConfig({
        theme,
        presets: [
          {
            name: 'a',
            rules: { display: { property: 'display', responsive: ['nope'], values: ['flex'] } },
          },
        ],
        rules: {
          display: { property: 'display', values: ['flex'] },
        },
      }),
    ).not.toThrow();
  });

  it('rejects non-numeric breakpoint min-widths', () => {
    expect(() => resolveConfig({ theme: { breakpoints: { sm: 'small' } } })).toThrow(
      /Breakpoint "sm": min-width "small" is not a numeric CSS length/,
    );
  });

  it('rejects mixed units in breakpoint min-widths — they cannot be sorted', () => {
    expect(() =>
      resolveConfig({ theme: { breakpoints: { sm: '640px', md: '48em', lg: '1024px' } } }),
    ).toThrow(/theme\.breakpoints mixes units \(em, px\)/);
  });

  it('accepts breakpoints that share a single unit, including unitless', () => {
    expect(() =>
      resolveConfig({ theme: { breakpoints: { sm: '40em', md: '48em' } }, presets: [] }),
    ).not.toThrow();
    expect(() =>
      resolveConfig({ theme: { breakpoints: { sm: '640', md: '768' } }, presets: [] }),
    ).not.toThrow();
  });

  it('rejects breakpoint names containing whitespace or "@"', () => {
    expect(() =>
      resolveConfig({ theme: { breakpoints: { 'foo bar': '640px' } }, presets: [] }),
    ).toThrow(/Breakpoint "foo bar": invalid name/);
  });

  it('accepts tokens with escapable special characters, including dots', () => {
    expect(() =>
      resolveConfig({
        theme,
        presets: [],
        rules: {
          width: { property: 'width', values: ['100%'] },
          'grid-column': { property: 'grid-column', values: ['auto', '1/-1'] },
          margin: {
            property: 'margin',
            values: [
              ['0.5', '0.125rem'],
              ['-45deg', 'x'],
            ],
          },
        },
      }),
    ).not.toThrow();
  });

  it('rejects tokens containing whitespace or "@" — no escape can fix those', () => {
    let message = '';

    try {
      resolveConfig({
        theme,
        presets: [],
        rules: {
          border: { property: 'border', values: [['1px solid', '1px solid']] },
          display: { property: 'display', values: ['flex@md'] },
        },
      });
    } catch (error) {
      message = (error as Error).message;
    }

    expect(message).toContain('invalid token "1px solid"');
    expect(message).toContain('invalid token "flex@md"');
  });

  it('rejects style names that break the camelCase round trip', () => {
    let message = '';

    try {
      resolveConfig({
        theme,
        presets: [],
        rules: {
          backgroundColor: { property: 'background-color', values: ['red'] },
          'x-2col': { property: 'grid-column', values: ['auto'] },
        },
      });
    } catch (error) {
      message = (error as Error).message;
    }

    expect(message).toContain('Rule "backgroundColor" (config rules): invalid style name');
    expect(message).toContain('Rule "x-2col" (config rules): invalid style name');
  });

  it('rejects a prefix containing whitespace', () => {
    expect(() => resolveConfig({ theme, presets: [], prefix: 'xs ' })).toThrow(
      /prefix "xs " must not contain whitespace/,
    );
  });

  it('reports a duplicate token once, no matter how often it repeats', () => {
    let message = '';

    try {
      resolveConfig({
        theme,
        rules: { top: { property: 'top', values: ['0', '0', '0'] } },
      });
    } catch (error) {
      message = (error as Error).message;
    }

    expect(message.match(/duplicate token "0"/g)).toHaveLength(1);
  });
});
