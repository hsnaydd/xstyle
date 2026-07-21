import { describe, expect, it } from 'vitest';
import { resolveConfig } from '../config/resolve-config';
import { generateCSS } from './generate-css';

import type { XStyleUserConfig } from '../config/types';

const theme = {
  breakpoints: { sm: '640px', md: '768px', lg: '1024px' },
};

// Structural tests use `readable` naming so the assertions stay legible; the
// hashed wire format is pinned separately below. `presets: []` opts out of
// the auto-injected default preset so only the rules under test are emitted.
function readableCSS(config: Omit<XStyleUserConfig, 'theme' | 'classNames'>): string {
  return generateCSS(resolveConfig({ theme, classNames: 'readable', presets: [], ...config }));
}

describe('generateCSS', () => {
  it('generates correct CSS for simple values', () => {
    const css = readableCSS({
      rules: { display: { property: 'display', values: ['flex', 'block'] } },
    });

    expect(css).toContain('.xs-display-flex{display:flex}');
    expect(css).toContain('.xs-display-block{display:block}');
  });

  it('generates correct CSS for named values', () => {
    const css = readableCSS({
      rules: { rotate: { property: 'transform', values: [['45deg', 'rotate(45deg)']] } },
    });

    expect(css).toContain('.xs-rotate-45deg{transform:rotate(45deg)}');
  });

  it('generates correct CSS for mixed simple and named values', () => {
    const css = readableCSS({
      rules: { rotate: { property: 'transform', values: ['none', ['45deg', 'rotate(45deg)']] } },
    });

    expect(css).toContain('.xs-rotate-none{transform:none}');
    expect(css).toContain('.xs-rotate-45deg{transform:rotate(45deg)}');
  });

  it('escapes % in selectors but keeps it in values', () => {
    const css = readableCSS({
      rules: { width: { property: 'width', values: ['100%'] } },
    });

    expect(css).toContain('.xs-width-100\\%{width:100%}');
  });

  it('escapes . in selectors so fractional tokens match their class', () => {
    const css = readableCSS({
      rules: { margin: { property: 'margin', values: [['0.5', '0.125rem']] } },
    });

    expect(css).toContain('.xs-margin-0\\.5{margin:0.125rem}');
  });

  it('generates one rule per value', () => {
    const css = readableCSS({
      rules: {
        display: { property: 'display', values: ['flex', 'block'] },
        position: { property: 'position', values: ['relative'] },
      },
    });

    expect(css).toContain('@layer utilities {');
    const ruleCount = (css.match(/\.xs-/g) || []).length;
    expect(ruleCount).toBe(3);
  });

  it('emits a base rule alongside min-width media variants for responsive styles', () => {
    const css = readableCSS({
      rules: { display: { property: 'display', responsive: ['md'], values: ['block'] } },
    });

    expect(css).toContain('.xs-display-block{display:block}');
    expect(css).toContain('@media (min-width:768px){');
    expect(css).toContain('.xs-display-block\\@md{display:block}');
  });

  it('does not emit media variants for non-responsive styles', () => {
    const css = readableCSS({
      rules: { display: { property: 'display', values: ['block'] } },
    });

    expect(css).not.toContain('@media');
  });

  it('groups every value of a breakpoint into a single media query', () => {
    const css = readableCSS({
      rules: {
        display: { property: 'display', responsive: ['md'], values: ['block', 'flex'] },
        'flex-wrap': { property: 'flex-wrap', responsive: ['md'], values: ['wrap'] },
      },
    });

    expect(css.match(/@media \(min-width:768px\)/g) ?? []).toHaveLength(1);
    expect(css).toContain('.xs-display-block\\@md{display:block}');
    expect(css).toContain('.xs-display-flex\\@md{display:flex}');
    expect(css).toContain('.xs-flex-wrap-wrap\\@md{flex-wrap:wrap}');
  });

  it('orders media blocks ascending by min-width even when a rule lists them out of order', () => {
    const css = readableCSS({
      rules: { display: { property: 'display', responsive: ['lg', 'sm'], values: ['block'] } },
    });

    expect(css.indexOf('min-width:1024px')).toBeGreaterThan(css.indexOf('min-width:640px'));
  });

  it('resolves responsive: true to every theme breakpoint', () => {
    const css = readableCSS({
      rules: { display: { property: 'display', responsive: true, values: ['block'] } },
    });

    for (const min of [640, 768, 1024]) {
      expect(css).toContain(`@media (min-width:${min}px){`);
    }
  });

  it('wraps in the configured layer and omits the wrapper for `layer: false`', () => {
    const rules = { display: { property: 'display', values: ['flex'] } } as const;

    expect(
      generateCSS(resolveConfig({ theme, presets: [], rules, layer: 'components' })),
    ).toContain('@layer components {');
    expect(generateCSS(resolveConfig({ theme, presets: [], rules, layer: false }))).not.toContain(
      '@layer',
    );
  });

  it('uses the configured prefix', () => {
    const css = readableCSS({
      prefix: 'u-',
      rules: { display: { property: 'display', values: ['flex'] } },
    });

    expect(css).toContain('.u-display-flex{display:flex}');
  });
});

