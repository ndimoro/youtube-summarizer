# Privacy Policy for YouTube Summarizer (TL;DW)

**Last Updated:** December 2, 2024

## Overview

YouTube Summarizer (TL;DW) is a browser extension that helps you get AI-powered summaries of YouTube videos. We are committed to protecting your privacy and being transparent about our data practices.

## Data Collection and Storage

### What We Store Locally

All data is stored locally on your device using Chrome's built-in storage APIs:

- **API Keys**: Your AI provider API key (Anthropic, OpenAI, or Google) is stored locally in your browser and never transmitted to our servers.
- **Settings**: Your preferences for Obsidian/Logseq integration (vault names, folder paths, export options).
- **Cached Summaries**: Video summaries are cached locally to avoid re-analyzing the same video.

### What We Do NOT Collect

- We do not collect any personal information
- We do not track your browsing activity
- We do not store data on external servers
- We do not use analytics or tracking tools
- We do not sell or share any data with third parties

## Data Transmitted to Third Parties

When you analyze a video, the following data is sent directly from your browser to your chosen AI provider:

| Provider | Data Sent | Their Privacy Policy |
|----------|-----------|---------------------|
| Anthropic | Video transcript | [anthropic.com/privacy](https://www.anthropic.com/privacy) |
| OpenAI | Video transcript | [openai.com/privacy](https://openai.com/privacy) |
| Google | Video transcript | [policies.google.com/privacy](https://policies.google.com/privacy) |

**Important**:
- Your API key is sent directly to the AI provider for authentication
- Video transcripts are sent to generate summaries
- We do not intercept, store, or process this data on any intermediate server

## Permissions Explained

| Permission | Why We Need It |
|------------|----------------|
| `activeTab` | To access YouTube video pages and extract transcripts |
| `storage` | To save your API key and settings locally |
| `scripting` | To inject the content script that extracts video information |

## Data Security

- API keys are stored using Chrome's secure `chrome.storage.sync` API
- All communication with AI providers uses HTTPS encryption
- No data leaves your browser except direct API calls to your chosen AI provider

## Your Rights

You can:
- **Delete your data** anytime by removing the extension or clearing extension storage
- **View stored data** in Chrome DevTools (Application > Storage > Extension)
- **Export your summaries** using the built-in export features

## Children's Privacy

This extension is not directed at children under 13. We do not knowingly collect information from children.

## Changes to This Policy

We may update this privacy policy from time to time. Changes will be reflected in the "Last Updated" date above.

## Contact

If you have questions about this privacy policy, please open an issue on our GitHub repository:

[github.com/Noctivoro/youtube-summarizer](https://github.com/Noctivoro/youtube-summarizer)

## Open Source

This extension is open source. You can review the complete source code to verify our privacy practices:

[github.com/Noctivoro/youtube-summarizer](https://github.com/Noctivoro/youtube-summarizer)
