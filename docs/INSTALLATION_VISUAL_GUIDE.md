# Visual Installation Guide

## Step 1: Download the Right File

Go to the [latest release](https://github.com/ndimoro/youtube-summarizer/releases/latest) and look for the **Assets** section:

```
Assets ▼
  📦 tldw-extension-only-v1.2.0.zip    ⬅️ DOWNLOAD THIS (Recommended)
  📄 Source code (zip)
  📄 Source code (tar.gz)
```

**Why the extension-only ZIP?**
- Smaller download (536 KB vs 4.3 MB)
- Ready to use immediately
- No confusion about which folder to select

## Step 2: Unzip the File

After downloading, unzip `tldw-extension-only-v1.2.0.zip`

You'll get a folder structure like this:

```
📁 extension/
  ├── 📁 background/
  ├── 📁 content/
  ├── 📁 icons/
  ├── 📁 integrations/
  ├── 📁 onboarding/
  ├── 📁 options/
  ├── 📁 popup/
  ├── 📁 utils/
  └── 📄 manifest.json
```

This `extension/` folder is what you'll load into Chrome.

## Step 3: Load into Chrome

### 3a. Open Chrome Extensions

Type in the address bar:
```
chrome://extensions/
```

### 3b. Enable Developer Mode

Look for the toggle switch in the **top right corner**:

```
[🔘 Developer mode]  ⬅️ Turn this ON
```

### 3c. Click "Load unpacked"

You'll see a new button appear:

```
[+ Load unpacked]  ⬅️ Click this
```

### 3d. Select the Extension Folder

In the file picker:
1. Navigate to where you unzipped the file
2. Select the **extension** folder
3. Click "Select" or "Choose"

**Important:** Select the `extension` folder itself, not a parent folder!

```
✅ CORRECT:
   Select → extension/

❌ WRONG:
   Select → youtube-summarizer-1.2.0/
```

## Step 4: Verify Installation

After loading, you should see TL;DW appear in your extensions list:

```
TL;DW - YouTube Video Summarizer
🟢 Enabled    Details    Remove
```

The extension icon should also appear in your Chrome toolbar.

## Alternative: Using Full Source Code

If you downloaded `Source code (zip)` instead:

1. Unzip the file
2. You'll get a folder like `youtube-summarizer-1.2.0/`
3. **Navigate inside** to find the `extension/` folder
4. Use that `extension/` folder in Step 3d above

The path will be:
```
youtube-summarizer-1.2.0/
  └── extension/  ⬅️ This is what you select
```

## Troubleshooting

### "Cannot load extension"
- Make sure Developer mode is enabled
- Check that you selected the `extension` folder (not its parent)
- Look for error messages in the extensions page

### "Manifest file is missing"
- You selected the wrong folder
- Make sure you're selecting the folder that contains `manifest.json`

### Extension icon doesn't appear
- Click the puzzle piece icon in Chrome toolbar
- Pin TL;DW to make it always visible

## Next Steps

Once installed:
1. Get your API key from [Anthropic](https://console.anthropic.com/), [OpenAI](https://platform.openai.com/), or [Google](https://aistudio.google.com/)
2. Click the TL;DW icon
3. Go to Settings
4. Enter your API key
5. Start summarizing videos!

---

**Need help?** Open an [issue](https://github.com/ndimoro/youtube-summarizer/issues) or email support@tldw.movermarketing.ai
