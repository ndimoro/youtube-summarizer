# GitHub Update Guide for Beginners

This guide will help you push your changes to GitHub and create a new release.

## Part 1: Push Your Code Changes to GitHub

### Step 1: Review What Changed

See what files you modified:
```bash
git status
```

You should see:
- Modified: `README.md`, `INSTALLATION.md`
- New files: `RELEASE_GUIDE.md`, `docs/INSTALLATION_VISUAL_GUIDE.md`

### Step 2: Add Files to Staging

Add all the files you want to commit:
```bash
git add README.md INSTALLATION.md RELEASE_GUIDE.md docs/INSTALLATION_VISUAL_GUIDE.md
```

Or add everything at once:
```bash
git add .
```

### Step 3: Create a Commit

Save your changes with a descriptive message:
```bash
git commit -m "Improve installation instructions and add extension-only download option"
```

### Step 4: Push to GitHub

Upload your changes to GitHub:
```bash
git push origin main
```

**Done!** Your code is now on GitHub. Wait a few seconds, then refresh your GitHub repo page to see the changes.

---

## Part 2: Create a GitHub Release with the Extension ZIP

### Step 1: Go to Your Repository

Open in browser:
```
https://github.com/ndimoro/youtube-summarizer
```

### Step 2: Navigate to Releases

1. Click on **"Releases"** in the right sidebar (or go to `/releases`)
2. Click the **"Draft a new release"** button

### Step 3: Create a New Tag

In the "Choose a tag" dropdown:
1. Type: `v1.2.1` (or whatever your next version is)
2. Click "Create new tag: v1.2.1 on publish"

### Step 4: Fill in Release Details

**Release title:**
```
v1.2.1 - Improved Installation Experience
```

**Description:** (copy/paste this)
```markdown
## What's New

### Improved Installation
- Added extension-only ZIP for easier installation
- Clearer installation instructions in README
- New visual installation guide
- Users no longer confused about which folder to select

### Downloads

**For Users (Recommended):**
- Download `tldw-extension-only-v1.2.1.zip` below
- Unzip and load the `extension` folder into Chrome
- See [Installation Guide](https://github.com/ndimoro/youtube-summarizer/blob/main/INSTALLATION.md) for detailed steps

**For Developers:**
- Download "Source code" for the full repository

### Full Changes
- Updated README.md with clearer installation steps
- Updated INSTALLATION.md with visual guides
- Created RELEASE_GUIDE.md for future releases
- Added extension-only ZIP package

---

**Cost:** Free forever
**Requirements:** API key from Anthropic, OpenAI, or Google
**Typical cost per video:** $0.01-0.03
```

### Step 5: Attach the Extension ZIP

1. Scroll down to the "Attach binaries" section
2. Click in the box or drag and drop
3. Upload this file:
   ```
   chrome-store-submission/extension-zip/tldw-extension-only-v1.2.0.zip
   ```
4. **Important:** After uploading, you can rename it in the interface to:
   ```
   tldw-extension-only-v1.2.1.zip
   ```
   (Match your release version number)

### Step 6: Publish Release

1. Review everything looks correct
2. Make sure "Set as the latest release" is checked
3. Click **"Publish release"**

**Done!** Your release is live.

---

## Part 3: Verify Everything Worked

### Check Your Release Page

Go to:
```
https://github.com/ndimoro/youtube-summarizer/releases/latest
```

You should see:
```
Assets ▼
  📦 tldw-extension-only-v1.2.1.zip
  📄 Source code (zip)
  📄 Source code (tar.gz)
```

### Test the Download

1. Click on `tldw-extension-only-v1.2.1.zip`
2. Download it
3. Unzip it
4. Verify you get just the `extension/` folder
5. Try loading it into Chrome to make sure it works

---

## Common Issues

### "Permission denied" when pushing
- Make sure you're logged into GitHub in your terminal
- You may need to set up authentication: https://docs.github.com/en/authentication

### "Your branch is behind origin/main"
- Someone else made changes, pull them first:
  ```bash
  git pull origin main
  ```

### Changes aren't showing on GitHub
- Wait 10-30 seconds and refresh the page
- Check you pushed to the right branch: `git push origin main`

### Can't create release
- Make sure you're logged into GitHub
- Check you have permission to create releases on your repo

---

## Quick Reference: Common Git Commands

```bash
# See what changed
git status

# Add specific files
git add filename.md

# Add all changes
git add .

# Save changes with message
git commit -m "Your message here"

# Upload to GitHub
git push origin main

# Download latest from GitHub
git pull origin main

# See recent commits
git log --oneline -5
```

---

## Next Time You Make Changes

1. Make your code changes
2. Run: `git add .`
3. Run: `git commit -m "Description of what you changed"`
4. Run: `git push origin main`
5. Create a new release on GitHub (if needed)

That's it! 🎉
