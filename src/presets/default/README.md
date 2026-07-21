# Default preset

`presetDefault` builds xstyle's default ruleset (70 rules) from your theme. It is
auto-injected when a config defines no `presets`; call it yourself to customize:

```ts
import { defineConfig, presetDefault } from '@hsnaydd/xstyle';

export default defineConfig({
  theme,
  presets: [
    presetDefault({
      theme,
      excludeGroups: ['spacing', 'grid'], // drop whole groups
      exclude: ['rotate'], // drop individual rules
    }),
  ],
});
```

- `excludeGroups` takes **group names** (left column below), `exclude` takes
  **rule names** — the two namespaces never mix.
- Both work at runtime and at the type level: excluded rules disappear from the
  generated CSS *and* from `css()`'s inferred declaration type.
- Passing `presets: []` opts out of the whole default preset.

## Groups

Source of truth: `buildDefaultRuleGroups` in [rules.ts](./rules.ts). Keep this
table in sync when rules move between groups or are added/removed.

“Theme scale” is where a rule's tokens come from; rules without one only have
the fixed values listed. A missing theme scale leaves the rule with its static
tokens (or none), it never errors.

### `layout` (11 rules)

| Rule | CSS property | Theme scale | Values | Responsive |
| --- | --- | --- | --- | --- |
| `display` | `display` | — | `block`, `inline`, `inline-block`, `flex`, `inline-flex`, `grid`, `inline-grid`, `none`, `contents` | ✅ |
| `position` | `position` | — | `static`, `relative`, `absolute`, `sticky`, `fixed` | |
| `top` | `top` | — | `0`, `auto` | |
| `right` | `right` | — | `0`, `auto` | |
| `bottom` | `bottom` | — | `0`, `auto` | |
| `left` | `left` | — | `0`, `auto` | |
| `overflow` | `overflow` | — | `visible`, `hidden`, `auto` | |
| `overflow-x` | `overflow-x` | — | `visible`, `hidden`, `auto` | |
| `overflow-y` | `overflow-y` | — | `visible`, `hidden`, `auto` | |
| `object-fit` | `object-fit` | — | `fill`, `contain`, `cover`, `none`, `scale-down` | |
| `visibility` | `visibility` | — | `visible`, `hidden` | |

### `flexbox` (10 rules)

| Rule | CSS property | Theme scale | Values | Responsive |
| --- | --- | --- | --- | --- |
| `flex` | `flex` | — | `1`, `2` | |
| `flex-basis` | `flex-basis` | — | `auto`, `0`, `100%` | |
| `flex-grow` | `flex-grow` | — | `0`, `1` | |
| `flex-shrink` | `flex-shrink` | — | `0`, `1` | |
| `flex-direction` | `flex-direction` | — | `row`, `row-reverse`, `column`, `column-reverse` | ✅ |
| `flex-wrap` | `flex-wrap` | — | `wrap`, `wrap-reverse`, `nowrap` | ✅ |
| `justify-content` | `justify-content` | — | `flex-start`, `center`, `flex-end`, `space-between`, `space-around`, `space-evenly` | ✅ |
| `justify-self` | `justify-self` | — | `auto`, `flex-start`, `center`, `flex-end`, `stretch`, `start`, `end` | |
| `align-items` | `align-items` | — | `flex-start`, `center`, `flex-end`, `stretch`, `baseline` | ✅ |
| `align-self` | `align-self` | — | `auto`, `flex-start`, `center`, `flex-end`, `stretch`, `start`, `end` | |

### `grid` (1 rule)

| Rule | CSS property | Theme scale | Values | Responsive |
| --- | --- | --- | --- | --- |
| `grid-column` | `grid-column` | — | `auto`, `1/-1` | |

### `spacing` (17 rules)

| Rule | CSS property | Theme scale | Extra values | Responsive |
| --- | --- | --- | --- | --- |
| `margin` | `margin` | `space` | `0`, `auto` | |
| `margin-top` | `margin-top` | `space` | `0`, `auto` | |
| `margin-bottom` | `margin-bottom` | `space` | `0`, `auto` | |
| `margin-left` | `margin-left` | `space` | `0`, `auto` | |
| `margin-right` | `margin-right` | `space` | `0`, `auto` | |
| `margin-inline` | `margin-inline` | `space` | `0`, `auto` | |
| `margin-block` | `margin-block` | `space` | `0`, `auto` | |
| `padding` | `padding` | `space` | `0` | |
| `padding-top` | `padding-top` | `space` | `0` | |
| `padding-bottom` | `padding-bottom` | `space` | `0` | |
| `padding-left` | `padding-left` | `space` | `0` | |
| `padding-right` | `padding-right` | `space` | `0` | |
| `padding-inline` | `padding-inline` | `space` | `0` | |
| `padding-block` | `padding-block` | `space` | `0` | |
| `gap` | `gap` | `space` | `0` | ✅ |
| `row-gap` | `row-gap` | `space` | `0` | |
| `column-gap` | `column-gap` | `space` | `0` | |

