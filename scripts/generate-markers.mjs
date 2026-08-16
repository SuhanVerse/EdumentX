#!/usr/bin/env node
/**
 * generate-markers.mjs — EdumentX custom map pin generator.
 *
 * Renders the teardrop tutor map pins as PNGs into `assets/markers/`.
 * Pure Node — no canvas or image deps: a minimal PNG encoder
 * (zlib + CRC32) writes RGBA output. Pixels are supersampled
 * `SS x SS` for antialiasing, then box-downsampled.
 *
 * Visual language (unified with `TutorAvatarPin`):
 *   - white circular head (44 px — the 44 pt touch-target minimum)
 *     with a 3 px colored ring + pointed tail; the tail tip sits at
 *     bottom-center, matching expo-maps' default marker anchor.
 *   - slate ring       → regular tutor
 *   - green ring+shield→ verified tutor (verification token)
 *   - amber ring+halo  → selected pin (amber = selection accent)
 *   - pin-picker       → solid amber locator (location picker drop pin)
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

// Palette — mirrors `tailwind.config.js` / `constants/colors.ts`.
const C = {
  slate: [15, 23, 42, 255], // #0F172A — default ring
  amber: [229, 160, 59, 255], // #E5A03B — selection ring / picker fill
  green: [63, 138, 90, 255], // #3F8A5A — verified ring
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
 * head’s distance there; points below the tip fall back to the corner
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

/**
 * Person silhouette (head circle + shoulders), used as the center glyph
 * for the PNG fallback pins — the avatar pins show the tutor photo, so
 * the fallback shows a neutral person mark in the same position.
 */
function sdPerson(px, py) {
  const head = sdCircle(px, py, 32, 23, 5);
  const shoulders = sdRoundRect(px, py, 32, 35, 7, 4.5, 4);
  return Math.min(head, shoulders);
}

function cover(dist) {
  return clamp01(0.5 - dist);
}

// ── Pin geometry (logical px) ────────────────────────────────────────────────

const CX = 32; // head center
const CY = 30;
const HEAD_R = 22; // head radius → 44 px diameter (touch-target minimum)
const RING_W = 3; // ring thickness
const TAIL_TOP = 46; // tail base — overlaps the head bottom
const TAIL_TIP = 80;
const TAIL_HALF = 9;
const HALO_OUT = 29; // selected white halo (annulus 25..29)
const HALO_IN = 25;
const DOT_R = 6; // picker / cluster center dot
const SHIELD_CX = 45; // verified shield badge on the head rim
const SHIELD_CY = 41;
const SHIELD_R = 8;
const SHIELD_DOT = 3.5;

/**
 * Builds the per-pixel RGBA color for one pin shape.
 * Composite (painter’s order): halo → head → tail → ring → glyph →
 * shield. Returns [r,g,b,a] floats, rgb in 0..255, alpha in 0..1.
 */
