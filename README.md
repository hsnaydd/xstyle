# xstyle

A config-driven style engine that converts typed style objects into atomic CSS classes.

You describe your design tokens once in `xstyle.config.ts`. xstyle pre-generates every utility class at build time (CLI or Vite plugin) and gives you a fully typed `css()` function that only assembles class names at runtime — no runtime CSS injection, no arbitrary values, no type codegen.

```tsx
const { css } = createXStyle(config);

css({ display: 'flex', gap: '16', '@md': { gap: '32' } });
// → "xs-a1b2c3 xs-d4e5f6 xs-g7h8i9"
```

## How it works

One key grammar — `styleName-token[@breakpoint]` — is the single contract between build time and runtime. Class names are derived from keys by a pure function, so the CSS generator and the runtime can never drift apart and there is no mapping to ship.

- **`hashed` mode (default):** `xs-` + 6-char hash of the key (e.g. `xs-4f2a1b`)
- **`readable` mode:** `xs-` + the key itself (e.g. `xs-display-flex`, `xs-padding-24@md`)

## Setup

```bash
pnpm add @hsnaydd/xstyle
```

Requires Node.js `^22.22.0` or `>=24`.

Create `xstyle.config.ts` in your project root. The smallest possible config
uses the built-in `defaultTheme` (a neutral gray palette plus spacing, sizing
and radius scales) as is:

```ts
import { defineConfig } from '@hsnaydd/xstyle';

export default defineConfig({});
```

Providing your own `theme` replaces the default **wholesale** — nothing is
merged. To keep the defaults and extend them, spread `defaultTheme` explicitly:

```ts
import { defaultTheme, defineConfig } from '@hsnaydd/xstyle';

export default defineConfig({
  theme: {
    ...defaultTheme,
    colors: { ...defaultTheme.colors, brand: '#03ffa2' },
  },
});
```

A full custom config:

```ts
import { defineConfig, presetDefault } from '@hsnaydd/xstyle';

const theme = {
  // name → min-width. The base tier has no name and no media query.
  breakpoints: { sm: '640px', md: '768px', lg: '1024px', xl: '1280px' },
  // read by presets: colors, space, size, radius, fonts, shadows
  colors: { 'gray-500': '#737373', white: '#fff' },
  space: { 4: '0.25rem', 8: '0.5rem', 16: '1rem', 24: '1.5rem', 32: '2rem' },
  size: { 128: '8rem', 256: '16rem' },
  radius: { small: '0.25rem', large: '1rem' },
  fonts: { body: 'var(--font-body)' },
  shadows: { small: '0 0.375rem 1.125rem 0 rgb(15 17 18 / 15%)' },
} as const;

export default defineConfig({
  theme,
  // optional — omitting `presets` auto-applies presetDefault({ theme });
  // define it to customize (excludeGroups / exclude) or opt out with []
  presets: [presetDefault({ theme, excludeGroups: ['grid'], exclude: ['rotate'] })],
  rules: {
    // extra rules and preset overrides — last wins, a rule replaces as a whole
    'grid-column': { property: 'grid-column', values: ['auto', '1/-1'] },
  },
});
```

> **Note:** breakpoint min-widths are compared numerically, so every breakpoint
> must use the same unit — `{ sm: '640px', md: '40em' }` cannot be sorted and
> fails config validation. Convert to one unit instead (`'40em'` → `'640px'`).
>
> **Warning:** never annotate the config or the theme with a type
> (`const config: XStyleUserConfig = …`). The annotation widens all literal
> types and kills token autocomplete. `defineConfig` and `as const` preserve
> them; that is the whole typing story.

Then create the runtime somewhere central and use it:

```ts
// styles.ts
import { createXStyle } from '@hsnaydd/xstyle';
import config from '../xstyle.config';

export const { css } = createXStyle(config);
```

Every style name, token, and breakpoint in `css()` is inferred from your config — typos are compile errors, including breakpoint names in `responsive` lists.

## Generating the CSS

### CLI

```bash
xstyle build            # discover xstyle.config.{ts,mts,js,mjs,cjs}, write the CSS
xstyle watch            # rebuild when the config or its local imports change
xstyle build -c ./path/to/xstyle.config.ts -o ./styles/xstyle.css
```

Output precedence: `-o` flag → `output` in the config (resolved relative to the config file) → `./xstyle.generated.css`. Add the generated file to `.gitignore` and import it from a global entry point.

**Next.js / Turbopack:** the Vite plugin cannot run inside the app build — use the CLI instead, from the `package.json` scripts:

```json
{
  "scripts": {
    "predev": "xstyle build",
    "prebuild": "xstyle build"
  }
}
```

```ts
// app/layout.tsx
import '../xstyle.generated.css';
```

While actively editing the config, run `xstyle watch` in a second terminal.

### Vite plugin

```ts
// vite.config.ts
import xstyle from '@hsnaydd/xstyle/vite';

export default defineConfig({
  plugins: [xstyle()],
});
```

