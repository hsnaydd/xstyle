import { toNamedValues } from '../to-named-values';

import type { Theme, TokenScale } from '../../config/types';

type ScaleKey = 'colors' | 'space' | 'size' | 'radius' | 'fonts' | 'shadows';

// A missing theme slice resolves to the empty scale (no tokens), both at the
// value and the type level, so every rule below can spread it unconditionally.
type ScaleOf<T extends Theme, K extends ScaleKey> = T[K] extends TokenScale
  ? T[K]
  : Record<never, string>;

function scaleOf<T extends Theme, K extends ScaleKey>(theme: T, key: K): ScaleOf<T, K> {
  return (theme[key] ?? {}) as ScaleOf<T, K>;
}

/**
 * The default rules organized into named groups — `presetDefault`'s
 * `excludeGroups` drops a whole group at once. Group names must not be
 * confused with rule names: the two live in separate option props.
 * The full group → rules reference lives in ./README.md.
 */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types -- the inferred literal return type IS the contract; writing it out would defeat the inference
export function buildDefaultRuleGroups<const T extends Theme>(theme: T) {
  const colorScale = scaleOf(theme, 'colors');
  const fontScale = scaleOf(theme, 'fonts');
  const shadowScale = scaleOf(theme, 'shadows');

  const spaceTokens = { '0': '0', ...scaleOf(theme, 'space') };
  const sizeTokens = {
    '100%': '100%',
    'min-content': 'min-content',
    'max-content': 'max-content',
    'fit-content': 'fit-content',
    ...scaleOf(theme, 'size'),
  };
  const marginTokens = { auto: 'auto', ...spaceTokens };
  const radiusTokens = { '0': '0', ...scaleOf(theme, 'radius') };

  return {
    layout: {
      display: {
        property: 'display',
        responsive: true,
        values: [
          'block',
          'inline',
          'inline-block',
          'flex',
          'inline-flex',
          'grid',
          'inline-grid',
          'none',
          'contents',
        ],
      },
      position: {
        property: 'position',
        values: ['static', 'relative', 'absolute', 'sticky', 'fixed'],
      },
      top: {
        property: 'top',
        values: ['0', 'auto'],
      },
      right: {
        property: 'right',
        values: ['0', 'auto'],
      },
      bottom: {
        property: 'bottom',
        values: ['0', 'auto'],
      },
      left: {
        property: 'left',
        values: ['0', 'auto'],
      },
      overflow: {
        property: 'overflow',
        values: ['visible', 'hidden', 'auto'],
      },
      'overflow-x': {
        property: 'overflow-x',
        values: ['visible', 'hidden', 'auto'],
      },
      'overflow-y': {
        property: 'overflow-y',
        values: ['visible', 'hidden', 'auto'],
      },
      'object-fit': {
        property: 'object-fit',
        values: ['fill', 'contain', 'cover', 'none', 'scale-down'],
      },
      visibility: {
        property: 'visibility',
        values: ['visible', 'hidden'],
      },
    },
    flexbox: {
      flex: {
        property: 'flex',
        values: ['1', '2'],
      },
      'flex-basis': {
        property: 'flex-basis',
        values: ['auto', '0', '100%'],
      },
      'flex-grow': {
        property: 'flex-grow',
        values: ['0', '1'],
      },
      'flex-shrink': {
        property: 'flex-shrink',
        values: ['0', '1'],
      },
      'flex-direction': {
        property: 'flex-direction',
        responsive: true,
        values: ['row', 'row-reverse', 'column', 'column-reverse'],
      },
      'flex-wrap': {
        property: 'flex-wrap',
        responsive: true,
        values: ['wrap', 'wrap-reverse', 'nowrap'],
      },
      'justify-content': {
        property: 'justify-content',
        responsive: true,
        values: [
          'flex-start',
          'center',
          'flex-end',
          'space-between',
          'space-around',
          'space-evenly',
        ],
      },
      'justify-self': {
        property: 'justify-self',
        values: ['auto', 'flex-start', 'center', 'flex-end', 'stretch', 'start', 'end'],
      },
      'align-items': {
        property: 'align-items',
        responsive: true,
        values: ['flex-start', 'center', 'flex-end', 'stretch', 'baseline'],
      },
      'align-self': {
        property: 'align-self',
        values: ['auto', 'flex-start', 'center', 'flex-end', 'stretch', 'start', 'end'],
      },
    },
    grid: {
      'grid-column': {
        property: 'grid-column',
        values: ['auto', '1/-1'],
      },
    },
    spacing: {
      margin: {
        property: 'margin',
        values: toNamedValues(marginTokens),
      },
      'margin-top': {
        property: 'margin-top',
        values: toNamedValues(marginTokens),
      },
      'margin-bottom': {
        property: 'margin-bottom',
        values: toNamedValues(marginTokens),
      },
      'margin-left': {
        property: 'margin-left',
        values: toNamedValues(marginTokens),
      },
      'margin-right': {
        property: 'margin-right',
        values: toNamedValues(marginTokens),
      },
      'margin-inline': {
        property: 'margin-inline',
        values: toNamedValues(marginTokens),
      },
      'margin-block': {
        property: 'margin-block',
        values: toNamedValues(marginTokens),
      },
      padding: {
        property: 'padding',
        values: toNamedValues(spaceTokens),
      },
      'padding-top': {
        property: 'padding-top',
        values: toNamedValues(spaceTokens),
      },
      'padding-bottom': {
        property: 'padding-bottom',
        values: toNamedValues(spaceTokens),
      },
      'padding-left': {
        property: 'padding-left',
        values: toNamedValues(spaceTokens),
      },
      'padding-right': {
        property: 'padding-right',
        values: toNamedValues(spaceTokens),
      },
      'padding-inline': {
        property: 'padding-inline',
        values: toNamedValues(spaceTokens),
      },
      'padding-block': {
        property: 'padding-block',
        values: toNamedValues(spaceTokens),
      },
      gap: {
        property: 'gap',
        responsive: true,
        values: toNamedValues(spaceTokens),
      },
      'row-gap': {
        property: 'row-gap',
        values: toNamedValues(spaceTokens),
      },
      'column-gap': {
        property: 'column-gap',
        values: toNamedValues(spaceTokens),
      },
    },
    sizing: {
      width: {
        property: 'width',
        values: toNamedValues({
          auto: 'auto',
          '1%': '1%',
          ...sizeTokens,
        }),
      },
      'max-width': {
        property: 'max-width',
        values: toNamedValues({ none: 'none', '0': '0', ...sizeTokens }),
      },
      'min-width': {
        property: 'min-width',
        values: toNamedValues({ auto: 'auto', '0': '0', ...sizeTokens }),
      },
      height: {
        property: 'height',
        values: toNamedValues({
          auto: 'auto',
          '100vh': '100vh',
          ...sizeTokens,
        }),
      },
      'max-height': {
        property: 'max-height',
        values: toNamedValues({ none: 'none', ...sizeTokens }),
      },
      'min-height': {
        property: 'min-height',
        values: toNamedValues({ auto: 'auto', '0': '0', ...sizeTokens }),
      },
    },
    typography: {
      'font-family': {
        property: 'font-family',
        values: toNamedValues(fontScale),
      },
      'font-weight': {
        property: 'font-weight',
        values: ['300', '400', '500', '600', '700', '900'],
      },
      'text-align': {
        property: 'text-align',
        values: ['left', 'right', 'center', 'justify'],
      },
      'text-transform': {
        property: 'text-transform',
        values: ['none', 'lowercase', 'uppercase', 'capitalize'],
      },
      'text-decoration': {
        property: 'text-decoration',
        values: ['none', 'underline'],
      },
      'text-wrap': {
        property: 'text-wrap',
        values: ['wrap', 'nowrap', 'balance', 'pretty', 'stable'],
      },
      'white-space': {
        property: 'white-space',
        values: ['normal', 'nowrap', 'pre-line'],
      },
      'overflow-wrap': {
        property: 'overflow-wrap',
        values: ['normal', 'break-word'],
      },
      hyphens: {
        property: 'hyphens',
        values: ['none', 'manual', 'auto'],
      },
      'list-style': {
        property: 'list-style',
        values: ['disc', 'none'],
      },
      'vertical-align': {
        property: 'vertical-align',
        values: ['top', 'bottom', 'middle', 'baseline', 'text-bottom'],
      },
    },
    colors: {
      color: {
        property: 'color',
        values: toNamedValues({ inherit: 'inherit', ...colorScale }),
      },
      'background-color': {
        property: 'background-color',
        values: toNamedValues({
          transparent: 'transparent',
          currentcolor: 'currentcolor',
          ...colorScale,
        }),
      },
    },
    borders: {
      border: {
        property: 'border',
        values: ['0', ['1px-solid', '1px solid']],
      },
      'border-top': {
        property: 'border-top',
        values: ['0'],
      },
      'border-right': {
        property: 'border-right',
        values: ['0'],
      },
      'border-bottom': {
        property: 'border-bottom',
        values: ['0'],
      },
      'border-left': {
        property: 'border-left',
        values: ['0'],
      },
      'border-color': {
        property: 'border-color',
        values: toNamedValues({ transparent: 'transparent', ...colorScale }),
      },
      'border-radius': {
        property: 'border-radius',
        values: toNamedValues(radiusTokens),
      },
    },
    effects: {
      'box-shadow': {
        property: 'box-shadow',
        values: ['none', ...toNamedValues(shadowScale)],
      },
      rotate: {
        property: 'transform',
        values: [
          'none',
          ['45deg', 'rotate(45deg)'],
          ['90deg', 'rotate(90deg)'],
          ['180deg', 'rotate(180deg)'],
          ['-45deg', 'rotate(-45deg)'],
          ['-90deg', 'rotate(-90deg)'],
          ['-180deg', 'rotate(-180deg)'],
        ],
      },
    },
    interactivity: {
      cursor: {
        property: 'cursor',
        values: ['auto', 'default', 'pointer'],
      },
      'pointer-events': {
        property: 'pointer-events',
        values: ['auto', 'none'],
      },
      'user-select': {
        property: 'user-select',
        values: ['auto', 'none'],
      },
    },
  } as const;
}

/**
 * The default ruleset, parameterized by the user's theme — the groups above
 * flattened into the single flat shape everything downstream consumes. The
 * token names stay literal end-to-end: the return type is inferred from the
 * theme's literal types (`as const` at the call site) — no annotations, no
 * codegen.
 */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types -- the inferred literal return type IS the contract; writing it out would defeat the inference
export function buildDefaultRules<const T extends Theme>(theme: T) {
  const groups = buildDefaultRuleGroups(theme);

  return {
    ...groups.layout,
    ...groups.flexbox,
    ...groups.grid,
    ...groups.spacing,
    ...groups.sizing,
    ...groups.typography,
    ...groups.colors,
    ...groups.borders,
    ...groups.effects,
    ...groups.interactivity,
  } as const;
}