describe('generateCSS output format', () => {
  const fixture: XStyleUserConfig = {
    theme: { breakpoints: { sm: '640px', md: '768px' } },
    presets: [],
    rules: {
      display: { property: 'display', responsive: true, values: ['flex'] },
      width: { property: 'width', values: ['100%'] },
      rotate: { property: 'transform', values: [['45deg', 'rotate(45deg)']] },
    },
  };

  it('pins the full readable-mode output', () => {
    const css = generateCSS(resolveConfig({ ...fixture, classNames: 'readable' }));

    expect(css).toBe(
      `@layer utilities {
.xs-display-flex{display:flex}
.xs-width-100\\%{width:100%}
.xs-rotate-45deg{transform:rotate(45deg)}
@media (min-width:640px){
.xs-display-flex\\@sm{display:flex}
}
@media (min-width:768px){
.xs-display-flex\\@md{display:flex}
}
}
`,
    );
  });

  it('pins the full hashed-mode output', () => {
    const css = generateCSS(resolveConfig(fixture));

    expect(css).toBe(
      `@layer utilities {
.xs-90lrz9{display:flex}
.xs-pclztm{width:100%}
.xs-7yma9i{transform:rotate(45deg)}
@media (min-width:640px){
.xs-3yuzej{display:flex}
}
@media (min-width:768px){
.xs-3yuz58{display:flex}
}
}
`,
    );
  });
});

describe('generateCSS collision detection', () => {
  // Pinned pair from class-name.test.ts: both keys hash to "7lx3cb" with an
  // empty salt.
  const collidingRules = {
    color: { property: 'color', values: ['t579045'] },
    height: { property: 'height', values: ['t591014'] },
  } as const;

  it('fails on a hash collision, reporting both keys and suggesting hashSalt', () => {
    let message = '';

    try {
      generateCSS(resolveConfig({ theme, presets: [], rules: collidingRules }));
    } catch (error) {
      message = (error as Error).message;
    }

    expect(message).toContain('xstyle CSS generation failed:');
    expect(message).toContain('color-t579045');
    expect(message).toContain('height-t591014');
    expect(message).toContain('xs-7lx3cb');
    expect(message).toContain('hashSalt');
  });

  it('resolves the collision when hashSalt changes', () => {
    expect(() =>
      generateCSS(resolveConfig({ theme, presets: [], rules: collidingRules, hashSalt: 'v2' })),
    ).not.toThrow();
  });

  it('does not collide in readable mode', () => {
    expect(() =>
      generateCSS(
        resolveConfig({ theme, presets: [], rules: collidingRules, classNames: 'readable' }),
      ),
    ).not.toThrow();
  });

  it('fails when two rule/token pairs serialize to the same key, in any mode', () => {
    const ambiguousRules = {
      border: { property: 'border', values: [['top-0', '0']] },
      'border-top': { property: 'border-top', values: ['0'] },
    } as const;

    for (const classNames of ['hashed', 'readable'] as const) {
      expect(() =>
        generateCSS(resolveConfig({ theme, presets: [], rules: ambiguousRules, classNames })),
      ).toThrow(
        /Ambiguous key "border-top-0": rule "border" token "top-0" and rule "border-top" token "0"/,
      );
    }
  });
});
