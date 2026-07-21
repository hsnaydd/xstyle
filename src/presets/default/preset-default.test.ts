/* eslint vitest/expect-expect: ["error", { "assertFunctionNames": ["expect", "expectTypeOf"] }] */

import { describe, expect, expectTypeOf, it } from 'vitest';
import { generateCSS } from '../../codegen/generate-css';
import { defineConfig } from '../../config/define-config';
import { resolveConfig } from '../../config/resolve-config';
import { toNamedValues } from '../to-named-values';
import { presetDefault } from '.';

import type { DefaultGroupName, DefaultRuleName, RuleNamesInGroups } from '.';
import type { XStyleDeclarationFor } from '../../infer/declaration';

const theme = {
  breakpoints: { sm: '640px', md: '768px' },
  colors: { 'gray-500': '#737373', white: '#fff' },
  space: { 4: '0.25rem', 8: '0.5rem' },
  size: { 128: '8rem' },
  radius: { small: '0.25rem' },
  fonts: { body: 'var(--font-body)' },
  shadows: { small: '0 0.375rem 1.125rem 0 rgb(15 17 18 / 15%)' },
} as const;

describe('toNamedValues', () => {
  it('turns a token record into [name, value] pairs', () => {
    expect(toNamedValues({ 4: '0.25rem', auto: 'auto' })).toEqual([
      ['4', '0.25rem'],
      ['auto', 'auto'],
    ]);
  });
});

