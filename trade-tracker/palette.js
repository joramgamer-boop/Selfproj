/**
 * The colours the build needs outside CSS: the manifest's theme, and the icons
 * drawn by `scripts/generate-icons.mjs`. Plain JS rather than TS so the icon
 * script can run under bare `node`.
 *
 * `src/index.css` declares the same values as custom properties, and
 * `index.html` repeats `ground` in its `theme-color` meta — neither can import
 * from here, so those two change alongside this file.
 */
export const palette = {
  ground: '#101418',
  edge: '#263140',
  accent: '#4ade80',
};

/** @returns {[number, number, number]} */
export function rgb(hex) {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
}