```ts
// app entry point
import 'virtual:xstyle.css';
```

The plugin serves the generated CSS through Vite's own CSS pipeline (postcss, extraction, minification). Config changes trigger a rebuild and a full reload; a broken config shows the error overlay and keeps serving the last valid CSS.

## Configuration reference

| Option       | Default                    | Description                                                      |
| ------------ | -------------------------- | ---------------------------------------------------------------- |
| `theme`      | `defaultTheme`             | `breakpoints` + token scales read by presets; replaced wholesale |
| `presets`    | `[presetDefault({theme})]` | Preset list; merged in order, later rules win. `[]` opts out     |
| `rules`      | `{}`                       | Extra rules / overrides; wins over presets, replaces whole rules |
| `classNames` | `'hashed'`                 | `'hashed'` or `'readable'`                                       |
| `prefix`     | `'xs-'`                    | Class name prefix                                                |
| `layer`      | `'utilities'`              | `@layer` wrapper name, or `false` for none                       |
| `hashSalt`   | `''`                       | Change to resolve a hash collision (hashed mode only)            |
| `output`     | `'./xstyle.generated.css'` | CLI output path, resolved relative to the config file            |

On a hash collision the generator fails loudly, reporting both colliding keys; changing `hashSalt` resolves it.

### Rules

A rule maps a style name to a CSS property and its allowed values:

```ts
rules: {
  display: {
    property: 'display',
    responsive: true,            // true = all breakpoints, or a list: ['md', 'lg']
    values: ['flex', 'block'],   // plain values…
  },
  padding: {
    property: 'padding',
    values: [['4', '0.25rem'], ['8', '0.5rem']],  // …or [token, cssValue] pairs
  },
}
```

`responsive` controls how many variant classes are generated, so opt in deliberately for high-cardinality properties (e.g. `color`).

Naming rules, validated when the config resolves: style names are lowercase kebab-case with each segment starting with a letter (they round-trip through camelCase in `css()`); token names may contain any characters **except whitespace and `@`** — selectors are escaped at codegen time, so tokens like `100%`, `1/-1` and `0.5` are fine.

`toNamedValues()` converts a token record into named pairs while keeping the names literal — useful when writing presets:

```ts
import { toNamedValues } from '@hsnaydd/xstyle';

values: toNamedValues({ 4: '0.25rem', auto: 'auto' }); // [['4','0.25rem'], ['auto','auto']]
```

### The default preset

`presetDefault({ theme, exclude?, excludeGroups? })` builds 70 rules from your theme's scales, organized into ten groups:

| Group           | Contents                                                                    |
| --------------- | --------------------------------------------------------------------------- |
| `layout`        | display, position, top/right/bottom/left, overflow…, object-fit, visibility |
| `flexbox`       | flex…, justify-content/-self, align-items/-self                             |
| `grid`          | grid-column                                                                 |
| `spacing`       | margin…, padding…, gap… (from `theme.space`)                                |
| `sizing`        | width/height + min/max (from `theme.size`)                                  |
| `typography`    | font…, text…, white-space, hyphens, list-style, vertical-align              |
| `colors`        | color, background-color (from `theme.colors`)                               |
| `borders`       | border…, border-color, border-radius                                        |
| `effects`       | box-shadow (from `theme.shadows`), rotate                                   |
| `interactivity` | cursor, pointer-events, user-select                                         |

`excludeGroups` drops whole groups, `exclude` drops individual rules — both remove the rules from the generated CSS **and** from the inferred types. Note that `excludeGroups: ['flexbox']` also removes `justify-*`/`align-*`, which grid layouts use too. The full group → rules reference lives in [src/presets/default/README.md](src/presets/default/README.md).

When a config defines no `presets` at all, `presetDefault({ theme })` is applied automatically — a bare `theme` + `rules` config gets the full default ruleset plus its overrides. Pass `presets: []` to start from zero.

Presets are plain data (`{ name, rules }`); calling the factory inside the config is what lets the types flow through unbroken. Third-party presets should follow the same shape. Write the `presets` array as a literal — a dynamically built `Preset[]` widens the tuple and the inferred rule types are lost (the CSS still generates correctly).

## Runtime semantics

```ts
css({ display: 'flex' }); // base class
css({ '@md': { display: 'block' } }); // mobile-first: applies at md and up
css({ display: isOpen && 'flex' }); // false / null / undefined are skipped
css([base, override]); // later objects win per property
```

When merging an array, breakpoint blocks merge per property too — they don't replace each other wholesale:

```ts
css([{ '@md': { display: 'flex' } }, { '@md': { gap: '16' } }]);
// → display@md AND gap@md both apply
```

In development, `css()` validates keys against the config and warns once per unknown key without emitting a class. In production the derivation runs unchecked — the type system already guards the inputs.

## Development

```bash
pnpm test    # Vitest
pnpm lint    # eslint + tsc
pnpm build   # Vite library build → dist/
```
