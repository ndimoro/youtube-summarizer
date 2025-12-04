const sharp = require('sharp');
const path = require('path');

async function updatePromoLarge() {
  const inputPath = path.join(__dirname, '../chrome-store-submission/images/promo-large-920x680.png');
  const outputPath = path.join(__dirname, '../chrome-store-submission/images/promo-large-920x680-updated.png');

  // Load the original image
  const baseImage = await sharp(inputPath).toBuffer();

  // Create SVG overlay with YouTube badge and "Not the chatter." text
  const svgOverlay = `
    <svg width="920" height="680" xmlns="http://www.w3.org/2000/svg">
      <!-- YouTube Badge (bottom left) -->
      <rect x="20" y="618" width="150" height="42" rx="4" fill="#FF0000"/>
      <text x="95" y="645" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="white" text-anchor="middle">YouTube</text>

      <!-- "Not the chatter." text underneath "Get the insights" -->
      <text x="26" y="145" font-family="Arial, sans-serif" font-size="24" font-weight="normal" fill="#333333">Not the chatter.</text>
    </svg>
  `;

  // Composite the SVG overlay onto the base image
  await sharp(baseImage)
    .composite([
      {
        input: Buffer.from(svgOverlay),
        top: 0,
        left: 0
      }
    ])
    .toFile(outputPath);

  console.log('✓ Updated promo image saved to promo-large-920x680-updated.png');
}

updatePromoLarge().catch(console.error);
