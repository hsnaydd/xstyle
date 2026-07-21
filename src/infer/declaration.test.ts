/* eslint vitest/expect-expect: ["error", { "assertFunctionNames": ["expect", "expectTypeOf"] }] */

// Type tests: the assertions here are compile-time only — they are enforced by
// `pnpm lint:ts` (tsc over src), while Vitest just executes the empty shells.

import { describe, expect, expectTypeOf, it } from 'vitest';
import { defineConfig } from '../config/define-config';

import type { XStyleUserConfig } from '../config/types';
import type { XStyleDeclarationFor, XStyleTokensFor } from './declaration';
import type { BreakpointNamesOf, RulesOf } from './resolve';

const config = defineConfig({
  theme: { breakpoints: { sm: '640px', md: '768px' } },
  presets: [
    {
      name: 'base',
      rules: {
        display: { property: 'display', responsive: true, values: ['flex', 'block'] },
        'flex-wrap': { property: 'flex-wrap', responsive: ['md'], values: ['wrap', 'nowrap'] },
        padding: {
          property: 'padding',
          values: [
            ['24', '1.5rem'],
            ['32', '2rem'],
          ],
        },
        top: { property: 'top', values: ['0', 'auto'] },
      },
    },
  ],
  rules: {
    top: { property: 'top', values: ['0'] },
    'grid-column': { property: 'grid-column', values: ['auto', '1/-1'] },
  },
});

type Config = typeof config;
type D = XStyleDeclarationFor<Config>;

describe('config type inference', () => {
  it('infers breakpoint names from the theme', () => {
    expectTypeOf<BreakpointNamesOf<Config>>().toEqualTypeOf<'sm' | 'md'>();
  });

  it('merges preset rules with config rules', () => {
    expectTypeOf<keyof RulesOf<Config>>().toEqualTypeOf<
      'display' | 'flex-wrap' | 'padding' | 'top' | 'grid-column'
    >();
  });

  it('replaces an overridden rule as a whole — preset tokens do not leak through', () => {
    expectTypeOf<XStyleTokensFor<Config, 'top'>>().toEqualTypeOf<'0'>();
  });

  it('camel-cases rule names and keeps literal token unions', () => {
    expectTypeOf<D['display']>().toEqualTypeOf<'flex' | 'block' | false | null | undefined>();
    expectTypeOf<D['gridColumn']>().toEqualTypeOf<'auto' | '1/-1' | false | null | undefined>();
  });

  it('uses the token name, not the CSS value, for named values', () => {
    expectTypeOf<D['padding']>().toEqualTypeOf<'24' | '32' | false | null | undefined>();
  });

  it('gates each breakpoint block by the rules responsive at it', () => {
    type AtSm = NonNullable<D['@sm']>;
    type AtMd = NonNullable<D['@md']>;

    expectTypeOf<keyof AtSm>().toEqualTypeOf<'display'>();
    expectTypeOf<keyof AtMd>().toEqualTypeOf<'display' | 'flexWrap'>();
    expectTypeOf<AtMd['flexWrap']>().toEqualTypeOf<'wrap' | 'nowrap' | false | null | undefined>();
  });

  it('rejects declarations outside the config', () => {
    const valid: D = { display: 'flex', '@md': { flexWrap: 'wrap' } };

    // @ts-expect-error -- 'grid' is not a configured display token
    const badToken: D = { display: 'grid' };

    // @ts-expect-error -- '@lg' is not a theme breakpoint
    const badBreakpoint: D = { '@lg': {} };

    // @ts-expect-error -- flex-wrap is not responsive at 'sm'
    const badResponsive: D = { '@sm': { flexWrap: 'wrap' } };

    expect([valid, badToken, badBreakpoint, badResponsive]).toBeDefined();
  });

  it('rejects unknown breakpoint names in `responsive` at compile time', () => {
    const invalid = defineConfig({
      theme: { breakpoints: { sm: '640px' } },
      rules: {
        display: {
          property: 'display',
          // @ts-expect-error -- 'md' is not a theme breakpoint
          responsive: ['md'],
          values: ['flex'],
        },
      },
    });

    expect(invalid).toBeDefined();
  });

  it('widens away literal types when the config is annotated (documented pitfall)', () => {
    const annotated: XStyleUserConfig = config;

    expectTypeOf<XStyleDeclarationFor<typeof annotated>>().not.toEqualTypeOf<D>();
    expect(annotated).toBe(config);
  });
});

describe('default preset fallback', () => {
  it('falls back to the default preset rules when `presets` is omitted', () => {
    const presetless = defineConfig({
      theme: { breakpoints: { sm: '640px' }, space: { 4: '0.25rem', 8: '0.5rem' } },
    });

    type P = XStyleDeclarationFor<typeof presetless>;

    expectTypeOf<'display' extends keyof RulesOf<typeof presetless> ? true : false>() //
      .toEqualTypeOf<true>();
    expectTypeOf<'padding' extends keyof RulesOf<typeof presetless> ? true : false>() //
      .toEqualTypeOf<true>();
    // token union derives from the literal theme.space
    expectTypeOf<P['padding']>().toEqualTypeOf<'0' | '4' | '8' | false | null | undefined>();
    // breakpoint blocks gated by the default preset's `responsive` flags
    expectTypeOf<'display' extends keyof NonNullable<P['@sm']> ? true : false>() //
      .toEqualTypeOf<true>();
    expect(presetless).toBeDefined();
  });

  it('treats an explicit `presets: []` as exactly no preset rules', () => {
    const optedOut = defineConfig({
      theme: { breakpoints: { sm: '640px' } },
      presets: [],
      rules: { display: { property: 'display', values: ['flex'] } },
    });

    expectTypeOf<keyof RulesOf<typeof optedOut>>().toEqualTypeOf<'display'>();
    expect(optedOut).toBeDefined();
  });

  it('lets config rules override the injected defaults, replacing whole rules', () => {
    const overridden = defineConfig({
      theme: { breakpoints: { sm: '640px' }, space: { 4: '0.25rem' } },
      rules: { padding: { property: 'padding', values: [['24', '1.5rem']] } },
    });

    expectTypeOf<XStyleTokensFor<typeof overridden, 'padding'>>().toEqualTypeOf<'24'>();
    expect(overridden).toBeDefined();
  });
});

describe('defaultTheme fallback', () => {
  it('infers default breakpoints and default tokens for a zero-config', () => {
    const zero = defineConfig({});

    type Z = XStyleDeclarationFor<typeof zero>;

    expectTypeOf<BreakpointNamesOf<typeof zero>>().toEqualTypeOf<
      'sm' | 'md' | 'lg' | 'xl' | 'xxl'
    >();

    const valid: Z = { color: 'gray-500', padding: '16', '@md': { display: 'flex' } };

    // @ts-expect-error -- '@xs' is not a defaultTheme breakpoint
    const badBreakpoint: Z = { '@xs': {} };

    // @ts-expect-error -- 'brand' is not a defaultTheme color
    const badToken: Z = { color: 'brand' };

    expect([zero, valid, badBreakpoint, badToken]).toBeDefined();
  });

  it('replaces the defaults wholesale when a theme is given', () => {
    const custom = defineConfig({
      theme: { breakpoints: { sm: '640px' }, colors: { brand: '#123456' } },
    });

    type C = XStyleDeclarationFor<typeof custom>;

    const valid: C = { color: 'brand' };

    // @ts-expect-error -- defaultTheme tokens are entirely out
    const leaked: C = { color: 'gray-500' };

    expect([custom, valid, leaked]).toBeDefined();
  });
});
