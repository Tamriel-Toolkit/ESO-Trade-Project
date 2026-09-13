// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('../styles/tokens.css', import.meta.url), 'utf8');
const token = name => css.match(new RegExp(`--${name}: (#[0-9a-f]{6});`, 'i'))?.[1];
const luminance = hex => {
  const values = hex.match(/[0-9a-f]{2}/gi).map(v => parseInt(v, 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
  return values[0] * .2126 + values[1] * .7152 + values[2] * .0722;
};
const contrast = (a, b) => {
  const values = [luminance(token(a)), luminance(token(b))].sort((x, y) => y - x);
  return (values[0] + .05) / (values[1] + .05);
};

describe('Gilded Exchange token contract', () => {
  it.each(['background', 'card', 'recess', 'secondary'])('keeps body, metadata, gold, and error text readable on %s', background => {
    for (const foreground of ['foreground', 'muted-foreground', 'primary', 'destructive']) {
      expect(contrast(foreground, background), `${foreground} on ${background}`).toBeGreaterThanOrEqual(4.5);
    }
  });
  it('keeps primary-button text and essential input/focus boundaries distinct', () => {
    expect(contrast('primary-foreground', 'primary')).toBeGreaterThanOrEqual(4.5);
    for (const background of ['background', 'card', 'recess', 'secondary']) {
      expect(contrast('input', background)).toBeGreaterThanOrEqual(3);
      expect(contrast('ring', background)).toBeGreaterThanOrEqual(3);
    }
  });
  it('serves the existing heading family locally and keeps reduced-motion feedback', () => {
    expect(css).toContain("url('/fonts/cinzel-latin-400-normal.woff2')");
    expect(css).toContain("url('/fonts/cinzel-latin-600-normal.woff2')");
    const globalStyles = readFileSync(new URL('../index.css', import.meta.url), 'utf8');
    expect(globalStyles).toContain('prefers-reduced-motion: reduce');
    expect(globalStyles).toContain(':focus-visible');
  });
});
