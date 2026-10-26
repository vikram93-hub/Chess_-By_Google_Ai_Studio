import fs from 'fs';
import zlib from 'zlib';

function createCRC32Table() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  return table;
}

const crcTable = createCRC32Table();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function writeChunk(type: string, data: Buffer): Buffer {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const toCrc = Buffer.concat([typeBuf, data]);
  const crc = crc32(toCrc);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc, 0);

  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function generateChessIconPNG(width: number, height: number, maskable = false): Buffer {
  // RGBA buffer with filter byte per scanline
  const scanlineWidth = width * 4;
  const rawData = Buffer.alloc((scanlineWidth + 1) * height);

  const cornerRadius = maskable ? 0 : Math.floor(width * 0.21);
  const cx = width / 2;
  const cy = height / 2;

  let offset = 0;
  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // Filter type 0 (None)

    for (let x = 0; x < width; x++) {
      // Check rounded corner distance if not maskable
      let inside = true;
      if (!maskable && cornerRadius > 0) {
        const dx = Math.max(0, Math.abs(x - cx) - (cx - cornerRadius));
        const dy = Math.max(0, Math.abs(y - cy) - (cy - cornerRadius));
        if (dx * dx + dy * dy > cornerRadius * cornerRadius) {
          inside = false;
        }
      }

      if (!inside) {
        // Transparent
        rawData[offset++] = 0;
        rawData[offset++] = 0;
        rawData[offset++] = 0;
        rawData[offset++] = 0;
        continue;
      }

      // Background gradient from dark slate #0b0f19 to deep midnight #111827
      const t = (x + y) / (width + height);
      let r = Math.round(11 * (1 - t) + 17 * t);
      let g = Math.round(15 * (1 - t) + 24 * t);
      let b = Math.round(25 * (1 - t) + 39 * t);
      let a = 255;

      // Subtle cyan border highlight
      const distFromEdge = Math.min(x, y, width - 1 - x, height - 1 - y);
      if (distFromEdge <= 2) {
        r = 56;
        g = 189;
        b = 248;
      }

      // Draw Chess Knight emblem in center
      // Normalize to -1 to 1 coords
      const nx = (x - cx) / (width * 0.38);
      const ny = (y - cy) / (height * 0.38);

      // Check if inside knight silhouette approximation
      // Base pedestal:
      const inBase1 = ny >= 0.55 && ny <= 0.72 && Math.abs(nx) <= (0.75 - (ny - 0.55) * 0.2);
      const inBase2 = ny >= 0.72 && ny <= 0.85 && Math.abs(nx) <= 0.85;

      // Body / neck:
      const inNeck = ny >= -0.3 && ny <= 0.55 && nx >= -0.55 + ny * 0.3 && nx <= 0.45 - ny * 0.15;
      
      // Head / snout:
      const inHead = ny >= -0.65 && ny <= -0.15 && nx >= -0.7 && nx <= 0.25;
      // Ears / mane:
      const inEar = ny >= -0.85 && ny <= -0.55 && nx >= -0.2 && nx <= 0.25 - (ny + 0.85) * 0.5;
      const inMane = ny >= -0.55 && ny <= 0.4 && nx >= 0.15 && nx <= 0.5 - (ny * 0.3);

      const inKnight = inBase1 || inBase2 || inNeck || inHead || inEar || inMane;

      // Eye cutout
      const isEye = Math.hypot(nx - (-0.2), ny - (-0.38)) < 0.08;

      if (inKnight && !isEye) {
        // Metallic silver / cyan knight
        const pieceShade = 0.5 + 0.5 * (nx * 0.7 - ny * 0.7);
        r = Math.round(200 + pieceShade * 55);
        g = Math.round(215 + pieceShade * 40);
        b = Math.round(240 + pieceShade * 15);

        // Gold/cyan accent along mane
        if (nx > 0.15 && ny < 0.2) {
          r = 56;
          g = 189;
          b = 248;
        }
      } else if (isEye) {
        // Glowing cyan eye
        r = 56;
        g = 189;
        b = 248;
      }

      rawData[offset++] = r;
      rawData[offset++] = g;
      rawData[offset++] = b;
      rawData[offset++] = a;
    }
  }

  // Compress IDAT
  const compressedData = zlib.deflateSync(rawData);

  // PNG Header
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth
  ihdr[9] = 6; // Color type: RGBA
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace

  const ihdrChunk = writeChunk('IHDR', ihdr);
  const idatChunk = writeChunk('IDAT', compressedData);
  const iendChunk = writeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Generate all required PWA icons
fs.writeFileSync('public/pwa-192x192.png', generateChessIconPNG(192, 192, false));
fs.writeFileSync('public/pwa-512x512.png', generateChessIconPNG(512, 512, false));
fs.writeFileSync('public/pwa-maskable-512x512.png', generateChessIconPNG(512, 512, true));
fs.writeFileSync('public/apple-touch-icon.png', generateChessIconPNG(180, 180, false));
fs.writeFileSync('public/favicon.ico', generateChessIconPNG(32, 32, false));

console.log('Successfully generated all PWA icons!');
