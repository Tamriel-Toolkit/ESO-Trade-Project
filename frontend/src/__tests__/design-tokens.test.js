// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs';
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

const SURFACES = ['background', 'card', 'recess', 'secondary', 'surface-elevated'];
const FOREGROUNDS = [
  'foreground',
  'muted-foreground',
  'primary',
  'primary-hover',
  'destructive',
  'status-success',
  'status-warning',
  'status-info',
  'quality-normal',
  'quality-fine',
  'quality-superior',
  'quality-epic',
  'quality-legendary',
];

describe('Gilded Exchange token contract (#104)', () => {
  it.each(SURFACES)('keeps body, metadata, gold, status, and ESO quality text readable on %s', background => {
    for (const foreground of FOREGROUNDS) {
      expect(contrast(foreground, background), `${foreground} on ${background}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('keeps primary-button text and essential input/focus boundaries distinct', () => {
    expect(contrast('primary-foreground', 'primary')).toBeGreaterThanOrEqual(4.5);
    expect(contrast('primary-foreground', 'primary-hover')).toBeGreaterThanOrEqual(4.5);
    for (const background of ['background', 'card', 'recess', 'secondary']) {
      expect(contrast('input', background)).toBeGreaterThanOrEqual(3);
      expect(contrast('ring', background)).toBeGreaterThanOrEqual(3);
    }
  });

  it('exposes control-height, spacing, ESO quality, status, and alliance tokens in tokens.css and @theme inline', () => {
    for (const scaleToken of ['control-xs', 'control-sm', 'control-md', 'control-lg', 'space-1', 'space-2', 'space-3', 'space-4', 'space-6', 'space-8']) {
      expect(css).toContain(`--${scaleToken}:`);
    }
    for (const themeColor of [
      'color-quality-normal',
      'color-quality-fine',
      'color-quality-superior',
      'color-quality-epic',
      'color-quality-legendary',
      'color-status-success',
      'color-status-warning',
      'color-status-info',
      'color-alliance-ad',
      'color-alliance-ep',
      'color-alliance-dc',
      'color-surface-elevated',
      'color-border-accent',
      'color-border-subtle',
    ]) {
      expect(css).toContain(`--${themeColor}:`);
    }
  });

  it('enforces zero raw hex color literals across shared stylesheets and core UI primitives', () => {
    const styleFiles = ['../index.css', '../styles/exchange.css', '../styles/home.css', '../styles/marketplace.css', '../styles/requests-builds.css', '../styles/characters.css'];
    for (const relPath of styleFiles) {
      const content = readFileSync(new URL(relPath, import.meta.url), 'utf8');
      expect(content.match(/#[0-9a-fA-F]{3,8}\b/g), `raw hex in ${relPath}`).toBeNull();
    }

    const uiDir = new URL('../components/ui/', import.meta.url);
    for (const file of readdirSync(uiDir)) {
      if (!file.endsWith('.jsx') || file === 'alliance-icons.jsx') continue;
      const content = readFileSync(new URL(file, uiDir), 'utf8');
      expect(content.match(/#[0-9a-fA-F]{3,8}\b/g), `raw hex in components/ui/${file}`).toBeNull();
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

