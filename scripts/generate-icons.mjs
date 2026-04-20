#!/usr/bin/env node
/**
 * Generate WorldCapIQ brand icons (PNG + ICO) from SVG.
 * Uses sharp (already a project dependency).
 */

import sharp from 'sharp';
import { writeFileSync, mkdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const ICONS_DIR = join(PROJECT_ROOT, 'public', 'icons');
const PUBLIC_DIR = join(PROJECT_ROOT, 'public');

// Brand colors
const BG_GREEN = '#a0d494';
const TEXT_DARK = '#0d0f0d';

mkdirSync(ICONS_DIR, { recursive: true });

/**
 * Create an SVG string for the IQ icon mark at a given size.
 * Standard variant: squircle with rounded corners.
 */
function createStandardIconSvg(size) {
  const radius = Math.round(size * 0.22);
  const fontSize = Math.round(size * 0.58);
  const lineWidth = Math.max(1, Math.round(size * 0.006));
  const lineX1 = Math.round(size * 0.625);
  const lineY2 = Math.round(size * 0.625);
  // Shift text up slightly for visual centering (Bebas Neue has high cap height)
  const textY = Math.round(size * 0.66);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <defs>
    <clipPath id="sq">
      <rect width="${size}" height="${size}" rx="${radius}" ry="${radius}"/>
    </clipPath>
  </defs>
  <rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="${BG_GREEN}"/>
  <line x1="${lineX1}" y1="${size}" x2="${size}" y2="${lineY2}" stroke="${TEXT_DARK}" stroke-width="${lineWidth}" opacity="0.4" clip-path="url(#sq)"/>
  <text x="${size / 2}" y="${textY}" text-anchor="middle" font-family="Impact,'Arial Narrow',Helvetica,sans-serif" font-size="${fontSize}" font-weight="400" fill="${TEXT_DARK}" letter-spacing="-${Math.round(size * 0.015)}">IQ</text>
</svg>`;
}

/**
 * Maskable variant: full-bleed green, no rounded corners, content in safe zone.
 */
function createMaskableIconSvg(size) {
  const fontSize = Math.round(size * 0.8 * 0.58);
  const textY = Math.round(size * 0.64);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" fill="${BG_GREEN}"/>
  <text x="${size / 2}" y="${textY}" text-anchor="middle" font-family="Impact,'Arial Narrow',Helvetica,sans-serif" font-size="${fontSize}" font-weight="400" fill="${TEXT_DARK}" letter-spacing="-${Math.round(size * 0.012)}">IQ</text>
</svg>`;
}

async function generateIcon(name, size, svgFn, outputDir) {
  const svg = svgFn(size);
  const buffer = await sharp(Buffer.from(svg))
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toBuffer();

  const path = join(outputDir, name);
  writeFileSync(path, buffer);
  const fileSize = statSync(path).size;
  console.log(`  ${name} (${size}x${size}, ${fileSize.toLocaleString()} bytes)`);
  return buffer;
}

async function generateFaviconIco(svg512Buffer) {
  // Create 16x16, 32x32, and 48x48 PNGs
  const sizes = [16, 32, 48];
  const pngBuffers = await Promise.all(
    sizes.map(s =>
      sharp(svg512Buffer).resize(s, s).png({ compressionLevel: 9 }).toBuffer()
    )
  );

  // Build a minimal ICO file
  // ICO format: header (6 bytes) + directory entries (16 bytes each) + image data
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);      // Reserved
  header.writeUInt16LE(1, 2);      // ICO type
  header.writeUInt16LE(sizes.length, 4); // Number of images

  let dataOffset = 6 + (16 * sizes.length);
  const dirEntries = [];
  for (let i = 0; i < sizes.length; i++) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(sizes[i] === 256 ? 0 : sizes[i], 0);  // Width
    entry.writeUInt8(sizes[i] === 256 ? 0 : sizes[i], 1);  // Height
    entry.writeUInt8(0, 2);           // Color palette
    entry.writeUInt8(0, 3);           // Reserved
    entry.writeUInt16LE(1, 4);        // Color planes
    entry.writeUInt16LE(32, 6);       // Bits per pixel
    entry.writeUInt32LE(pngBuffers[i].length, 8);  // Image size
    entry.writeUInt32LE(dataOffset, 12);            // Image offset
    dirEntries.push(entry);
    dataOffset += pngBuffers[i].length;
  }

  return Buffer.concat([header, ...dirEntries, ...pngBuffers]);
}

async function main() {
  console.log('Generating WorldCapIQ brand icons...\n');

  // Standard icons
  console.log('Standard icons (purpose: "any"):');
  await generateIcon('icon-192.png', 192, createStandardIconSvg, ICONS_DIR);
  const icon512Svg = Buffer.from(createStandardIconSvg(512));
  await generateIcon('icon-512.png', 512, createStandardIconSvg, ICONS_DIR);

  // Maskable icons
  console.log('\nMaskable icons (purpose: "maskable"):');
  await generateIcon('icon-maskable-192.png', 192, createMaskableIconSvg, ICONS_DIR);
  await generateIcon('icon-maskable-512.png', 512, createMaskableIconSvg, ICONS_DIR);

  // Apple touch icon
  console.log('\nApple touch icon:');
  await generateIcon('apple-touch-icon.png', 180, createStandardIconSvg, PUBLIC_DIR);

  // Favicon.ico
  console.log('\nFavicon:');
  const icoBuffer = await generateFaviconIco(icon512Svg);
  const icoPath = join(PUBLIC_DIR, 'favicon.ico');
  writeFileSync(icoPath, icoBuffer);
  const icoSize = statSync(icoPath).size;
  console.log(`  favicon.ico (16+32+48, ${icoSize.toLocaleString()} bytes)`);

  console.log('\nDone. All icons generated.');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
