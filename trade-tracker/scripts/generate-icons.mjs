/**
 * Draws the home-screen icons from the app's own palette, so the installed icon
 * cannot drift from the screen behind it. Run `npm run icons` after changing a
 * colour here; the PNGs are committed, so a build never needs this script.
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { palette, rgb } from '../palette.js';

const publicDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public');

const GROUND = rgb(palette.ground);
const ACCENT = rgb(palette.accent);
const DIM = rgb(palette.edge);

/** Three ascending bars: an account that grows in steps, which is the whole idea. */
const BARS = [
  { height: 0.42, colour: DIM },
  { height: 0.7, colour: ACCENT },
  { height: 1, colour: ACCENT },
];

const icons = [
  // A maskable icon is cropped to a circle by some launchers, so its glyph sits
  // inside the 80% safe zone; plain icons can use more of the square.
  { file: 'icons/icon-192.png', size: 192, glyph: 0.66 },
  { file: 'icons/icon-512.png', size: 512, glyph: 0.66 },
  { file: 'icons/icon-maskable-512.png', size: 512, glyph: 0.5 },
  { file: 'apple-touch-icon.png', size: 180, glyph: 0.66 },
];

/** @returns {Uint8Array} RGBA pixels, row-major. */
function drawIcon(size, glyphScale) {
  const pixels = new Uint8Array(size * size * 4);
  const box = size * glyphScale;
  const left = (size - box) / 2;
  const bottom = (size + box) / 2;
  const barWidth = box / (BARS.length + (BARS.length - 1) * 0.5);
  const radius = barWidth * 0.3;

  const shapes = BARS.map((bar, index) => ({
    colour: bar.colour,
    x0: left + index * barWidth * 1.5,
    x1: left + index * barWidth * 1.5 + barWidth,
    y0: bottom - box * bar.height,
    y1: bottom,
    radius,
  }));

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let [r, g, b] = GROUND;
      for (const shape of shapes) {
        const cover = coverage(x, y, shape);
        if (cover === 0) continue;
        r = Math.round(r + (shape.colour[0] - r) * cover);
        g = Math.round(g + (shape.colour[1] - g) * cover);
        b = Math.round(b + (shape.colour[2] - b) * cover);
      }
      const offset = (y * size + x) * 4;
      pixels[offset] = r;
      pixels[offset + 1] = g;
      pixels[offset + 2] = b;
      pixels[offset + 3] = 0xff;
    }
  }
  return pixels;
}

/** Share of a pixel covered by a rounded rectangle, sampled 4×4 for smooth edges. */
function coverage(x, y, shape) {
  let inside = 0;
  for (let sy = 0; sy < 4; sy += 1) {
    for (let sx = 0; sx < 4; sx += 1) {
      if (inRoundedRect(x + (sx + 0.5) / 4, y + (sy + 0.5) / 4, shape)) inside += 1;
    }
  }
  return inside / 16;
}

function inRoundedRect(px, py, { x0, x1, y0, y1, radius }) {
  if (px < x0 || px > x1 || py < y0 || py > y1) return false;
  const cx = Math.min(Math.max(px, x0 + radius), x1 - radius);
  const cy = Math.min(Math.max(py, y0 + radius), y1 - radius);
  return (px - cx) ** 2 + (py - cy) ** 2 <= radius ** 2;
}

function encodePng(size, pixels) {
  const stride = size * 4;
  // PNG carries a filter byte per row; 0 means "store the bytes as they are".
  const raw = new Uint8Array((stride + 1) * size);
  for (let y = 0; y < size; y += 1) {
    raw.set(pixels.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1);
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // truecolour with alpha

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([length, body, checksum]);
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

for (const icon of icons) {
  const path = resolve(publicDir, icon.file);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, encodePng(icon.size, drawIcon(icon.size, icon.glyph)));
  console.log(`wrote ${icon.file}`);
}
