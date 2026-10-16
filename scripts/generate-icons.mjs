// Generates app icons and the transparent header/hero logo from the brand sources.
// Run with: pnpm icons
//
// Sources (never modified):
//   public/brand/logo.jpg          2048×2048, white background — used for app icons
//   public/brand/solace logo.png   500×500, transparent — used for public/brand/logo.png
//
// Outputs:
//   public/brand/logo.png          transparent, empty margin trimmed
//   src/app/icon.png               512×512
//   src/app/apple-icon.png         180×180
//   src/app/favicon.ico            16, 32, 48 (PNG-compressed ICO)
//
// The logo is only trimmed, padded, and resized; its shapes are never redrawn.

import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const brand = (file) => path.join(root, "public", "brand", file);
const app = (file) => path.join(root, "src", "app", file);

const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

/** Trims the white margin of the JPEG source and returns a square PNG buffer. */
async function squareFromJpeg() {
  const trimmed = await sharp(brand("logo.jpg"))
    .trim({ background: "#ffffff", threshold: 20 })
    .png()
    .toBuffer({ resolveWithObject: true });
  const side = Math.max(trimmed.info.width, trimmed.info.height);
  return sharp(trimmed.data)
    .resize(side, side, { fit: "contain", background: WHITE })
    .png()
    .toBuffer();
}

/** Resizes a square logo onto a white square with the given padding ratio. */
async function iconPng(square, size, paddingRatio) {
  const inner = Math.round(size * (1 - paddingRatio * 2));
  const logo = await sharp(square).resize(inner, inner).png().toBuffer();
  return sharp({
    create: { width: size, height: size, channels: 4, background: WHITE },
  })
    .composite([{ input: logo, gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/** Packs PNG images into a single ICO file. */
function toIco(images) {
  const headerSize = 6;
  const entrySize = 16;
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);

  let offset = headerSize + entrySize * images.length;
  const entries = images.map(({ size, data }) => {
    const entry = Buffer.alloc(entrySize);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2); // palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    return entry;
  });

  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

async function main() {
  // Transparent logo for the header and hero.
  await sharp(brand("solace logo.png"))
    .trim({ background: TRANSPARENT, threshold: 1 })
    .png({ compressionLevel: 9 })
    .toFile(brand("logo.png"));

  const square = await squareFromJpeg();

  await writeFile(app("icon.png"), await iconPng(square, 512, 0.08));
  await writeFile(app("apple-icon.png"), await iconPng(square, 180, 0.1));

  const icoImages = [];
  for (const size of [16, 32, 48]) {
    icoImages.push({ size, data: await iconPng(square, size, 0.02) });
  }
  await writeFile(app("favicon.ico"), toIco(icoImages));

  console.log("Icons generated.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
