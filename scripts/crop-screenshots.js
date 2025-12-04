const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const TARGET_WIDTH = 1280;
const TARGET_HEIGHT = 800;

async function cropScreenshot(inputPath, outputPath, strategy = 'top') {
  try {
    const image = sharp(inputPath);
    const metadata = await image.metadata();

    console.log(`Processing ${path.basename(inputPath)}: ${metadata.width}x${metadata.height}`);

    // Calculate aspect ratios
    const targetAspect = TARGET_WIDTH / TARGET_HEIGHT; // 1.6
    const currentAspect = metadata.width / metadata.height;

    let extractOptions;

    if (currentAspect > targetAspect) {
      // Image is wider than target - crop width, keep full height scaled
      const scaledHeight = TARGET_HEIGHT;
      const scaledWidth = Math.round(metadata.width * (scaledHeight / metadata.height));
      const cropX = Math.round((scaledWidth - TARGET_WIDTH) / 2); // Center crop

      await image
        .resize(scaledWidth, scaledHeight, { fit: 'fill' })
        .extract({ left: cropX, top: 0, width: TARGET_WIDTH, height: TARGET_HEIGHT })
        .toFile(outputPath);

    } else {
      // Image is taller than target - crop height, keep full width scaled
      const scaledWidth = TARGET_WIDTH;
      const scaledHeight = Math.round(metadata.height * (scaledWidth / metadata.width));

      let cropY;
      if (strategy === 'top') {
        // Crop from top (show header and beginning of content)
        cropY = 0;
      } else if (strategy === 'middle') {
        // Crop from middle
        cropY = Math.round((scaledHeight - TARGET_HEIGHT) / 2);
      } else if (strategy === 'bottom') {
        // Crop from bottom (show export buttons, etc.)
        cropY = scaledHeight - TARGET_HEIGHT;
      } else if (typeof strategy === 'number') {
        // Custom offset from top
        cropY = Math.round(strategy * scaledHeight);
      }

      await image
        .resize(scaledWidth, scaledHeight, { fit: 'fill' })
        .extract({ left: 0, top: cropY, width: TARGET_WIDTH, height: TARGET_HEIGHT })
        .toFile(outputPath);
    }

    console.log(`✓ Saved to ${path.basename(outputPath)}`);

  } catch (error) {
    console.error(`Error processing ${inputPath}:`, error.message);
  }
}

async function main() {
  const inputDir = path.join(__dirname, '../chrome-store-submission/images');
  const outputDir = path.join(__dirname, '../chrome-store-submission/images/resized');

  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Define cropping strategies for each screenshot
  const screenshots = [
    {
      input: 'screenshot-1-youtube-ai-summary.png',
      output: 'screenshot-1-youtube-ai-summary.png',
      strategy: 'top' // Show header, title, and summary section
    },
    {
      input: 'screenshot-2-analysis-loading.png',
      output: 'screenshot-2-analysis-loading.png',
      strategy: 'middle' // Center the loading state
    },
    {
      input: 'screenshot-3-api-key-required.png',
      output: 'screenshot-3-api-key-required.png',
      strategy: 'middle' // Center the API key prompt
    },
    {
      input: 'screenshot-4-export-options.png',
      output: 'screenshot-4-export-options.png',
      strategy: 0.4 // Show key revelations and export buttons
    },
    {
      input: 'screenshot-5-settings-page.png',
      output: 'screenshot-5-settings-page.png',
      strategy: 'top' // Show settings header and main options
    }
  ];

  for (const screenshot of screenshots) {
    const inputPath = path.join(inputDir, screenshot.input);
    const outputPath = path.join(outputDir, screenshot.output);

    if (fs.existsSync(inputPath)) {
      await cropScreenshot(inputPath, outputPath, screenshot.strategy);
    } else {
      console.warn(`⚠ File not found: ${screenshot.input}`);
    }
  }

  console.log('\n✓ All screenshots processed!');
  console.log(`Output directory: ${outputDir}`);
}

main().catch(console.error);
