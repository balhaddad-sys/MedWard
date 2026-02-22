/**
 * generate-icons.mjs
 * Generates all app icons from a single vector master.
 * Targets: web/PWA, Android launchers + adaptive foreground, iOS AppIcon.
 */
import sharp from 'sharp';
import { mkdir, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ANDROID_RES = join(ROOT, 'android', 'app', 'src', 'main', 'res');
const PUBLIC_ICONS = join(ROOT, 'public', 'icons');
const IOS_APPICON = join(
  ROOT,
  'ios',
  'App',
  'App',
  'Assets.xcassets',
  'AppIcon.appiconset',
  'AppIcon-512@2x.png'
);

const WEB_ICONS = [72, 96, 128, 144, 152, 192, 384, 512];

const ANDROID_MIPMAP = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

const ANDROID_FOREGROUND = {
  'mipmap-mdpi': 108,
  'mipmap-hdpi': 162,
  'mipmap-xhdpi': 216,
  'mipmap-xxhdpi': 324,
  'mipmap-xxxhdpi': 432,
};

function masterSvg(size = 512) {
  const heart = 'M256 418 C230 394 72 284 72 186 C72 110 128 62 196 62 C236 62 256 98 256 120 C256 98 276 62 316 62 C384 62 440 110 440 186 C440 284 282 394 256 418Z';
  const pulse = 'M56 240 L188 240 L222 240 L244 148 L264 332 L286 240 L322 240 L456 240';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0A1929"/>
      <stop offset="100%" stop-color="#1B3A5C"/>
    </linearGradient>
    <linearGradient id="hf" x1="256" y1="62" x2="256" y2="418" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#EF5350"/>
      <stop offset="100%" stop-color="#C62828"/>
    </linearGradient>
    <clipPath id="hc">
      <path d="${heart}"/>
    </clipPath>
  </defs>
  <rect width="512" height="512" rx="108" fill="url(#bg)"/>
  <path d="${heart}" fill="#000" opacity="0.2" transform="translate(0,6)"/>
  <path d="${heart}" fill="url(#hf)"/>
  <g clip-path="url(#hc)">
    <path d="${pulse}" fill="none" stroke="#FFF" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" opacity="0.95"/>
  </g>
</svg>`;
}

function foregroundSvg(size = 512) {
  const heart = 'M256 418 C230 394 72 284 72 186 C72 110 128 62 196 62 C236 62 256 98 256 120 C256 98 276 62 316 62 C384 62 440 110 440 186 C440 284 282 394 256 418Z';
  const pulse = 'M56 240 L188 240 L222 240 L244 148 L264 332 L286 240 L322 240 L456 240';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="hf" x1="256" y1="62" x2="256" y2="418" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#EF5350"/>
      <stop offset="100%" stop-color="#C62828"/>
    </linearGradient>
    <clipPath id="hc">
      <path d="${heart}"/>
    </clipPath>
  </defs>
  <path d="${heart}" fill="url(#hf)"/>
  <g clip-path="url(#hc)">
    <path d="${pulse}" fill="none" stroke="#FFF" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" opacity="0.95"/>
  </g>
</svg>`;
}

async function ensureDir(dir) {
  await mkdir(dir, { recursive: true });
}

async function renderPng(svgString, size, outPath) {
  await sharp(Buffer.from(svgString), { density: 2048 })
    .resize(size, size, { fit: 'cover' })
    .png()
    .toFile(outPath);
}

async function run() {
  const master = masterSvg(512);
  const foreground = foregroundSvg(512);

  await ensureDir(PUBLIC_ICONS);

  // Save source SVGs used by web surfaces.
  await writeFile(join(PUBLIC_ICONS, 'icon-master.svg'), master, 'utf8');
  await writeFile(join(ROOT, 'public', 'favicon.svg'), masterSvg(32), 'utf8');
  await writeFile(join(ROOT, 'public', 'apple-touch-icon.svg'), masterSvg(180), 'utf8');
  console.log('Saved SVG masters.');

  // Web/PWA icons (SVG + PNG pairs).
  console.log('\nGenerating web/PWA icons...');
  for (const size of WEB_ICONS) {
    const svgPath = join(PUBLIC_ICONS, `icon-${size}x${size}.svg`);
    const pngPath = join(PUBLIC_ICONS, `icon-${size}x${size}.png`);
    await writeFile(svgPath, masterSvg(size), 'utf8');
    await renderPng(master, size, pngPath);
    console.log(`  icon-${size}x${size}.{svg,png}`);
  }

  // Root favicons.
  await renderPng(master, 32, join(ROOT, 'public', 'favicon.png'));
  await renderPng(master, 180, join(ROOT, 'public', 'apple-touch-icon.png'));
  console.log('\nGenerated favicon + apple-touch-icon.');

  // Android launcher + round icons.
  console.log('\nGenerating Android launcher icons...');
  for (const [folder, size] of Object.entries(ANDROID_MIPMAP)) {
    const dir = join(ANDROID_RES, folder);
    await ensureDir(dir);

    const standardPath = join(dir, 'ic_launcher.png');
    const roundPath = join(dir, 'ic_launcher_round.png');
    await renderPng(master, size, standardPath);

    const roundMask = Buffer.from(
      `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white"/></svg>`
    );
    await sharp(standardPath)
      .composite([{ input: roundMask, blend: 'dest-in' }])
      .png()
      .toFile(roundPath);

    console.log(`  ${folder}: ${size}px`);
  }

  // Android adaptive foreground icons.
  console.log('\nGenerating Android adaptive icon foregrounds...');
  for (const [folder, size] of Object.entries(ANDROID_FOREGROUND)) {
    const dir = join(ANDROID_RES, folder);
    await ensureDir(dir);
    const out = join(dir, 'ic_launcher_foreground.png');

    const foregroundSize = Math.round(size * 0.72);
    const pad = Math.round((size - foregroundSize) / 2);
    const fg = await sharp(Buffer.from(foreground), { density: 2048 })
      .resize(foregroundSize, foregroundSize, { fit: 'contain' })
      .png()
      .toBuffer();

    await sharp({
      create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .composite([{ input: fg, left: pad, top: pad }])
      .png()
      .toFile(out);

    console.log(`  ${folder} foreground: ${size}px`);
  }

  // iOS AppIcon source (1024x1024).
  await renderPng(master, 1024, IOS_APPICON);
  console.log('\nGenerated iOS AppIcon (1024x1024).');

  console.log('\nAll icons generated successfully.');
}

run().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
