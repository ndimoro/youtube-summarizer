const sharp = require('sharp');
const path = require('path');

async function cropLoadingScreenshot() {
  const inputPath = path.join(__dirname, '../chrome-store-submission/images/screenshot-2-analysis-loading-original.png');
  const outputPath = path.join(__dirname, '../chrome-store-submission/images/screenshot-2-analysis-loading.png');

  const image = sharp(inputPath);
  const metadata = await image.metadata();

  console.log(`Original size: ${metadata.width}x${metadata.height}`);

  // Scale to 1280 width, then crop from top
  const scaledWidth = 1280;
  const scaledHeight = Math.round(metadata.height * (scaledWidth / metadata.width));

  await image
    .resize(scaledWidth, scaledHeight, { fit: 'fill' })
    .extract({ left: 0, top: 0, width: 1280, height: 800 })
    .toFile(outputPath);

  console.log('✓ Cropped from top, saved to screenshot-2-analysis-loading.png');
  console.log('Final size: 1280x800');
}

cropLoadingScreenshot().catch(console.error);
