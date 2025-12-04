const sharp = require('sharp');
const path = require('path');

async function createPromoSmall() {
  const largePath = path.join(__dirname, '../chrome-store-submission/images/promo-large-920x680.png');
  const outputPath = path.join(__dirname, '../chrome-store-submission/images/promo-small-440x280.png');

  // Load and resize the large promo to small dimensions
  // This will maintain the same design elements
  await sharp(largePath)
    .resize(440, 280, {
      fit: 'cover',
      position: 'center'
    })
    .flatten({ background: { r: 255, g: 255, b: 255 } }) // Remove alpha channel, use white background
    .png({ compressionLevel: 9, palette: false }) // 24-bit PNG, no alpha
    .toFile(outputPath);

  console.log('✓ Created promo-small-440x280.png');
  console.log('  Dimensions: 440x280');
  console.log('  Format: 24-bit PNG (no alpha)');
}

createPromoSmall().catch(console.error);