### `sizing` (6 rules)

All sizing rules include the `size` scale plus `100%`, `min-content`,
`max-content`, `fit-content`.

| Rule | CSS property | Theme scale | Extra values | Responsive |
| --- | --- | --- | --- | --- |
| `width` | `width` | `size` | `auto`, `1%` | |
| `max-width` | `max-width` | `size` | `none`, `0` | |
| `min-width` | `min-width` | `size` | `auto`, `0` | |
| `height` | `height` | `size` | `auto`, `100vh` | |
| `max-height` | `max-height` | `size` | `none` | |
| `min-height` | `min-height` | `size` | `auto`, `0` | |

### `typography` (11 rules)

| Rule | CSS property | Theme scale | Values | Responsive |
| --- | --- | --- | --- | --- |
| `font-family` | `font-family` | `fonts` | — | |
| `font-weight` | `font-weight` | — | `300`, `400`, `500`, `600`, `700`, `900` | |
| `text-align` | `text-align` | — | `left`, `right`, `center`, `justify` | |
| `text-transform` | `text-transform` | — | `none`, `lowercase`, `uppercase`, `capitalize` | |
| `text-decoration` | `text-decoration` | — | `none`, `underline` | |
| `text-wrap` | `text-wrap` | — | `wrap`, `nowrap`, `balance`, `pretty`, `stable` | |
| `white-space` | `white-space` | — | `normal`, `nowrap`, `pre-line` | |
| `overflow-wrap` | `overflow-wrap` | — | `normal`, `break-word` | |
| `hyphens` | `hyphens` | — | `none`, `manual`, `auto` | |
| `list-style` | `list-style` | — | `disc`, `none` | |
| `vertical-align` | `vertical-align` | — | `top`, `bottom`, `middle`, `baseline`, `text-bottom` | |

### `colors` (2 rules)

| Rule | CSS property | Theme scale | Extra values | Responsive |
| --- | --- | --- | --- | --- |
| `color` | `color` | `colors` | `inherit` | |
| `background-color` | `background-color` | `colors` | `transparent`, `currentcolor` | |

### `borders` (7 rules)

| Rule | CSS property | Theme scale | Values | Responsive |
| --- | --- | --- | --- | --- |
| `border` | `border` | — | `0`, `1px-solid` → `1px solid` | |
| `border-top` | `border-top` | — | `0` | |
| `border-right` | `border-right` | — | `0` | |
| `border-bottom` | `border-bottom` | — | `0` | |
| `border-left` | `border-left` | — | `0` | |
| `border-color` | `border-color` | `colors` | `transparent` | |
| `border-radius` | `border-radius` | `radius` | `0` | |

### `effects` (2 rules)

| Rule | CSS property | Theme scale | Values | Responsive |
| --- | --- | --- | --- | --- |
| `box-shadow` | `box-shadow` | `shadows` | `none` | |
| `rotate` | `transform` | — | `none`, `45deg`, `90deg`, `180deg`, `-45deg`, `-90deg`, `-180deg` (each → `rotate(…)`) | |

### `interactivity` (3 rules)

| Rule | CSS property | Theme scale | Values | Responsive |
| --- | --- | --- | --- | --- |
| `cursor` | `cursor` | — | `auto`, `default`, `pointer` | |
| `pointer-events` | `pointer-events` | — | `auto`, `none` | |
| `user-select` | `user-select` | — | `auto`, `none` | |

## Grouping decisions

- **`gap`, `row-gap`, `column-gap` live in `spacing`**, not in a flex/grid
  group: their tokens come from `theme.space`, same as margin/padding.
- **`justify-*` / `align-*` live in `flexbox`** even though grid layouts use
  them too — `excludeGroups: ['flexbox']` removes them for grid as well.
- **`vertical-align` lives in `typography`**: it is an inline-level property,
  most relevant to text flow.
- **`rotate` lives in `effects`**: it targets `transform`, not a box property.
