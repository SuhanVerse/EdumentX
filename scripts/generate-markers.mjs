#!/usr/bin/env node
/**
 * generate-markers.mjs — EdumentX custom map pin generator.
 *
 * Renders the Slate/Night + Amber themed tutor map pins as PNGs into
 * `assets/markers/`. Pure Node — no canvas or image deps: a minimal
 * PNG encoder (zlib + CRC32) writes RGBA output. Pixels are
 * supersampled `SS x SS` for antialiasing, then box-downsampled.
 *
 * The badge is a rounded-square locator with a stub tail; the map
 * anchor (bottom-center of the canvas) lands exactly on the tail tip,
 * matching expo-maps' default `bottom-center` marker anchor.
 *
 * Run:  node scripts/generate-markers.mjs
 */
import { Buffer } from "node:buffer";
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "assets",
  "markers",
);

const W = 64; // logical canvas width
const H = 84; // logical canvas height (tail tip at y=80 ≈ anchor+breathe)
const SS = 8; // supersample factor

const C = {
  amber: [229, 160, 59, 255],
  slate: [15, 23, 42, 255],
  green: [63, 138, 90, 255],
  white: [255, 255, 255, 255],
};

// ── Signed-distance helpers ──────────────────────────────────────────────────

const clamp01 = (v) => Math.min(1, Math.max(0, v));

function sdCircle(px, py, cx, cy, r) {
  return Math.hypot(px - cx, py - cy) - r;
}

function sdRoundRect(px, py, cx, cy, hw, hh, r) {
  const qx = Math.abs(px - cx) - (hw - r);
  const qy = Math.abs(py - cy) - (hh - r);
  const ox = Math.max(qx, 0);
  const oy = Math.max(qy, 0);
  return Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0) - r;
}

/**
 * Signed distance inside an isoceles downward triangle (negative = inside).
 * Points above the base report +Infinity so `min(body, tail)` keeps the
 * badge’s distance there; points below the tip fall back to the corner
 * distance.
 */
function sdTriangle(px, py, cx, halfBase, topY, tipY) {
  if (py < topY) return Infinity;
  const t = clamp01((py - topY) / (tipY - topY));
  const halfAtY = halfBase * (1 - t);
  const sdX = Math.abs(px - cx) - halfAtY;
  const dyBottom = py - tipY; // > 0 below the tip
  if (dyBottom > 0) {
    return Math.hypot(Math.max(sdX, 0), dyBottom);
  }
  // Inside the vertical span: signed distance to the left/right edges.
  return sdX;
}

function cover(dist) {
  return clamp01(0.5 - dist);
}

// ── Pin geometry (logical px) ────────────────────────────────────────────────

const CY = 24; // badge center — badge spans y 9..39, tail 39..59
const TAIL_TOP = 36;
const TAIL_TIP = 74;

/**
 * Builds the per-pixel RGBA color for one pin shape.
 * Layers: badge+tail fill → white ring (outer disc minus inner disc) →
 * center dot. Composite via alpha lerp, clamp at the end.
 * Returns [r,g,b,a] floats 0..1.
 *
 * `shape.selected` widens the white ring into a selection halo — the
 * on-map "this pin is selected" state (used for the map's selected
 * tutor alongside the translucent service-radius Circle).
 */
function pinPixel(px, py, shape) {
  const bodyDist = Math.min(
    sdRoundRect(px, py, 32, CY, 17, 17, 10),
    sdTriangle(px, py, 32, 15, TAIL_TOP, TAIL_TIP),
  );

  // cover() on a signed distance → 1 deep inside, 0 far outside.
  const wBody = cover(bodyDist);

  const ringOuter = shape.selected ? 20 : 13;
  const ringInner = shape.selected ? 15 : ringOuter - 4;
  // Annulus: inside outer disc, outside inner disc.
  const wWhiteRing =
    cover(sdCircle(px, py, 32, CY, ringOuter)) *
    (1 - cover(sdCircle(px, py, 32, CY, ringInner)));

  const wDot = cover(sdCircle(px, py, 32, CY, 5.5));

  const lerp = (t) => (u, x) => u * (1 - t) + x * t;

  // rgb work in 0..255 scale (body/dot colors are raw hex bands), alpha in 0..1.
  let [r, g, b, a] = [0, 0, 0, 0];
  [r, g, b, a] = [lerp(wBody)(r, shape.body[0]), lerp(wBody)(g, shape.body[1]), lerp(wBody)(b, shape.body[2]), lerp(wBody)(a, 1)];
  [r, g, b, a] = [lerp(wWhiteRing)(r, 255), lerp(wWhiteRing)(g, 255), lerp(wWhiteRing)(b, 255), lerp(wWhiteRing)(a, 1)];
  [r, g, b, a] = [lerp(wDot)(r, shape.dot[0]), lerp(wDot)(g, shape.dot[1]), lerp(wDot)(b, shape.dot[2]), lerp(wDot)(a, 1)];
  return [r, g, b, a];
}

// ── Render a pin at supersample → downsample → Uint8 RGBA ─────────────────────

function render(shape) {
  const buf = Buffer.alloc(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let ar = 0, ag = 0, ab = 0, aa = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px = x + (sx + 0.5) / SS;
          const py = y + (sy + 0.5) / SS;
          const [r, g, b, a] = pinPixel(px, py, shape);
          ar += r; ag += g; ab += b; aa += a;
        }
      }
      const n = SS * SS;
      const o = (y * W + x) * 4;
      // rgb come back in 0..255 units, alpha in 0..1 units.
      const c255 = (v) => Math.round(Math.max(0, Math.min(255, v)));
      buf[o + 0] = c255(ar / n);
      buf[o + 1] = c255(ag / n);
      buf[o + 2] = c255(ab / n);
      buf[o + 3] = Math.round(clamp01(aa / n) * 255);
    }
  }
  return buf;
}

// ── Minimal PNG encoder ──────────────────────────────────────────────────────

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ── Emit ─────────────────────────────────────────────────────────────────────

const PINS = [
  {
    file: "pin-tutor.png",
    shape: { body: C.amber, dot: C.slate },
  },
  {
    file: "pin-verified.png",
    shape: { body: C.green, dot: C.white },
  },
  {
    file: "pin-cluster.png",
    shape: { body: C.slate, dot: C.amber },
  },
  // Selection halo variants — swapped in when the student taps a pin;
  // the white ring reads as the "selected" border.
  {
    file: "pin-tutor-selected.png",
    shape: { body: C.amber, dot: C.slate, selected: true },
  },
  {
    file: "pin-verified-selected.png",
    shape: { body: C.green, dot: C.white, selected: true },
  },
];

mkdirSync(OUT_DIR, { recursive: true });
for (const pin of PINS) {
  const png = encodePng(W, H, render(pin.shape));
  const out = join(OUT_DIR, pin.file);
  writeFileSync(out, png);
  console.log(`wrote ${out} (${png.length} bytes)`);
}