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
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="mw-bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0C2F4A"/>
      <stop offset="100%" stop-color="#1D6FA8"/>
    </linearGradient>
    <linearGradient id="mw-cross" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0B3656"/>
      <stop offset="100%" stop-color="#145984"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="512" height="512" rx="112" fill="url(#mw-bg)"/>
  <rect x="42" y="42" width="428" height="428" rx="96" fill="#FFFFFF" opacity="0.08"/>
  <path d="M256 86c-70 0-137 29-172 58-9 8-14 19-14 31v102c0 98 59 179 178 231 5 2 11 2 16 0 119-52 178-133 178-231V175c0-12-5-23-14-31-35-29-102-58-172-58z" fill="#FFFFFF"/>
  <rect x="230" y="178" width="52" height="186" rx="14" fill="url(#mw-cross)"/>
  <rect x="163" y="245" width="186" height="52" rx="14" fill="url(#mw-cross)"/>
</svg>`;
}

function foregroundSvg(size = 512) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <path d="M256 86c-70 0-137 29-172 58-9 8-14 19-14 31v102c0 98 59 179 178 231 5 2 11 2 16 0 119-52 178-133 178-231V175c0-12-5-23-14-31-35-29-102-58-172-58z" fill="#FFFFFF"/>
  <rect x="230" y="178" width="52" height="186" rx="14" fill="#145984"/>
  <rect x="163" y="245" width="186" height="52" rx="14" fill="#145984"/>
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