describe('presetDefault', () => {
  it('builds the full default ruleset from the theme', () => {
    const preset = presetDefault({ theme });

    expect(preset.name).toBe('default');
    expect(preset.rules.display.responsive).toBe(true);
    expect(preset.rules.padding.values).toContainEqual(['4', '0.25rem']);
    expect(preset.rules.color.values).toContainEqual(['gray-500', '#737373']);
    expect(preset.rules.width.values).toContainEqual(['128', '8rem']);
    expect(preset.rules['border-radius'].values).toContainEqual(['small', '0.25rem']);
    expect(preset.rules['font-family'].values).toEqual([['body', 'var(--font-body)']]);
    expect(preset.rules['box-shadow'].values).toContainEqual([
      'small',
      '0 0.375rem 1.125rem 0 rgb(15 17 18 / 15%)',
    ]);
  });

  it('injects the static convenience tokens alongside theme tokens', () => {
    const { rules } = presetDefault({ theme });

    expect(rules.padding.values).toContainEqual(['0', '0']);
    expect(rules.margin.values).toContainEqual(['auto', 'auto']);
    expect(rules.width.values).toContainEqual(['100%', '100%']);
    expect(rules.color.values).toContainEqual(['inherit', 'inherit']);
    expect(rules['background-color'].values).toContainEqual(['transparent', 'transparent']);
  });

  it('leaves rules for missing theme slices empty instead of failing', () => {
    const { rules } = presetDefault({ theme: { breakpoints: { sm: '640px' } } });

    expect(rules['font-family'].values).toEqual([]);
    expect(rules.color.values).toEqual([['inherit', 'inherit']]);
    expect(rules.padding.values).toEqual([['0', '0']]);
  });

  it('drops excluded rules from the ruleset', () => {
    const { rules } = presetDefault({ theme, exclude: ['rotate', 'box-shadow'] });

    expect(rules).not.toHaveProperty('rotate');
    expect(rules).not.toHaveProperty('box-shadow');
    expect(rules).toHaveProperty('display');
  });

  it('contains all 70 rules when nothing is excluded', () => {
    expect(Object.keys(presetDefault({ theme }).rules)).toHaveLength(70);
  });

  it('drops whole groups via excludeGroups', () => {
    const { rules } = presetDefault({ theme, excludeGroups: ['spacing'] });

    expect(Object.keys(rules)).toHaveLength(70 - 17);
    expect(rules).not.toHaveProperty('padding');
    expect(rules).not.toHaveProperty('margin-inline');
    expect(rules).not.toHaveProperty('gap');
    expect(rules).toHaveProperty('display');
    expect(rules).toHaveProperty('width');
  });

  it('combines excludeGroups with individual excludes', () => {
    const { rules } = presetDefault({
      theme,
      excludeGroups: ['spacing', 'grid'],
      exclude: ['rotate'],
    });

    expect(rules).not.toHaveProperty('padding');
    expect(rules).not.toHaveProperty('grid-column');
    expect(rules).not.toHaveProperty('rotate');
    expect(rules).toHaveProperty('box-shadow');
    expect(rules).toHaveProperty('width');
  });

  it('drops excluded groups from the inferred types too', () => {
    const config = defineConfig({
      theme,
      presets: [presetDefault({ theme, excludeGroups: ['spacing'], exclude: ['rotate'] })],
    });

    type D = XStyleDeclarationFor<typeof config>;

    expectTypeOf<'padding' extends keyof D ? true : false>().toEqualTypeOf<false>();
    expectTypeOf<'gap' extends keyof D ? true : false>().toEqualTypeOf<false>();
    expectTypeOf<'rotate' extends keyof D ? true : false>().toEqualTypeOf<false>();
    expectTypeOf<'display' extends keyof D ? true : false>().toEqualTypeOf<true>();
    expect(config).toBeDefined();
  });

  it('keeps every grouped rule present in the flat ruleset', () => {
    // If a group is dropped from buildDefaultRules' flatten spread, its rule
    // names fall out of DefaultRuleName and this stops being `never`.
    expectTypeOf<
      Exclude<RuleNamesInGroups<DefaultGroupName>, DefaultRuleName>
    >().toEqualTypeOf<never>();
  });

  it('rejects unknown names and group/rule mixups at compile time', () => {
    // @ts-expect-error -- not a rule name
    presetDefault({ theme, exclude: ['nope'] });
    // @ts-expect-error -- not a group name
    presetDefault({ theme, excludeGroups: ['nope'] });
    // @ts-expect-error -- group names don't belong in `exclude`
    presetDefault({ theme, exclude: ['spacing'] });
    // @ts-expect-error -- rule names don't belong in `excludeGroups`
    presetDefault({ theme, excludeGroups: ['padding'] });
    expect(true).toBe(true);
  });

  it('drops excluded rules from the inferred types too', () => {
    const config = defineConfig({
      theme,
      presets: [presetDefault({ theme, exclude: ['rotate'] })],
    });

    type D = XStyleDeclarationFor<typeof config>;

    expectTypeOf<'rotate' extends keyof D ? true : false>().toEqualTypeOf<false>();
    expectTypeOf<'display' extends keyof D ? true : false>().toEqualTypeOf<true>();
    expect(config).toBeDefined();
  });

  it('infers token unions from the theme', () => {
    const config = defineConfig({ theme, presets: [presetDefault({ theme })] });

    type D = XStyleDeclarationFor<typeof config>;

    expectTypeOf<D['padding']>().toEqualTypeOf<'0' | '4' | '8' | false | null | undefined>();
    expectTypeOf<D['color']>().toEqualTypeOf<
      'inherit' | 'gray-500' | 'white' | false | null | undefined
    >();
    expect(config).toBeDefined();
  });

  it('generates CSS through resolveConfig without errors, in both naming modes', () => {
    const config = { theme, presets: [presetDefault({ theme })] };

    const readable = generateCSS(resolveConfig({ ...config, classNames: 'readable' as const }));

    expect(readable).toContain('.xs-display-flex{display:flex}');
    expect(readable).toContain('.xs-padding-4{padding:0.25rem}');
    expect(readable).toContain('.xs-color-gray-500{color:#737373}');
    expect(readable).toContain('@media (min-width:640px){');
    expect(readable).toContain('.xs-display-flex\\@sm{display:flex}');

    expect(() => generateCSS(resolveConfig(config))).not.toThrow();
  });
});
