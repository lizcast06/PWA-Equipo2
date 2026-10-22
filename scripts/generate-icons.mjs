// Genera los íconos PNG del manifest (192 y 512) sin dependencias externas.
// Uso: node scripts/generate-icons.mjs
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { deflateSync } from "node:zlib";

const root = resolve(import.meta.dirname, "..");

const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(size, pixel) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    const row = y * (size * 4 + 1);
    raw[row] = 0; // filtro "None"
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixel(x / size, y / size);
      raw.set([r, g, b, a], row + 1 + x * 4);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bits por canal
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// Distancia de un punto al segmento AB (coordenadas normalizadas 0..1)
function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

const SKY = [2, 132, 199, 255];
const WHITE = [255, 255, 255, 255];
const SLATE = [15, 23, 42, 255];

// Ícono "maskable": fondo completo y el dibujo dentro de la zona segura (80% central).
function pixel(x, y) {
  // Portapapeles blanco centrado
  const inBoard = x > 0.3 && x < 0.7 && y > 0.27 && y < 0.75;
  const inClip = x > 0.42 && x < 0.58 && y > 0.22 && y < 0.31;
  // Palomita (check) sobre el portapapeles
  const check =
    distToSegment(x, y, 0.38, 0.52, 0.47, 0.61) < 0.03 ||
    distToSegment(x, y, 0.47, 0.61, 0.63, 0.42) < 0.03;

  if (inClip) return SLATE;
  if (inBoard) return check ? SKY : WHITE;
  return SKY;
}

for (const size of [192, 512]) {
  const file = resolve(root, `public/icon-${size}.png`);
  writeFileSync(file, encodePng(size, pixel));
  console.log(`Ícono generado: ${file}`);
}
