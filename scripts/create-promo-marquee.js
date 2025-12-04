const sharp = require('sharp');
const path = require('path');

async function createPromoMarquee() {
  const largePath = path.join(__dirname, '../chrome-store-submission/images/promo-large-920x680.png');
  const outputPath = path.join(__dirname, '../chrome-store-submission/images/marquee-1400x560.png');

  // Load and resize the large promo to marquee dimensions
  // Use a wider aspect ratio suitable for marquee display
  await sharp(largePath)
    .resize(1400, 560, {
      fit: 'cover',
      position: 'center'
    })
    .flatten({ background: { r: 255, g: 255, b: 255 } }) // Remove alpha channel, use white background
    .png({ compressionLevel: 9, palette: false }) // 24-bit PNG, no alpha
    .toFile(outputPath);

  console.log('✓ Created marquee-1400x560.png');
  console.log('  Dimensions: 1400x560');
  console.log('  Format: 24-bit PNG (no alpha)');
}

createPromoMarquee().catch(console.error);
