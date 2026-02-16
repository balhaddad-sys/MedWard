/**
 * generate-icons.mjs
 * Extracts the largest icon from the composite unnamed.jpg
 * and generates all required Android mipmap + web PWA icon sizes.
 */
import sharp from 'sharp';
import { mkdir, copyFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SOURCE = join(ROOT, 'unnamed.jpg');

// Android mipmap sizes for launcher icons
const ANDROID_MIPMAP = {
  'mipmap-mdpi':    48,
  'mipmap-hdpi':    72,
  'mipmap-xhdpi':   96,
  'mipmap-xxhdpi':  144,
  'mipmap-xxxhdpi': 192,
};

// Android adaptive icon foreground sizes (108dp * density)
const ANDROID_FOREGROUND = {
  'mipmap-mdpi':    108,
  'mipmap-hdpi':    162,
  'mipmap-xhdpi':   216,
  'mipmap-xxhdpi':  324,
  'mipmap-xxxhdpi': 432,
};

// Web/PWA icon sizes
const WEB_ICONS = [72, 96, 128, 144, 152, 192, 384, 512];

const ANDROID_RES = join(ROOT, 'android', 'app', 'src', 'main', 'res');
const PUBLIC_ICONS = join(ROOT, 'public', 'icons');

async function ensureDir(dir) {
  await mkdir(dir, { recursive: true });
}

async function run() {
  console.log('Reading source image...');
  const meta = await sharp(SOURCE).metadata();
  console.log(`Source: ${meta.width}x${meta.height}`);

  // The composite image has the 180x180 icon in the top-left area.
  // We need to crop just that icon. Let's estimate the crop area.
  // The 180x180 icon appears to be roughly in the top-left 40% of the image,
  // with some padding. Let's crop a square from the top-left region.

  const cropSize = Math.min(Math.floor(meta.width * 0.48), Math.floor(meta.height * 0.52));
  const cropLeft = Math.floor(meta.width * 0.01);
  const cropTop = Math.floor(meta.height * 0.01);

  console.log(`Cropping icon region: ${cropSize}x${cropSize} from (${cropLeft}, ${cropTop})`);

  // Extract the icon region and make a clean square
  const iconBuffer = await sharp(SOURCE)
    .extract({ left: cropLeft, top: cropTop, width: cropSize, height: cropSize })
    .png()
    .toBuffer();

  // Save the extracted icon for reference
  const extractedPath = join(ROOT, 'icon-extracted.png');
  await sharp(iconBuffer).toFile(extractedPath);
  console.log(`Saved extracted icon to icon-extracted.png`);

  // --- Android launcher icons (ic_launcher.png) ---
  console.log('\nGenerating Android launcher icons...');
  for (const [folder, size] of Object.entries(ANDROID_MIPMAP)) {
    const dir = join(ANDROID_RES, folder);
    await ensureDir(dir);

    // Standard launcher icon
    await sharp(iconBuffer)
      .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .png()
      .toFile(join(dir, 'ic_launcher.png'));

    // Round launcher icon
    // Create a circular mask
    const roundMask = Buffer.from(
      `<svg width="${size}" height="${size}"><circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="white"/></svg>`
    );

    await sharp(iconBuffer)
      .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .png()
      .composite([{ input: roundMask, blend: 'dest-in' }])
      .toFile(join(dir, 'ic_launcher_round.png'));

    console.log(`  ${folder}: ${size}x${size}`);
  }

  // --- Android adaptive icon foreground ---
  console.log('\nGenerating Android adaptive icon foregrounds...');
  for (const [folder, size] of Object.entries(ANDROID_FOREGROUND)) {
    const dir = join(ANDROID_RES, folder);
    await ensureDir(dir);

    // For adaptive icons, the icon should be centered with padding
    // The safe zone is the inner 66% of the canvas
    const iconSize = Math.round(size * 0.66);
    const padding = Math.round((size - iconSize) / 2);

    const resizedIcon = await sharp(iconBuffer)
      .resize(iconSize, iconSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    // Create transparent canvas and composite the icon centered
    await sharp({
      create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
    })
      .png()
      .composite([{ input: resizedIcon, left: padding, top: padding }])
      .toFile(join(dir, 'ic_launcher_foreground.png'));

    console.log(`  ${folder} foreground: ${size}x${size}`);
  }

  // --- Web/PWA icons ---
  console.log('\nGenerating web/PWA icons...');
  await ensureDir(PUBLIC_ICONS);

  for (const size of WEB_ICONS) {
    await sharp(iconBuffer)
      .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .png()
      .toFile(join(PUBLIC_ICONS, `icon-${size}x${size}.png`));
    console.log(`  icon-${size}x${size}.png`);
  }

  // --- Favicon ---
  console.log('\nGenerating favicon...');
  await sharp(iconBuffer)
    .resize(32, 32, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toFile(join(ROOT, 'public', 'favicon.png'));

  // Also generate apple-touch-icon
  await sharp(iconBuffer)
    .resize(180, 180, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toFile(join(ROOT, 'public', 'apple-touch-icon.png'));

  console.log('\nAll icons generated successfully!');
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
