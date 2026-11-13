// ai-happy-01 entry, round 2 (Node 22, standard library only).
//
// The image beside this file is the entry: a grandmother and her little
// granddaughter laughing together in a sunny kitchen, a puff of flour
// in the air between them — one specific joyful moment, made to make the
// AI judge smile. This program copies it to /output/entry.png and checks
// the gate itself before writing, so a bad file fails loudly here instead
// of silently at the grader.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const MAX_BYTES = 1048576;
const MAX_SIDE = 1024;

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff]);

function fail(message) {
  throw new Error(`entry gate: ${message}`);
}

function pngSize(bytes) {
  // IHDR chunk: width and height are big-endian uint32 at offsets 16 and 20.
  if (bytes.length < 24 || bytes.toString('ascii', 12, 16) !== 'IHDR') {
    fail('PNG header is not a whole image');
  }
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

function jpegSize(bytes) {
  // Walk JPEG segments until a start-of-frame marker (0xC0-0xCF except
  // 0xC4, 0xC8, 0xCC) gives height and width, big-endian uint16.
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) fail('JPEG segment out of sync');
    const marker = bytes[offset + 1];
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { width: bytes.readUInt16BE(offset + 7), height: bytes.readUInt16BE(offset + 5) };
    }
    const length = bytes.readUInt16BE(offset + 2);
    if (length < 2) fail('JPEG segment length invalid');
    offset += 2 + length;
  }
  fail('JPEG has no start-of-frame segment');
}

const source = new URL('./entry.png', import.meta.url);
const bytes = readFileSync(source);

let size;
if (bytes.subarray(0, 8).equals(PNG_MAGIC)) {
  size = pngSize(bytes);
} else if (bytes.subarray(0, 3).equals(JPEG_MAGIC)) {
  size = jpegSize(bytes);
} else {
  fail('not a PNG or JPEG (magic bytes do not match)');
}
if (bytes.length > MAX_BYTES) fail(`file is ${bytes.length} bytes, over the 1 MiB cap`);
if (size.width > MAX_SIDE || size.height > MAX_SIDE) {
  fail(`image is ${size.width}x${size.height}, over the 1024x1024 cap`);
}

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, 'entry.png');
writeFileSync(outPath, bytes);

// Self-check: what landed on disk must be byte-identical to the entry,
// so a partial write or a wrong path fails here, not at the grader.
const written = readFileSync(outPath);
if (!written.equals(bytes)) fail('output bytes differ from the entry image');
