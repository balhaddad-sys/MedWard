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
    <linearGradient id="bg" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#071E33"/>
      <stop offset="50%" stop-color="#0E3A5E"/>
      <stop offset="100%" stop-color="#1565C0"/>
    </linearGradient>
    <radialGradient id="glow" cx="30%" cy="25%" r="65%">
      <stop offset="0%" stop-color="#42A5F5" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#071E33" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="hf" x1="256" y1="68" x2="256" y2="395" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#E0E8F0"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#bg)"/>
  <rect width="512" height="512" rx="112" fill="url(#glow)"/>
  <path d="M256 395 C256 395 88 272 88 180 C88 108 140 68 196 68 C232 68 253 100 256 120 C259 100 280 68 316 68 C372 68 424 108 424 180 C424 272 256 395 256 395Z" fill="#000" opacity="0.15" transform="translate(0,8)"/>
  <path d="M256 395 C256 395 88 272 88 180 C88 108 140 68 196 68 C232 68 253 100 256 120 C259 100 280 68 316 68 C372 68 424 108 424 180 C424 272 256 395 256 395Z" fill="url(#hf)"/>
  <path d="M256 395 C256 395 88 272 88 180 C88 108 140 68 196 68 C232 68 253 100 256 120 C259 100 280 68 316 68 C372 68 424 108 424 180 C424 272 256 395 256 395Z" fill="none" stroke="#FFF" stroke-width="1.5" opacity="0.2"/>
  <path d="M70 240 L178 240 L218 240 L242 142 L262 335 L284 240 L326 240 L442 240" fill="none" stroke="#42A5F5" stroke-width="11" stroke-linecap="round" stroke-linejoin="round" opacity="0.25"/>
  <path d="M70 240 L178 240 L218 240 L242 142 L262 335 L284 240 L326 240 L442 240" fill="none" stroke="#1976D2" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
}

function foregroundSvg(size = 512) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <path d="M256 395 C256 395 88 272 88 180 C88 108 140 68 196 68 C232 68 253 100 256 120 C259 100 280 68 316 68 C372 68 424 108 424 180 C424 272 256 395 256 395Z" fill="#FFFFFF"/>
  <path d="M70 240 L178 240 L218 240 L242 142 L262 335 L284 240 L326 240 L442 240" fill="none" stroke="#1976D2" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>
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
