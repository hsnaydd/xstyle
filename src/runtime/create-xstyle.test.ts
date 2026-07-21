import { afterEach, describe, expect, it, vi } from 'vitest';
import { createXStyle } from './create-xstyle';

// The tsconfig loads no DOM/Node globals; type the real global we spy on.
declare const console: { warn: (message: string) => void };

// Adapted from the old `css.test.ts` — same semantics, but class names now
// come from the pure derivation (readable mode here) instead of a CSS module.
const config = {
  theme: { breakpoints: { sm: '640px', md: '768px', lg: '1024px' } },
  classNames: 'readable',
  presets: [],
  rules: {
    display: { property: 'display', responsive: true, values: ['flex', 'block'] },
    'justify-content': {
      property: 'justify-content',
      responsive: true,
      values: ['flex-end', 'center'],
    },
    'align-items': { property: 'align-items', values: ['center'] },
    'align-self': { property: 'align-self', values: ['center'] },
    color: { property: 'color', values: [['black', '#000']] },
    'background-color': { property: 'background-color', values: [['black', '#000']] },
    'flex-basis': { property: 'flex-basis', values: ['100%'] },
  },
} as const;

const { css } = createXStyle(config);

describe('css function', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('renders correctly with defaults', () => {
    expect(css({})).toBe('');
  });

  it('should return correct classes', () => {
    const classes = css({ display: 'flex', justifyContent: 'flex-end' });

    expect(classes).toBe('xs-display-flex xs-justify-content-flex-end');
  });

  it('should accept array declarations', () => {
    const classes = css([
      { display: 'flex', justifyContent: 'flex-end' },
      { alignItems: 'center', color: 'black' },
    ]);

    expect(classes).toBe(
      'xs-display-flex xs-justify-content-flex-end xs-align-items-center xs-color-black',
    );
  });

  it('should merge given declarations', () => {
    const classes = css([
      { display: 'flex', justifyContent: 'flex-end' },
      { display: 'block', color: 'black' },
    ]);

    expect(classes).not.toContain('xs-display-flex');
    expect(classes).toContain('xs-justify-content-flex-end');
    expect(classes).toContain('xs-display-block');
    expect(classes).toContain('xs-color-black');
  });

  it('should merge breakpoint blocks per property across array declarations', () => {
    const classes = css([{ '@md': { display: 'flex' } }, { '@md': { justifyContent: 'center' } }]);

    expect(classes).toBe('xs-display-flex@md xs-justify-content-center@md');
  });

  it('should let a later breakpoint block win per property, keeping the rest', () => {
    const classes = css([
      { '@md': { display: 'flex', justifyContent: 'flex-end' } },
      { '@md': { display: 'block' } },
    ]);

    expect(classes).toBe('xs-display-block@md xs-justify-content-flex-end@md');
  });

  it('should ignore falsy values', () => {
    const classes = css({
      display: undefined,
      alignSelf: false,
      backgroundColor: null,
      justifyContent: 'flex-end',
    });

    expect(classes).toBe('xs-justify-content-flex-end');
  });

  it('should handle values with special characters, unescaped', () => {
    const classes = css({ flexBasis: '100%' });

    expect(classes).toBe('xs-flex-basis-100%');
  });

  it('should resolve breakpoint blocks to suffixed classes', () => {
    const classes = css({ display: 'flex', '@md': { display: 'block' } });

    expect(classes).toBe('xs-display-flex xs-display-block@md');
  });

  it('should merge base and multiple breakpoint blocks', () => {
    const classes = css({
      display: 'flex',
      '@sm': { display: 'block' },
      '@lg': { justifyContent: 'center' },
    });

    expect(classes).toBe('xs-display-flex xs-display-block@sm xs-justify-content-center@lg');
  });

  it('should ignore a breakpoint block whose value is not a plain object', () => {
    // Bypasses the types to mimic an untyped consumer passing a malformed value.
    const classes = css({ display: 'flex', '@md': 'block' } as never);

    expect(classes).toBe('xs-display-flex');
  });

  it('produces hashed class names by default', () => {
    const hashed = createXStyle({
      theme: { breakpoints: { md: '768px' } },
      presets: [],
      rules: { display: { property: 'display', values: ['flex'] } },
    } as const);

    // Same wire format pinned in class-name.test.ts.
    expect(hashed.css({ display: 'flex' })).toBe('xs-90lrz9');
  });

  it('serves the auto-injected default preset when `presets` is omitted', () => {
    const { css: defaultCss } = createXStyle({
      theme: { breakpoints: { sm: '640px' }, space: { 4: '0.25rem' } },
      classNames: 'readable',
    } as const);

    expect(defaultCss({ padding: '4', display: 'flex' })).toBe('xs-padding-4 xs-display-flex');
  });
});

describe('css dev-mode validation', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('warns once for an unknown key and skips its class', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { css: devCss } = createXStyle(config);

    expect(devCss({ display: 'nope' } as never)).toBe('');
    expect(devCss({ display: 'nope' } as never)).toBe('');

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('display-nope'));
  });

  it('warns for a breakpoint block not in theme.breakpoints and skips it', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { css: devCss } = createXStyle(config);

    expect(devCss({ display: 'flex', '@xxl': { display: 'block' } } as never)).toBe(
      'xs-display-flex',
    );
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('@xxl'));
  });

  it('skips validation in production and derives classes unchecked', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { css: prodCss } = createXStyle(config);

    expect(prodCss({ display: 'nope' } as never)).toBe('xs-display-nope');
    expect(warn).not.toHaveBeenCalled();
  });
});
