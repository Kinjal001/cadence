import fs from "fs";
import zlib from "zlib";

// CRC32 table for PNG chunks
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[n] = c;
}
function crc32(buf) {
  let crc = 0xffffffff;
  for (const b of buf) crc = crcTable[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const t = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crcBuf]);
}

// Returns 0–1: how much of pixel (px, py) is inside the C glyph
function cAlpha(px, py, size) {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size * 0.36;
  const innerR = size * 0.23;
  const openHalf = Math.PI * 0.28; // ~50°, leaving 100° gap on right

  const SAMPLES = 4;
  let inside = 0;
  for (let si = 0; si < SAMPLES; si++) {
    for (let sj = 0; sj < SAMPLES; sj++) {
      const x = px + (si + 0.5) / SAMPLES;
      const y = py + (sj + 0.5) / SAMPLES;
      const dx = x - cx;
      const dy = y - cy;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < innerR || d > outerR) continue;
      const angle = Math.atan2(dy, dx);
      if (Math.abs(angle) < openHalf) continue;
      inside++;
    }
  }
  return inside / (SAMPLES * SAMPLES);
}

function generatePNG(size) {
  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB

  // Raw scanlines: filter byte + RGB per pixel
  const raw = Buffer.alloc(size * (1 + size * 3));
  let pos = 0;
  for (let y = 0; y < size; y++) {
    raw[pos++] = 0; // filter: None
    for (let x = 0; x < size; x++) {
      const a = cAlpha(x, y, size);
      // Blend: bg=#815BEB (129,91,235) → white (255,255,255)
      raw[pos++] = Math.round(129 + (255 - 129) * a);
      raw[pos++] = Math.round(91 + (255 - 91) * a);
      raw[pos++] = Math.round(235 + (255 - 235) * a);
    }
  }

  const idat = zlib.deflateSync(raw, { level: 6 });

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

fs.mkdirSync("public", { recursive: true });
fs.writeFileSync("public/icon-192.png", generatePNG(192));
fs.writeFileSync("public/icon-512.png", generatePNG(512));
console.log("Generated public/icon-192.png and public/icon-512.png");
