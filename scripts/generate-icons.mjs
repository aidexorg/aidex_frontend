#!/usr/bin/env node
/**
 * Generate PWA PNG icons for AIDEX dental clinic app.
 * Creates 192x192 and 512x512 PNGs with the app's brand colors.
 * Uses only Node.js built-ins (zlib for compression).
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

const PUBLIC_DIR = join(import.meta.dirname, '..', 'public');

/** CRC32 table for PNG chunk checksums */
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[n] = c;
}
function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([len, typeAndData, crc]);
}

function generatePNG(size) {
  // Brand colors: navy #1e2a3a (30,42,58), sage #7a9e7e (122,158,126), white #e4efe6 (228,239,230)
  const R = 30, G = 42, B = 58; // navy background
  const SR = 122, SG = 158, SB = 126; // sage accent
  const WR = 228, WG = 239, WB = 230; // white elements

  const pixels = [];
  const cx = size / 2, cy = size / 2;
  const outerR = size * 0.42;
  const innerR = size * 0.31;
  const headR = size * 0.10;
  const headCx = cx, headCy = cy - size * 0.04;
  const smileR = size * 0.18;

  for (let y = 0; y < size; y++) {
    pixels.push(0); // PNG filter byte: None
    for (let x = 0; x < size; x++) {
      const dx = x - cx, dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);

      let r = R, g = G, b = B;

      // Rounded square background with subtle gradient
      const cornerR = size * 0.15;
      const inSquare =
        x >= cornerR && x <= size - cornerR &&
        y >= cornerR && y <= size - cornerR;
      const inCorner =
        (x < cornerR && y < cornerR && Math.sqrt((x - cornerR) ** 2 + (y - cornerR) ** 2) <= cornerR) ||
        (x > size - cornerR && y < cornerR && Math.sqrt((x - size + cornerR) ** 2 + (y - cornerR) ** 2) <= cornerR) ||
        (x < cornerR && y > size - cornerR && Math.sqrt((x - cornerR) ** 2 + (y - size + cornerR) ** 2) <= cornerR) ||
        (x > size - cornerR && y > size - cornerR && Math.sqrt((x - size + cornerR) ** 2 + (y - size + cornerR) ** 2) <= cornerR);

      if (inSquare || inCorner) {
        // Subtle radial gradient
        const grad = Math.min(1, dist / (size * 0.6));
        r = Math.round(R + (40 - R) * grad * 0.3);
        g = Math.round(G + (55 - G) * grad * 0.3);
        b = Math.round(B + (75 - B) * grad * 0.3);

        // Outer circle (smile arc) - sage color
        const smileDist = Math.abs(dist - smileR);
        const isSmileArc = smileDist < size * 0.025 && angle > 0.2 && angle < Math.PI - 0.2;
        if (isSmileArc) {
          r = SR; g = SG; b = SB;
        }

        // Smile endpoints - round caps
        const capR = size * 0.018;
        const cap1x = cx + smileR * Math.cos(0.2), cap1y = cy + smileR * Math.sin(0.2);
        const cap2x = cx + smileR * Math.cos(Math.PI - 0.2), cap2y = cy + smileR * Math.sin(Math.PI - 0.2);
        if (Math.sqrt((x - cap1x) ** 2 + (y - cap1y) ** 2) < capR ||
            Math.sqrt((x - cap2x) ** 2 + (y - cap2y) ** 2) < capR) {
          r = SR; g = SG; b = SB;
        }

        // Head circle - white/light
        const headDist = Math.sqrt((x - headCx) ** 2 + (y - headCy) ** 2);
        if (headDist < headR) {
          const headEdge = Math.max(0, 1 - headDist / headR);
          const edgeFade = headEdge < 0.3 ? headEdge / 0.3 : 1;
          r = Math.round(WR * edgeFade + r * (1 - edgeFade));
          g = Math.round(WG * edgeFade + g * (1 - edgeFade));
          b = Math.round(WB * edgeFade + b * (1 - edgeFade));
        }

        // Body arc below head - white/light, thicker
        const bodyCenterY = cy + size * 0.08;
        const bodyDist = Math.sqrt((x - cx) ** 2 + (y - bodyCenterY) ** 2);
        const bodyArcR = size * 0.14;
        const bodyThick = size * 0.028;
        if (Math.abs(bodyDist - bodyArcR) < bodyThick && y > bodyCenterY) {
          const edgeFade = 1 - Math.abs(bodyDist - bodyArcR) / bodyThick * 0.3;
          r = Math.round(WR * edgeFade + r * (1 - edgeFade));
          g = Math.round(WG * edgeFade + g * (1 - edgeFade));
          b = Math.round(WB * edgeFade + b * (1 - edgeFade));
        }
      } else {
        // Outside rounded rect - transparent placeholder (but PNG needs color, use dark)
        r = 0; g = 0; b = 0;
      }

      // Premultiplied alpha for antialiased edges
      let alpha = 255;
      if (!inSquare && !inCorner) {
        // Find distance to nearest edge of rounded rect
        const clampX = Math.max(cornerR, Math.min(size - cornerR, x));
        const clampY = Math.max(cornerR, Math.min(size - cornerR, y));
        const edgeDist = Math.sqrt((x - clampX) ** 2 + (y - clampY) ** 2);
        if (edgeDist > 2) alpha = 0;
        else alpha = Math.round(255 * (1 - edgeDist / 2));
      }

      pixels.push(r, g, b, alpha);
    }
  }

  const rawData = Buffer.from(pixels);
  const compressed = deflateSync(rawData, { level: 9 });

  // PNG file
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); // width
  ihdr.writeUInt32BE(size, 4); // height
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  return Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync(PUBLIC_DIR, { recursive: true });

const sizes = [192, 512];
for (const size of sizes) {
  const png = generatePNG(size);
  const path = join(PUBLIC_DIR, `icon-${size}x${size}.png`);
  writeFileSync(path, png);
  console.log(`✓ Generated ${path} (${png.length} bytes)`);
}

// Also generate apple-touch-icon (180x180)
const apple180 = generatePNG(180);
writeFileSync(join(PUBLIC_DIR, 'apple-touch-icon.png'), apple180);
console.log(`✓ Generated apple-touch-icon.png (${apple180.length} bytes)`);

console.log('\nDone! Icons generated in public/');