function pinPixel(px, py, shape) {
  const wHalo = shape.halo
    ? cover(sdCircle(px, py, CX, CY, HALO_OUT)) *
      (1 - cover(sdCircle(px, py, CX, CY, HALO_IN)))
    : 0;

  const wHead = cover(sdCircle(px, py, CX, CY, HEAD_R));
  const wTail = cover(sdTriangle(px, py, CX, TAIL_HALF, TAIL_TOP, TAIL_TIP));
  const wRing =
    cover(sdCircle(px, py, CX, CY, HEAD_R)) *
    (1 - cover(sdCircle(px, py, CX, CY, HEAD_R - RING_W)));
  const wGlyph =
    shape.glyph === "person"
      ? cover(sdPerson(px, py))
      : cover(sdCircle(px, py, CX, CY, DOT_R));
  const wShield = shape.shield
    ? cover(sdCircle(px, py, SHIELD_CX, SHIELD_CY, SHIELD_R))
    : 0;
  const wShieldDot = shape.shield
    ? cover(sdCircle(px, py, SHIELD_CX, SHIELD_CY, SHIELD_DOT))
    : 0;

  const headColor = shape.head ?? C.white;
  const tailColor = shape.tail ?? shape.ring;

  const lerp = (t) => (u, x) => u * (1 - t) + x * t;

  let [r, g, b, a] = [0, 0, 0, 0];
  // Selected halo — wide white ring (selection state).
  [r, g, b, a] = [
    lerp(wHalo)(r, C.white[0]),
    lerp(wHalo)(g, C.white[1]),
    lerp(wHalo)(b, C.white[2]),
    lerp(wHalo)(a, 1),
  ];
  // Head — white disc (or solid amber for the picker).
  [r, g, b, a] = [
    lerp(wHead)(r, headColor[0]),
    lerp(wHead)(g, headColor[1]),
    lerp(wHead)(b, headColor[2]),
    lerp(wHead)(a, headColor[3] / 255),
  ];
  // Tail — ring color, drawn over the head so the overlap is seamless.
  [r, g, b, a] = [
    lerp(wTail)(r, tailColor[0]),
    lerp(wTail)(g, tailColor[1]),
    lerp(wTail)(b, tailColor[2]),
    lerp(wTail)(a, 1),
  ];
  // Ring — colored annulus on the head edge.
  [r, g, b, a] = [
    lerp(wRing)(r, shape.ring[0]),
    lerp(wRing)(g, shape.ring[1]),
    lerp(wRing)(b, shape.ring[2]),
    lerp(wRing)(a, 1),
  ];
  // Center glyph — person silhouette (tutor/verified) or dot.
  if (shape.glyph) {
    const glyphColor = shape.glyphColor ?? shape.ring;
    [r, g, b, a] = [
      lerp(wGlyph)(r, glyphColor[0]),
      lerp(wGlyph)(g, glyphColor[1]),
      lerp(wGlyph)(b, glyphColor[2]),
      lerp(wGlyph)(a, 1),
    ];
  }
  // Verified shield — green badge + white center dot on the rim.
  if (shape.shield) {
    [r, g, b, a] = [
      lerp(wShield)(r, C.green[0]),
      lerp(wShield)(g, C.green[1]),
      lerp(wShield)(b, C.green[2]),
      lerp(wShield)(a, 1),
    ];
    [r, g, b, a] = [
      lerp(wShieldDot)(r, C.white[0]),
      lerp(wShieldDot)(g, C.white[1]),
      lerp(wShieldDot)(b, C.white[2]),
      lerp(wShieldDot)(a, 1),
    ];
  }
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
    // Regular tutor — slate ring + slate person glyph.
    file: "pin-tutor.png",
    shape: {
      ring: C.slate,
      tail: C.slate,
      glyph: "person",
      glyphColor: C.slate,
    },
  },
  {
    // Verified tutor — green ring + green person + green shield badge.
    file: "pin-verified.png",
    shape: {
      ring: C.green,
      tail: C.green,
      glyph: "person",
      glyphColor: C.green,
      shield: true,
    },
  },
  {
    // Cluster — slate ring + amber dot (the count badge reads amber).
    file: "pin-cluster.png",
    shape: {
      ring: C.slate,
      tail: C.slate,
      glyph: "dot",
      glyphColor: C.amber,
    },
  },
  // Selection halo variants — swapped in when the student taps a pin.
  // Amber ring = selection accent; the wide white ring is the halo.
  {
    file: "pin-tutor-selected.png",
    shape: {
      ring: C.amber,
      tail: C.amber,
      glyph: "person",
      glyphColor: C.slate,
      halo: true,
    },
  },
  {
    file: "pin-verified-selected.png",
    shape: {
      ring: C.amber,
      tail: C.amber,
      glyph: "person",
      glyphColor: C.green,
      shield: true,
      halo: true,
    },
  },
  {
    // Location-picker drop pin — solid amber locator + white center dot.
    file: "pin-picker.png",
    shape: {
      head: C.amber,
      ring: C.amber,
      tail: C.amber,
      glyph: "dot",
      glyphColor: C.white,
    },
  },
];

mkdirSync(OUT_DIR, { recursive: true });
for (const pin of PINS) {
  const png = encodePng(W, H, render(pin.shape));
  const out = join(OUT_DIR, pin.file);
  writeFileSync(out, png);
  console.log(`wrote ${out} (${png.length} bytes)`);
}
