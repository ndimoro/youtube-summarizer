# Privacy Policy for TL;DW - YouTube Video Summarizer

**Last Updated: December 2024**

## The Short Version

TL;DW is **100% free and open source**. We don't collect your data because:
1. We don't want it
2. We have no servers to store it
3. The entire extension runs locally in your browser

Your API key and video data go directly to your chosen AI provider. We never see it.

---

## About TL;DW

TL;DW is a free, open source Chrome extension that summarizes YouTube videos using AI. There are no fees, no subscriptions, and no premium tiers. The only cost is what you pay your AI provider (typically $0.01-0.03 per video).

**Source Code**: [github.com/ndimoro/tldw-youtube-summarizer](https://github.com/ndimoro/tldw-youtube-summarizer)

---

## Data We Collect

**None.**

We don't collect:
- Personal information
- Usage analytics
- Browsing history
- Video transcripts
- API keys
- Anything else

This isn't a marketing statement. It's architecturally impossible for us to collect your data - the extension has no server component.

---

## Data Processed Locally

The following data is stored **on your device only** using Chrome's local storage:

| Data | Purpose | Shared With |
|------|---------|-------------|
| API Key | Authenticate with your AI provider | Your chosen AI provider only |
| Settings | Remember your preferences | No one |
| Integration config | Obsidian/Logseq export settings | No one |

---

## Third-Party Services

When you analyze a video, the transcript is sent to your chosen AI provider:

- **Anthropic** (Claude): [anthropic.com/privacy](https://www.anthropic.com/privacy)
- **OpenAI** (GPT-4): [openai.com/privacy](https://openai.com/privacy)
- **Google** (Gemini): [policies.google.com/privacy](https://policies.google.com/privacy)

This is the only external communication. You choose the provider. You provide the API key. You control the data.

---

## Permissions Explained

| Permission | Why We Need It |
|------------|----------------|
| `activeTab` | Read the current YouTube page to get video info |
| `storage` | Save your settings locally |
| `scripting` | Extract video transcripts from YouTube |
| `clipboardWrite` | Copy summaries when you click "Copy" |

| Host Access | Why We Need It |
|-------------|----------------|
| `youtube.com` | Extract transcripts |
| `api.anthropic.com` | Send to Claude (if selected) |
| `api.openai.com` | Send to GPT-4 (if selected) |
| `googleapis.com` | Send to Gemini (if selected) |

---

## Security

- All API calls use HTTPS encryption
- API keys stored in Chrome's secure local storage
- No remote code execution
- No external scripts loaded
- Fully auditable open source code

---

## Children's Privacy

This extension is not directed at children under 13.

---

## Changes to This Policy

Updates will be reflected in the "Last Updated" date. The extension is open source, so any changes are publicly visible in the git history.

---

## Open Source Commitment

TL;DW will remain **free and open source forever**. No premium tiers. No "pro" version. No subscriptions.

If you don't trust this policy, read the code yourself.

---

## Contact

**Email**: support@tldw.movermarketing.ai
**GitHub**: [github.com/ndimoro/tldw-youtube-summarizer](https://github.com/ndimoro/tldw-youtube-summarizer)
**Developer**: Nick DiMoro

---

## Summary

| Question | Answer |
|----------|--------|
| Is it really free? | Yes, forever. You only pay AI provider fees. |
| Do you collect data? | No. We have no servers. |
| Do you track users? | No. |
| Where is my API key? | On your device only. |
| Who sees my transcripts? | Only your chosen AI provider. |
| Is it open source? | Yes. Read every line. |
| Will there be a paid version? | No. Never. |
