# TL;DW - YouTube Video Summarizer

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub release](https://img.shields.io/github/v/release/ndimoro/youtube-summarizer)](https://github.com/ndimoro/youtube-summarizer/releases)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/ndimoro/youtube-summarizer/pulls)

A free, open source Chrome extension that summarizes YouTube videos using AI. Get concise summaries, key revelations, and actionable takeaways in seconds.

**100% Free. No subscriptions. No premium tiers. Ever.**

<img src="docs/assets/product-screenshot.png" alt="TL;DW Screenshot" width="40%">

## Why TL;DW?

- **Truly Free** - No subscriptions, premium tiers, or hidden costs. Just pay your AI provider directly.
- **Privacy First** - No accounts, no tracking, no data collection. Your API keys never leave your device.
- **5 Export Integrations** - One-click export to Obsidian, Capacities, Craft, Bear, and Logseq.
- **Your Choice of AI** - Use Claude, GPT-4, or Gemini. Switch anytime.
- **Open Source** - Fully transparent code. Contribute or fork as you like.
- **Customizable** - Extensive settings for each integration to match your workflow.

## Features

### Core Features
- **Instant Summaries** - Analyze any YouTube video with captions in seconds
- **Key Revelations** - Extract the most important insights automatically
- **Actionable Takeaways** - Get practical next steps from every video
- **Multiple AI Providers** - Choose from Claude, GPT-4, or Gemini
- **Beautiful UI** - Clean, newspaper-inspired interface

### Export Integrations

Export summaries with one click to your favorite note-taking app:

| App | Export Method | Video Thumbnail |
|-----|---------------|-----------------|
| [Obsidian](https://obsidian.md) | Opens app directly | ✅ |
| [Capacities](https://capacities.io) | Opens app directly | ✅ |
| [Craft](https://craft.do) | Opens app directly | ✅ |
| [Bear](https://bear.app) | Opens app directly | ✅ |
| [Logseq](https://logseq.com) | Copy to clipboard | ✅ |

**Plus:** Standard Copy and Download options for any markdown-compatible app.

All exports include:
- Video metadata (channel, duration, views, publish date)
- Clickable video thumbnail
- Full summary with revelations and takeaways
- Properly formatted markdown

## Installation

### From Chrome Web Store
*(Coming soon)*

### Manual Installation

1. Download the [latest release](https://github.com/ndimoro/youtube-summarizer/releases/latest)
2. Unzip the downloaded file
3. **Important:** Inside the unzipped folder, locate the `extension` folder
   - The download contains the full repository
   - You only need the `extension` folder for Chrome
   - Path will look like: `youtube-summarizer-1.2.0/extension/`
4. Open Chrome and go to `chrome://extensions/`
5. Enable "Developer mode" (toggle in top right corner)
6. Click "Load unpacked" button
7. Navigate to and select the `extension` folder (from step 3)

## Setup

1. Click the TL;DW extension icon
2. Choose your AI provider (Claude, GPT-4, or Gemini)
3. Enter your API key from:
   - [Anthropic Console](https://console.anthropic.com/) for Claude
   - [OpenAI Platform](https://platform.openai.com/api-keys) for GPT-4
   - [Google AI Studio](https://aistudio.google.com/apikey) for Gemini
4. Start summarizing videos

## Usage

### Analyzing Videos

1. Navigate to any YouTube video
2. Click the TL;DW extension icon
3. Click "Analyze Video"
4. Wait a few seconds
5. Read your summary

### Exporting Summaries

**One-Click Export (Obsidian, Capacities, Craft, Bear):**
- Click the app icon in the popup
- The app opens automatically with your summary ready

**Copy to Clipboard (Logseq or any app):**
- Click "Copy" or the Logseq icon
- Paste into your note-taking app

**Download as File:**
- Click "Download"
- Save the `.md` file anywhere

## Customization

### Integration Settings

Each export integration can be customized in the Options page:

**Obsidian:**
- Vault name and folder path
- Video thumbnail toggle
- Callout style for revelations

**Capacities:**
- YAML frontmatter toggle
- Wikilinks for channel names
- Custom tags
- Hashtag support for insights

**Craft:**
- Space ID and folder ID
- Metadata and thumbnail toggles

**Bear:**
- Default tags
- Pin notes option
- Thumbnail toggle

**Logseq:**
- Page properties
- Block-based formatting
- Thumbnail toggle

### Access Settings

Click the gear icon in the extension popup or right-click the extension icon → Options.

## Cost

The extension is free. You only pay your AI provider directly:
- ~$0.01-0.03 per video depending on length
- New Anthropic accounts get free credits

## Privacy

- No accounts required
- No data collection
- No tracking
- API keys stored locally on your device
- Transcripts sent only to your chosen AI provider

See our full [Privacy Policy](https://tldw.nickdimoro.com/privacy).

## Tech Stack

- Manifest V3 Chrome Extension
- Vanilla JavaScript
- Claude / GPT-4 / Gemini APIs

## Contributing

Contributions are welcome! Please read our [Contributing Guidelines](CONTRIBUTING.md) before submitting a PR.

## FAQ

**Q: Which videos can be summarized?**
A: Any YouTube video with captions (auto-generated or manual). Most videos have captions.

**Q: How long does it take?**
A: Usually 3-10 seconds, depending on video length and AI provider response time.

**Q: What's the maximum video length I can summarize?**
A: The limit depends on your AI provider and speaking speed. For above-average speaking speed (~170 words per minute):
- **GPT-4 (OpenAI)**: ~9 hours
- **Claude Sonnet (Anthropic)**: ~15 hours
- **Gemini Flash (Google)**: ~75 hours

Most YouTube videos fall well within these limits. Longer videos may take slightly more time to process.

**Q: Can I use this without a note-taking app?**
A: Yes! Use the "Copy" or "Download" buttons to save summaries anywhere.

**Q: Which AI provider is best?**
A: Claude (Anthropic) generally provides the best summaries, but all three work great. Try them and see what you prefer.

**Q: Does this work with YouTube Music or Shorts?**
A: It works with any YouTube video that has captions, including Shorts if they have captions.

**Q: Can I customize the summary format?**
A: Each export integration has customization options. Click the gear icon to access settings.

**Q: Is my API key safe?**
A: Yes. Your API key is stored locally on your device using Chrome's secure storage. It's never sent anywhere except directly to your chosen AI provider.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- Website: [tldw.nickdimoro.com](https://tldw.nickdimoro.com)
- Issues: [GitHub Issues](https://github.com/ndimoro/youtube-summarizer/issues)
- Contributions: [Contributing Guidelines](CONTRIBUTING.md)
