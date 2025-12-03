// DOM Elements
const loadingEl = document.getElementById('loading');
const loadingTextEl = loadingEl.querySelector('p');
const errorEl = document.getElementById('error');
const errorMessageEl = document.getElementById('error-message');
const noApiKeyEl = document.getElementById('no-api-key');
const contentEl = document.getElementById('content');
const analyzeButtonContainer = document.getElementById('analyze-button-container');
const analyzeButton = document.getElementById('analyze-button');
const openSettingsButton = document.getElementById('open-settings');
const settingsBtn = document.getElementById('settings-btn');

const videoTitleEl = document.getElementById('video-title');
const summaryEl = document.getElementById('summary');
const revelationsEl = document.getElementById('revelations');
const takeawaysEl = document.getElementById('takeaways');

// Export buttons
const exportCopyBtn = document.getElementById('export-copy');
const exportDownloadBtn = document.getElementById('export-download');
const exportObsidianBtn = document.getElementById('export-obsidian');
const exportLogseqBtn = document.getElementById('export-logseq');
const exportCapacitiesBtn = document.getElementById('export-capacities');
const exportBearBtn = document.getElementById('export-bear');
const exportCraftBtn = document.getElementById('export-craft');

// Toast notification elements
const toastEl = document.getElementById('toast');
let toastTimeout = null;

// State management
let currentState = 'initial';
let currentVideoId = null;
let currentAnalysisData = null;
let storageListener = null;

function setState(state, data = {}) {
  currentState = state;

  // Hide all sections
  loadingEl.classList.add('hidden');
  errorEl.classList.add('hidden');
  noApiKeyEl.classList.add('hidden');
  contentEl.classList.add('hidden');
  analyzeButtonContainer.classList.add('hidden');

  // Show relevant section
  switch(state) {
    case 'initial':
      analyzeButtonContainer.classList.remove('hidden');
      analyzeButton.textContent = 'Analyze Video';
      analyzeButton.disabled = false;
      break;
    case 'loading':
      loadingEl.classList.remove('hidden');
      loadingTextEl.textContent = data.message || 'Analyzing video...';
      break;
    case 'streaming':
      // Show content while streaming
      contentEl.classList.remove('hidden');
      break;
    case 'error':
      errorEl.classList.remove('hidden');
      errorMessageEl.textContent = data.message || 'An error occurred';
      analyzeButtonContainer.classList.remove('hidden');
      analyzeButton.disabled = false;
      break;
    case 'no-api-key':
      noApiKeyEl.classList.remove('hidden');
      break;
    case 'success':
    case 'cached':
      contentEl.classList.remove('hidden');
      analyzeButtonContainer.classList.remove('hidden');
      analyzeButton.textContent = 'Re-analyze';
      analyzeButton.disabled = false;
      break;
  }
}

function displayResults(data, isStreaming = false) {
  // Guard against null/undefined data
  if (!data) {
    console.error('displayResults called with null/undefined data');
    return;
  }

  // Store analysis data for export
  if (!isStreaming) {
    currentAnalysisData = data;
  }

  // Set video title
  videoTitleEl.textContent = data.videoTitle || 'YouTube Video';

  // Set summary - safely create DOM elements
  summaryEl.textContent = '';
  const summary = data.summary;
  if (summary) {
    if (Array.isArray(summary)) {
      summary.forEach(paragraph => {
        if (paragraph) {
          const p = document.createElement('p');
          p.textContent = paragraph;
          summaryEl.appendChild(p);
        }
      });
    } else if (typeof summary === 'string' && summary.trim()) {
      const p = document.createElement('p');
      p.textContent = summary;
      summaryEl.appendChild(p);
    }
  }

  // Add placeholder if no content was added
  if (!summaryEl.hasChildNodes()) {
    if (isStreaming) {
      const p = document.createElement('p');
      p.textContent = 'Generating...';
      p.classList.add('streaming-placeholder');
      summaryEl.appendChild(p);
    } else {
      const p = document.createElement('p');
      p.textContent = 'No summary available';
      p.classList.add('empty-placeholder');
      summaryEl.appendChild(p);
    }
  }

  // Set revelations
  revelationsEl.textContent = '';
  const revelations = data.revelations || [];
  if (revelations.length > 0) {
    revelations.forEach(revelation => {
      if (revelation) {
        const li = document.createElement('li');
        li.textContent = revelation;
        revelationsEl.appendChild(li);
      }
    });
  }

  // Add placeholder if no revelations
  if (!revelationsEl.hasChildNodes() && !isStreaming) {
    const li = document.createElement('li');
    li.textContent = 'No key revelations identified';
    li.classList.add('empty-placeholder');
    revelationsEl.appendChild(li);
  }

  // Set takeaways
  takeawaysEl.textContent = '';
  const takeaways = data.takeaways || [];
  if (takeaways.length > 0) {
    takeaways.forEach(takeaway => {
      if (takeaway) {
        const li = document.createElement('li');
        li.textContent = takeaway;
        takeawaysEl.appendChild(li);
      }
    });
  }

  // Add placeholder if no takeaways
  if (!takeawaysEl.hasChildNodes() && !isStreaming) {
    const li = document.createElement('li');
    li.textContent = 'No takeaways identified';
    li.classList.add('empty-placeholder');
    takeawaysEl.appendChild(li);
  }

  if (!isStreaming) {
    setState('success');
    enableExportButtons();
  }
}

// Enable export buttons when analysis is complete
function enableExportButtons() {
  exportCopyBtn.disabled = false;
  exportDownloadBtn.disabled = false;
  exportObsidianBtn.disabled = false;
  exportLogseqBtn.disabled = false;
  exportCapacitiesBtn.disabled = false;
  exportBearBtn.disabled = false;
  exportCraftBtn.disabled = false;
}

// Disable export buttons
function disableExportButtons() {
  exportCopyBtn.disabled = true;
  exportDownloadBtn.disabled = true;
  exportObsidianBtn.disabled = true;
  exportLogseqBtn.disabled = true;
  exportCapacitiesBtn.disabled = true;
  exportBearBtn.disabled = true;
  exportCraftBtn.disabled = true;
}

// Show success feedback on button
function showButtonSuccess(button) {
  button.classList.add('success');
  button.classList.remove('loading');
  setTimeout(() => {
    button.classList.remove('success');
  }, 1500);
}

// Show loading state on button
function showButtonLoading(button) {
  button.classList.add('loading');
}

// Remove loading state from button
function hideButtonLoading(button) {
  button.classList.remove('loading');
}

// Toast notification system
function showToast(message, type = 'info', duration = 3000) {
  // Clear any existing timeout
  if (toastTimeout) {
    clearTimeout(toastTimeout);
  }

  // Set message and type
  toastEl.textContent = message;
  toastEl.className = `toast ${type}`;

  // Show toast
  requestAnimationFrame(() => {
    toastEl.classList.add('show');
  });

  // Auto-hide after duration
  toastTimeout = setTimeout(() => {
    toastEl.classList.remove('show');
  }, duration);
}

// Generate clean markdown for copy/download
function generateCopyMarkdown(data) {
  // Safely extract data with defaults
  const videoTitle = data?.videoTitle || 'YouTube Video';
  const metadata = data?.metadata || {};
  const summary = data?.summary || '';
  const revelations = data?.revelations || [];
  const takeaways = data?.takeaways || [];

  // Format metadata line
  const metaParts = [];
  if (metadata.publishDate) {
    metaParts.push(formatDate(metadata.publishDate));
  }
  if (metadata.durationFormatted) {
    metaParts.push(metadata.durationFormatted);
  }
  if (metadata.viewCount) {
    metaParts.push(`${formatNumber(metadata.viewCount)} views`);
  }
  const metaLine = metaParts.join(' · ');

  // Build markdown
  let md = `# ${videoTitle}\n\n`;

  // Channel info
  if (metadata.channelName) {
    md += `**Channel**: ${metadata.channelName}\n`;
  }

  // Published metadata line
  if (metaLine) {
    md += `**Published**: ${metaLine}\n`;
  }

  // Source URL
  if (metadata.videoUrl) {
    md += `**Source**: ${metadata.videoUrl}\n`;
  }

  md += `\n---\n\n`;

  // Summary section
  const summaryText = formatSummary(summary);
  if (summaryText) {
    md += `## Summary\n\n${summaryText}\n\n`;
    md += `---\n\n`;
  }

  // Key Revelations section
  if (revelations.length > 0) {
    md += `## Key Revelations\n\n`;
    revelations.forEach((rev, i) => {
      if (rev) {
        const heading = getFirstWords(rev, 5);
        md += `### ${i + 1}. ${heading}\n\n${rev}\n\n`;
      }
    });
    md += `---\n\n`;
  }

  // Takeaways section
  if (takeaways.length > 0) {
    md += `## Takeaways\n\n`;
    takeaways.forEach(t => {
      if (t) {
        md += `- ${t}\n`;
      }
    });
  }

  return md.trim();
}

// Helper: Format summary
function formatSummary(summary) {
  if (Array.isArray(summary)) {
    return summary.join('\n\n');
  }
  return summary || '';
}

// Helper: Get first N words
function getFirstWords(text, count = 5) {
  if (!text) return '';
  const words = text.split(/\s+/).slice(0, count);
  let result = words.join(' ');
  if (text.split(/\s+/).length > count) {
    result += '...';
  }
  return result;
}

// Helper: Format number with commas
function formatNumber(num) {
  if (num === null || num === undefined) return '';
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toLocaleString('en-US');
}

// Helper: Format date
function formatDate(dateString) {
  if (!dateString) return '';
  try {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch (e) {
    return dateString;
  }
}

// Helper: Sanitize filename
function sanitizeFilename(filename) {
  if (!filename) return 'youtube-summary';
  return filename
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 100);
}

// Copy to clipboard
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    // Fallback for older browsers
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    } catch (fallbackError) {
      console.error('Copy failed:', fallbackError);
      return false;
    }
  }
}

// Download as file
function downloadAsFile(content, filename) {
  const safeFilename = sanitizeFilename(filename) + '.md';
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = safeFilename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();

  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

// Handle Copy button click
async function handleCopy() {
  if (!currentAnalysisData) return;

  showButtonLoading(exportCopyBtn);

  try {
    const markdown = generateCopyMarkdown(currentAnalysisData);
    const success = await copyToClipboard(markdown);

    if (success) {
      showButtonSuccess(exportCopyBtn);
      showToast('Copied to clipboard', 'success');
    } else {
      hideButtonLoading(exportCopyBtn);
      showToast('Failed to copy', 'error');
    }
  } catch (error) {
    hideButtonLoading(exportCopyBtn);
    showToast('Failed to copy', 'error');
    console.error('Copy error:', error);
  }
}

// Handle Download button click
function handleDownload() {
  if (!currentAnalysisData) return;

  showButtonLoading(exportDownloadBtn);

  try {
    const markdown = generateCopyMarkdown(currentAnalysisData);
    downloadAsFile(markdown, currentAnalysisData.videoTitle);
    showButtonSuccess(exportDownloadBtn);
    showToast('Download started', 'success');
  } catch (error) {
    hideButtonLoading(exportDownloadBtn);
    showToast('Download failed', 'error');
    console.error('Download error:', error);
  }
}

// ============================================
// Obsidian Integration
// ============================================

const OBSIDIAN_DEFAULT_SETTINGS = {
  vaultName: '',
  folderPath: 'YouTube Summaries',
  includeEmbed: true,
  calloutType: 'tip'
};

async function getObsidianSettings() {
  try {
    const result = await chrome.storage.sync.get(['obsidianSettings']);
    return { ...OBSIDIAN_DEFAULT_SETTINGS, ...result.obsidianSettings };
  } catch {
    return OBSIDIAN_DEFAULT_SETTINGS;
  }
}

function generateObsidianMarkdown(data, settings = {}) {
  const config = { ...OBSIDIAN_DEFAULT_SETTINGS, ...settings };

  // Safely extract data with defaults
  const videoTitle = data?.videoTitle || 'YouTube Video';
  const metadata = data?.metadata || {};
  const summary = data?.summary || '';
  const revelations = data?.revelations || [];
  const takeaways = data?.takeaways || [];
  const analyzedDate = new Date().toISOString().split('T')[0];

  // Build YAML frontmatter
  let md = '---\n';
  md += `title: "${escapeYaml(videoTitle)}"\n`;
  md += 'type: youtube-summary\n';

  if (metadata.videoUrl) {
    md += `source: "${metadata.videoUrl}"\n`;
  }

  const channelName = metadata.channelName || 'Unknown';
  md += `channel: "${escapeYaml(channelName)}"\n`;

  if (metadata.channelUrl) {
    md += `channel_url: "${metadata.channelUrl}"\n`;
  }
  if (metadata.publishDate) {
    md += `published: ${metadata.publishDate}\n`;
  }
  md += `analyzed: ${analyzedDate}\n`;
  if (metadata.viewCount) {
    md += `views: ${metadata.viewCount}\n`;
  }
  if (metadata.durationFormatted) {
    md += `duration: "${metadata.durationFormatted}"\n`;
  }
  if (metadata.thumbnailUrl) {
    md += `thumbnail: "${metadata.thumbnailUrl}"\n`;
  }

  md += 'tags:\n  - youtube\n  - video-summary\n';
  if (channelName !== 'Unknown') {
    const channelSlug = createSlug(channelName);
    if (channelSlug) {
      md += `  - ${channelSlug}\n`;
    }
  }
  md += '---\n\n';

  // Video Information
  md += '## Video Information\n\n';
  if (metadata.channelName && metadata.channelUrl) {
    md += `**Channel**: [${metadata.channelName}](${metadata.channelUrl})\n`;
  } else if (metadata.channelName) {
    md += `**Channel**: ${metadata.channelName}\n`;
  }

  const infoParts = [];
  if (metadata.publishDate) infoParts.push(`**Published**: ${formatDate(metadata.publishDate)}`);
  if (metadata.durationFormatted) infoParts.push(`**Duration**: ${metadata.durationFormatted}`);
  if (metadata.viewCount) infoParts.push(`**Views**: ${formatNumber(metadata.viewCount)}`);

  if (infoParts.length > 0) {
    md += infoParts.join(' | ') + '\n';
  }
  if (metadata.videoUrl) {
    md += `**Link**: [Watch on YouTube](${metadata.videoUrl})\n`;
  }

  // Video thumbnail (iframes don't work in Obsidian due to YouTube restrictions)
  if (config.includeEmbed && metadata.videoId) {
    const thumbnailUrl = metadata.thumbnailUrl || `https://i.ytimg.com/vi/${metadata.videoId}/maxresdefault.jpg`;
    const videoUrl = metadata.videoUrl || `https://www.youtube.com/watch?v=${metadata.videoId}`;
    md += `\n[![Video Thumbnail](${thumbnailUrl})](${videoUrl})\n`;
  }

  md += '\n---\n\n';

  // Summary
  const summaryText = formatSummary(summary);
  if (summaryText) {
    md += '## Summary\n\n' + summaryText + '\n\n---\n\n';
  }

  // Key Revelations as callouts
  if (revelations.length > 0) {
    md += '## Key Revelations\n\n';
    revelations.forEach(rev => {
      if (rev) {
        const calloutTitle = getFirstWords(rev, 5);
        md += `> [!${config.calloutType}] ${calloutTitle}\n> ${rev}\n\n`;
      }
    });
    md += '---\n\n';
  }

  // Takeaways
  if (takeaways.length > 0) {
    md += '## Main Takeaways\n\n';
    takeaways.forEach(t => {
      if (t) {
        md += `- ${t}\n`;
      }
    });
    md += '\n---\n\n';
  }

  md += '## Notes\n\n';
  md += `*This summary was generated using AI on ${analyzedDate}*\n`;

  return md;
}

function exportToObsidian(data, settings = {}) {
  const config = { ...OBSIDIAN_DEFAULT_SETTINGS, ...settings };
  const markdown = generateObsidianMarkdown(data, config);
  const fileName = generateObsidianFileName(data.videoTitle);

  const uriLength = encodeURIComponent(markdown).length;
  if (uriLength > 10000) {
    return { success: false, fallback: 'clipboard', markdown };
  }

  // Build file path
  let filePath = config.folderPath ? `${config.folderPath}/${fileName}` : fileName;

  // Build URI manually with encodeURIComponent to ensure spaces become %20 (not +)
  // URLSearchParams uses application/x-www-form-urlencoded which converts spaces to +
  // but Obsidian's URI handler expects %20 for spaces
  let uri = 'obsidian://new?';
  if (config.vaultName) {
    uri += `vault=${encodeURIComponent(config.vaultName)}&`;
  }
  uri += `file=${encodeURIComponent(filePath)}&content=${encodeURIComponent(markdown)}`;

  try {
    window.open(uri, '_blank');
    return { success: true };
  } catch (error) {
    return { success: false, fallback: 'clipboard', markdown };
  }
}

function generateObsidianFileName(videoTitle) {
  const date = new Date().toISOString().split('T')[0];
  const safeTitle = sanitizeFilename(videoTitle).substring(0, 80);
  return `${safeTitle} - ${date}`;
}

function escapeYaml(text) {
  if (!text) return '';
  // Escape special YAML characters
  let escaped = text
    .replace(/\\/g, '\\\\')  // Backslashes first
    .replace(/"/g, '\\"')     // Quotes
    .replace(/\n/g, ' ')      // Newlines
    .replace(/\r/g, '')       // Carriage returns
    .replace(/\t/g, ' ');     // Tabs

  // If value contains special chars that could break YAML, it's already quoted
  // Just ensure it's safe within quotes
  return escaped;
}

// Check if a string needs YAML quoting (contains special chars)
function needsYamlQuoting(text) {
  if (!text) return false;
  return /[:#{}\[\]&*?|<>=!%@`]/.test(text) || text.startsWith(' ') || text.endsWith(' ');
}

function createSlug(text) {
  if (!text) return '';
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
}

// Update streaming text in real-time
function updateStreamingText(text, videoTitle) {
  videoTitleEl.textContent = videoTitle || 'YouTube Video';
  summaryEl.textContent = '';
  const p = document.createElement('p');
  p.textContent = text;
  summaryEl.appendChild(p);

  // Clear other sections during streaming
  revelationsEl.textContent = '';
  takeawaysEl.textContent = '';
}

async function checkApiKey() {
  const result = await chrome.storage.sync.get(['apiKey', 'anthropicApiKey']);
  // Check new key first, fall back to old key for migration
  return result.apiKey || result.anthropicApiKey;
}

async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function getVideoIdFromUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.searchParams.get('v');
  } catch {
    return null;
  }
}

// Listen for storage changes to update UI in real-time
function setupStorageListener(videoId) {
  // Remove existing listener if any
  if (storageListener) {
    chrome.storage.onChanged.removeListener(storageListener);
  }

  const stateKey = `analysis_state_${videoId}`;
  const cacheKey = `analysis_${videoId}`;

  storageListener = (changes, areaName) => {
    if (areaName !== 'local') return;

    // Check for completed analysis
    if (changes[cacheKey]?.newValue?.status === 'completed') {
      const data = changes[cacheKey].newValue;
      displayResults(data);
      setState('success');
      return;
    }

    // Check for state updates
    if (changes[stateKey]?.newValue) {
      const state = changes[stateKey].newValue;

      if (state.status === 'running') {
        // Show streaming text if available
        if (state.streamingText) {
          setState('streaming');
          updateStreamingText(state.streamingText, state.videoTitle);
        } else {
          setState('loading', { message: state.progress || 'Analyzing...' });
        }
      } else if (state.status === 'error') {
        setState('error', { message: state.error });
      }
    }
  };

  chrome.storage.onChanged.addListener(storageListener);
}

async function analyzeVideo(forceReanalyze = false) {
  try {
    // Check API key first
    const apiKey = await checkApiKey();
    if (!apiKey) {
      setState('no-api-key');
      return;
    }

    // Get current tab
    const tab = await getCurrentTab();

    // Check if on YouTube
    if (!tab.url || !tab.url.includes('youtube.com/watch')) {
      setState('error', { message: 'Please open a YouTube video page first.' });
      return;
    }

    // Extract video ID
    const videoId = getVideoIdFromUrl(tab.url);
    if (!videoId) {
      setState('error', { message: 'Could not extract video ID from URL.' });
      return;
    }

    currentVideoId = videoId;

    // Check for existing completed analysis (unless force re-analyze)
    if (!forceReanalyze) {
      const cacheKey = `analysis_${videoId}`;
      const result = await chrome.storage.local.get([cacheKey]);
      if (result[cacheKey]?.status === 'completed') {
        displayResults(result[cacheKey]);
        setState('cached');
        return;
      }
    }

    // Clear old state if re-analyzing
    if (forceReanalyze) {
      const stateKey = `analysis_state_${videoId}`;
      const cacheKey = `analysis_${videoId}`;
      await chrome.storage.local.remove([stateKey, cacheKey]);
    }

    // Set up listener for progress updates
    setupStorageListener(videoId);

    // Show initial loading state
    setState('loading', { message: 'Starting analysis...' });
    analyzeButton.disabled = true;

    // Send message to background worker to start analysis
    const response = await chrome.runtime.sendMessage({
      action: 'startAnalysis',
      videoId: videoId,
      tabId: tab.id
    });

    if (!response.success) {
      setState('error', { message: response.error || 'Failed to start analysis' });
    }
    // Background worker will update storage, and our listener will update UI

  } catch (error) {
    console.error('Error starting analysis:', error);
    setState('error', {
      message: error.message || 'An unexpected error occurred. Please try again.'
    });
  }
}

// Check for existing analysis state on popup open
async function initializePopup() {
  const tab = await getCurrentTab();

  if (!tab?.url?.includes('youtube.com/watch')) {
    setState('initial');
    return;
  }

  const videoId = getVideoIdFromUrl(tab.url);
  if (!videoId) {
    setState('initial');
    return;
  }

  currentVideoId = videoId;

  // Set up listener for any ongoing analysis
  setupStorageListener(videoId);

  // Check current state
  const stateKey = `analysis_state_${videoId}`;
  const cacheKey = `analysis_${videoId}`;
  const result = await chrome.storage.local.get([stateKey, cacheKey]);

  const cached = result[cacheKey];
  const state = result[stateKey];

  // If we have a completed analysis, show it
  if (cached?.status === 'completed') {
    displayResults(cached);
    setState('cached');
    return;
  }

  // If analysis is running, show current progress
  if (state?.status === 'running') {
    if (state.streamingText) {
      setState('streaming');
      updateStreamingText(state.streamingText, state.videoTitle);
    } else {
      setState('loading', { message: state.progress || 'Analyzing...' });
    }
    analyzeButton.disabled = true;
    return;
  }

  // If there was an error, show it with option to retry
  if (state?.status === 'error') {
    setState('error', { message: state.error });
    return;
  }

  // Default: show analyze button
  setState('initial');
}

// Event Listeners
analyzeButton.addEventListener('click', () => {
  const forceReanalyze = currentState === 'cached' || currentState === 'success';
  analyzeVideo(forceReanalyze);
});

openSettingsButton.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

settingsBtn.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// Export button event listeners
exportCopyBtn.addEventListener('click', handleCopy);
exportDownloadBtn.addEventListener('click', handleDownload);

// Obsidian export handler
exportObsidianBtn.addEventListener('click', async () => {
  if (!currentAnalysisData) return;

  showButtonLoading(exportObsidianBtn);

  try {
    const settings = await getObsidianSettings();
    const result = exportToObsidian(currentAnalysisData, settings);

    if (result.fallback === 'clipboard') {
      // Content too long, copy to clipboard instead
      const clipboardSuccess = await copyToClipboard(result.markdown);
      if (clipboardSuccess) {
        showButtonSuccess(exportObsidianBtn);
        showToast('Content too long - copied to clipboard instead', 'info', 4000);
      } else {
        hideButtonLoading(exportObsidianBtn);
        showToast('Export failed', 'error');
      }
    } else if (result.success) {
      showButtonSuccess(exportObsidianBtn);
      showToast('Opening in Obsidian...', 'success');
    } else {
      hideButtonLoading(exportObsidianBtn);
      showToast('Failed to open Obsidian', 'error');
    }
  } catch (error) {
    hideButtonLoading(exportObsidianBtn);
    showToast('Obsidian export failed', 'error');
    console.error('Obsidian export failed:', error);
  }
});

// ============================================
// Logseq Integration
// ============================================

const LOGSEQ_DEFAULT_SETTINGS = {
  graphFolder: '',
  pageName: 'YouTube Summaries',
  includeProperties: true,
  includeThumbnail: true
};

async function getLogseqSettings() {
  try {
    const result = await chrome.storage.sync.get(['logseqSettings']);
    return { ...LOGSEQ_DEFAULT_SETTINGS, ...result.logseqSettings };
  } catch {
    return LOGSEQ_DEFAULT_SETTINGS;
  }
}

function generateLogseqMarkdown(data, settings = {}) {
  const config = { ...LOGSEQ_DEFAULT_SETTINGS, ...settings };

  // Safely extract data with defaults
  const videoTitle = data?.videoTitle || 'YouTube Video';
  const metadata = data?.metadata || {};
  const summary = data?.summary || '';
  const revelations = data?.revelations || [];
  const takeaways = data?.takeaways || [];
  const analyzedDate = new Date().toISOString().split('T')[0];

  let md = '';

  // Page properties block (Logseq uses property:: value syntax)
  if (config.includeProperties) {
    md += '- type:: [[YouTube Summary]]\n';
    md += `  source:: ${metadata.videoUrl || ''}\n`;
    md += `  channel:: [[${escapeLogseqLink(metadata.channelName || 'Unknown')}]]\n`;

    if (metadata.publishDate) {
      md += `  published:: [[${metadata.publishDate}]]\n`;
    }

    md += `  analyzed:: [[${analyzedDate}]]\n`;

    if (metadata.viewCount) {
      md += `  views:: ${metadata.viewCount}\n`;
    }

    if (metadata.durationFormatted) {
      md += `  duration:: ${metadata.durationFormatted}\n`;
    }

    md += `  tags:: #youtube #video-summary\n`;
    md += '\n';
  }

  // Title as top-level block
  md += `- # ${videoTitle}\n`;

  // Video Information section
  md += `- ## Video Information\n`;

  if (metadata.channelName && metadata.channelUrl) {
    md += `  - **Channel**: [${metadata.channelName}](${metadata.channelUrl})\n`;
  } else if (metadata.channelName) {
    md += `  - **Channel**: ${metadata.channelName}\n`;
  }

  const infoParts = [];
  if (metadata.publishDate) {
    infoParts.push(`**Published**: ${formatDate(metadata.publishDate)}`);
  }
  if (metadata.durationFormatted) {
    infoParts.push(`**Duration**: ${metadata.durationFormatted}`);
  }
  if (metadata.viewCount) {
    infoParts.push(`**Views**: ${formatNumber(metadata.viewCount)}`);
  }

  if (infoParts.length > 0) {
    md += `  - ${infoParts.join(' | ')}\n`;
  }

  if (metadata.videoUrl) {
    md += `  - **Link**: [Watch on YouTube](${metadata.videoUrl})\n`;
  }

  // Video thumbnail
  if (config.includeThumbnail && metadata.videoId) {
    const thumbnailUrl = metadata.thumbnailUrl || `https://i.ytimg.com/vi/${metadata.videoId}/maxresdefault.jpg`;
    const videoUrl = metadata.videoUrl || `https://www.youtube.com/watch?v=${metadata.videoId}`;
    md += `  - [![Video Thumbnail](${thumbnailUrl})](${videoUrl})\n`;
  }

  // Summary section
  const summaryText = formatSummary(summary);
  if (summaryText) {
    md += `- ## Summary\n`;
    const paragraphs = summaryText.split('\n\n').filter(p => p.trim());
    paragraphs.forEach(para => {
      md += `  - ${para.trim()}\n`;
    });
  }

  // Key Revelations section
  if (revelations.length > 0) {
    md += `- ## Key Revelations\n`;
    revelations.forEach((rev, i) => {
      if (rev) {
        const heading = getFirstWords(rev, 5);
        md += `  - **${i + 1}. ${heading}**\n`;
        md += `    - ${rev}\n`;
      }
    });
  }

  // Takeaways section
  if (takeaways.length > 0) {
    md += `- ## Main Takeaways\n`;
    takeaways.forEach(t => {
      if (t) {
        md += `  - ${t}\n`;
      }
    });
  }

  // Footer
  md += `- ---\n`;
  md += `  - *Generated with AI on ${analyzedDate}*\n`;

  return md;
}

function escapeLogseqLink(text) {
  if (!text) return '';
  return text
    .replace(/\[\[/g, '')
    .replace(/\]\]/g, '')
    .replace(/\n/g, ' ')
    .trim();
}

// Logseq export handler
exportLogseqBtn.addEventListener('click', async () => {
  if (!currentAnalysisData) return;

  showButtonLoading(exportLogseqBtn);

  try {
    const settings = await getLogseqSettings();
    const markdown = generateLogseqMarkdown(currentAnalysisData, settings);
    const clipboardSuccess = await copyToClipboard(markdown);

    if (clipboardSuccess) {
      showButtonSuccess(exportLogseqBtn);
      showToast('Copied for Logseq - paste into your graph', 'success', 3000);
    } else {
      hideButtonLoading(exportLogseqBtn);
      showToast('Failed to copy', 'error');
    }
  } catch (error) {
    hideButtonLoading(exportLogseqBtn);
    showToast('Logseq export failed', 'error');
    console.error('Logseq export failed:', error);
  }
});

// ============================================
// Capacities Integration
// ============================================

const CAPACITIES_DEFAULT_SETTINGS = {
  includeMetadata: true,
  includeFrontmatter: true,
  useWikilinks: true,
  addInsightTags: true,
  customTags: 'youtube, video-summary',
  includeEmbed: true
};

async function getCapacitiesSettings() {
  try {
    const result = await chrome.storage.sync.get(['capacitiesSettings']);
    return { ...CAPACITIES_DEFAULT_SETTINGS, ...result.capacitiesSettings };
  } catch {
    return CAPACITIES_DEFAULT_SETTINGS;
  }
}

function generateCapacitiesMarkdown(data, settings = {}) {
  const config = { ...CAPACITIES_DEFAULT_SETTINGS, ...settings };

  // Safely extract data with defaults
  const videoTitle = data?.videoTitle || 'YouTube Video';
  const metadata = data?.metadata || {};
  const summary = data?.summary || '';
  const revelations = data?.revelations || [];
  const takeaways = data?.takeaways || [];

  let markdown = '';

  // Frontmatter
  if (config.includeFrontmatter) {
    const tags = config.customTags
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    markdown += '---\n';
    markdown += 'type: Page\n';

    // Escape YAML special characters
    const escapedTitle = /[:#\[\]{}'"&*!|>@`]/.test(videoTitle) || videoTitle.includes('\n')
      ? `"${videoTitle.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`
      : videoTitle;
    markdown += `title: ${escapedTitle}\n`;

    if (metadata.publishDate) {
      markdown += `createdAt: ${metadata.publishDate}\n`;
    } else {
      const currentDate = new Date().toISOString().split('T')[0];
      markdown += `createdAt: ${currentDate}\n`;
    }

    if (tags.length > 0) {
      markdown += `tags: [${tags.join(', ')}]\n`;
    }

    markdown += '---\n\n';
  }

  // Metadata block
  if (config.includeMetadata) {
    if (metadata.channelName) {
      const channelText = config.useWikilinks
        ? `[[${metadata.channelName}]]`
        : `[${metadata.channelName}](${metadata.channelUrl})`;
      markdown += `**Channel:** ${channelText}\n`;
    }

    if (metadata.publishDate) {
      markdown += `**Published:** ${formatDate(metadata.publishDate)}\n`;
    }

    if (metadata.durationFormatted) {
      markdown += `**Duration:** ${metadata.durationFormatted}\n`;
    }

    if (metadata.viewCount) {
      markdown += `**Views:** ${formatNumber(metadata.viewCount)} views\n`;
    }

    if (metadata.videoUrl) {
      markdown += `**URL:** ${metadata.videoUrl}\n`;
    }

    markdown += '\n---\n\n';
  }

  // Video thumbnail
  if (config.includeEmbed && metadata.videoId) {
    const thumbnailUrl = metadata.thumbnailUrl || `https://i.ytimg.com/vi/${metadata.videoId}/maxresdefault.jpg`;
    const videoUrl = metadata.videoUrl || `https://www.youtube.com/watch?v=${metadata.videoId}`;
    markdown += `[![Video Thumbnail](${thumbnailUrl})](${videoUrl})\n\n`;
    markdown += '---\n\n';
  }

  // Summary section
  const summaryText = formatSummary(summary);
  if (summaryText) {
    markdown += '## Summary\n\n' + summaryText + '\n\n';
  }

  // Key Revelations (with optional tags)
  if (revelations.length > 0) {
    markdown += '## Key Revelations\n\n';
    revelations.forEach(revelation => {
      if (revelation) {
        const tagSuffix = config.addInsightTags ? ' #key-insight' : '';
        markdown += `- ${revelation}${tagSuffix}\n`;
      }
    });
    markdown += '\n';
  }

  // Key Takeaways
  if (takeaways.length > 0) {
    markdown += '## Key Takeaways\n\n';
    takeaways.forEach(takeaway => {
      if (takeaway) {
        markdown += `- ${takeaway}\n`;
      }
    });
    markdown += '\n';
  }

  return markdown.trim();
}

function exportToCapacities(data, settings = {}) {
  const config = { ...CAPACITIES_DEFAULT_SETTINGS, ...settings };
  const markdown = generateCapacitiesMarkdown(data, config);
  const title = data.videoTitle || 'YouTube Summary';

  // Check content length for URI limits
  const uriLength = encodeURIComponent(markdown).length + encodeURIComponent(title).length;

  if (uriLength > 10000) {
    // Content too long - copy to clipboard and notify
    return {
      success: false,
      fallback: 'clipboard',
      markdown,
      message: 'Content too long for URI. Copied to clipboard instead.'
    };
  }

  // Build Capacities URI
  // capacities://x-callback-url/createNewObject?title=<title>&content=<content>&type=Page
  let uri = 'capacities://x-callback-url/createNewObject?';
  uri += `title=${encodeURIComponent(title)}&`;
  uri += `content=${encodeURIComponent(markdown)}&`;
  uri += `type=Page`;

  // Open URI
  try {
    window.open(uri, '_blank');
    return {
      success: true,
      message: 'Opened in Capacities'
    };
  } catch (error) {
    return {
      success: false,
      fallback: 'clipboard',
      markdown,
      message: 'Failed to open Capacities. Copied to clipboard instead.'
    };
  }
}

// Capacities export handler
exportCapacitiesBtn.addEventListener('click', async () => {
  if (!currentAnalysisData) return;

  showButtonLoading(exportCapacitiesBtn);

  try {
    const settings = await getCapacitiesSettings();
    const result = exportToCapacities(currentAnalysisData, settings);

    if (result.fallback === 'clipboard') {
      // Content too long, copy to clipboard instead
      const clipboardSuccess = await copyToClipboard(result.markdown);
      if (clipboardSuccess) {
        showButtonSuccess(exportCapacitiesBtn);
        showToast('Content too long - copied to clipboard instead', 'info', 4000);
      } else {
        hideButtonLoading(exportCapacitiesBtn);
        showToast('Export failed', 'error');
      }
    } else if (result.success) {
      showButtonSuccess(exportCapacitiesBtn);
      showToast('Opening Capacities...', 'success');
    } else {
      hideButtonLoading(exportCapacitiesBtn);
      showToast('Failed to open Capacities', 'error');
    }
  } catch (error) {
    hideButtonLoading(exportCapacitiesBtn);
    showToast('Capacities export failed', 'error');
    console.error('Capacities export failed:', error);
  }
});

// ============================================
// Bear Integration
// ============================================

const BEAR_DEFAULT_SETTINGS = {
  defaultTags: 'youtube,video-summary',
  pinNotes: false,
  openNote: true,
  includeMetadata: true,
  includeEmbed: true
};

async function getBearSettings() {
  try {
    const result = await chrome.storage.sync.get(['bearSettings']);
    return { ...BEAR_DEFAULT_SETTINGS, ...result.bearSettings };
  } catch {
    return BEAR_DEFAULT_SETTINGS;
  }
}

function generateBearMarkdown(data, settings = {}) {
  const config = { ...BEAR_DEFAULT_SETTINGS, ...settings };

  // Safely extract data with defaults
  const videoTitle = data?.videoTitle || 'YouTube Video';
  const metadata = data?.metadata || {};
  const summary = data?.summary || '';
  const revelations = data?.revelations || [];
  const takeaways = data?.takeaways || [];

  let md = '';

  // Video Information section
  if (config.includeMetadata) {
    md += '## Video Information\n\n';

    if (metadata.channelName && metadata.channelUrl) {
      md += `**Channel**: [${metadata.channelName}](${metadata.channelUrl})\n`;
    } else if (metadata.channelName) {
      md += `**Channel**: ${metadata.channelName}\n`;
    }

    if (metadata.publishDate) {
      md += `**Published**: ${formatDate(metadata.publishDate)}\n`;
    }

    if (metadata.durationFormatted) {
      md += `**Duration**: ${metadata.durationFormatted}\n`;
    }

    if (metadata.viewCount) {
      md += `**Views**: ${formatNumber(metadata.viewCount)}\n`;
    }

    if (metadata.videoUrl) {
      md += `**URL**: ${metadata.videoUrl}\n`;
    }

    md += '\n---\n\n';
  }

  // Video thumbnail
  if (config.includeEmbed && metadata.videoId) {
    const thumbnailUrl = metadata.thumbnailUrl || `https://i.ytimg.com/vi/${metadata.videoId}/maxresdefault.jpg`;
    const videoUrl = metadata.videoUrl || `https://www.youtube.com/watch?v=${metadata.videoId}`;
    md += `[![Video Thumbnail](${thumbnailUrl})](${videoUrl})\n\n`;
    md += '---\n\n';
  }

  // Summary section
  const summaryText = formatSummary(summary);
  if (summaryText) {
    md += '## Summary\n\n' + summaryText + '\n\n---\n\n';
  }

  // Key Revelations section
  if (revelations.length > 0) {
    md += '## Key Revelations\n\n';
    revelations.forEach(rev => {
      if (rev) {
        md += `> ${rev}\n\n`;
      }
    });
    md += '---\n\n';
  }

  // Takeaways section
  if (takeaways.length > 0) {
    md += '## Key Takeaways\n\n';
    takeaways.forEach(t => {
      if (t) {
        md += `- ${t}\n`;
      }
    });
    md += '\n';
  }

  return md;
}

function exportToBear(data, settings = {}) {
  const config = { ...BEAR_DEFAULT_SETTINGS, ...settings };
  const markdown = generateBearMarkdown(data, config);
  const title = data.videoTitle || 'YouTube Video Summary';

  // Check content length for URI limits
  const uriLength = encodeURIComponent(markdown).length + encodeURIComponent(title).length;

  if (uriLength > 10000) {
    return { success: false, fallback: 'clipboard', markdown };
  }

  // Build Bear x-callback-url URI
  // bear://x-callback-url/create?title=<title>&text=<text>&tags=<tags>&pin=<pin>&open_note=<open_note>
  let uri = 'bear://x-callback-url/create?';

  // Add title parameter
  uri += `title=${encodeURIComponent(title)}`;

  // Add text parameter (Bear uses 'text' instead of 'content')
  uri += `&text=${encodeURIComponent(markdown)}`;

  // Add tags parameter (comma-separated)
  if (config.defaultTags) {
    uri += `&tags=${encodeURIComponent(config.defaultTags)}`;
  }

  // Add pin parameter
  uri += `&pin=${config.pinNotes ? 'yes' : 'no'}`;

  // Add open_note parameter
  uri += `&open_note=${config.openNote ? 'yes' : 'no'}`;

  // Open URI
  try {
    window.open(uri, '_blank');
    return {
      success: true,
      message: 'Opened in Bear'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      fallback: 'clipboard',
      markdown,
      message: 'Failed to open Bear. Copied to clipboard instead.'
    };
  }
}

// Bear export handler
exportBearBtn.addEventListener('click', async () => {
  if (!currentAnalysisData) return;

  showButtonLoading(exportBearBtn);

  try {
    const settings = await getBearSettings();
    const result = exportToBear(currentAnalysisData, settings);

    if (result.fallback === 'clipboard') {
      // Content too long, copy to clipboard instead
      const clipboardSuccess = await copyToClipboard(result.markdown);
      if (clipboardSuccess) {
        showButtonSuccess(exportBearBtn);
        showToast('Content too long - copied to clipboard instead', 'info', 4000);
      } else {
        hideButtonLoading(exportBearBtn);
        showToast('Export failed', 'error');
      }
    } else if (result.success) {
      showButtonSuccess(exportBearBtn);
      showToast('Opening in Bear...', 'success');
    } else {
      hideButtonLoading(exportBearBtn);
      showToast('Failed to open Bear', 'error');
    }
  } catch (error) {
    hideButtonLoading(exportBearBtn);
    showToast('Bear export failed', 'error');
    console.error('Bear export failed:', error);
  }
});

// ============================================
// Craft Integration
// ============================================

const CRAFT_DEFAULT_SETTINGS = {
  spaceId: '',
  folderId: '',
  includeMetadata: true,
  includeEmbed: true
};

async function getCraftSettings() {
  try {
    const result = await chrome.storage.sync.get(['craftSettings']);
    return { ...CRAFT_DEFAULT_SETTINGS, ...result.craftSettings };
  } catch {
    return CRAFT_DEFAULT_SETTINGS;
  }
}

function generateCraftMarkdown(data, settings = {}) {
  const config = { ...CRAFT_DEFAULT_SETTINGS, ...settings };

  // Safely extract data with defaults
  const videoTitle = data?.videoTitle || 'YouTube Video';
  const metadata = data?.metadata || {};
  const summary = data?.summary || '';
  const revelations = data?.revelations || [];
  const takeaways = data?.takeaways || [];
  const analyzedDate = new Date().toISOString().split('T')[0];

  let md = '';

  // Video Information section
  if (config.includeMetadata) {
    if (metadata.channelName && metadata.channelUrl) {
      md += `**Channel:** [${metadata.channelName}](${metadata.channelUrl})\n`;
    } else if (metadata.channelName) {
      md += `**Channel:** ${metadata.channelName}\n`;
    }

    if (metadata.publishDate) {
      md += `**Published:** ${formatDate(metadata.publishDate)}\n`;
    }
    if (metadata.durationFormatted) {
      md += `**Duration:** ${metadata.durationFormatted}\n`;
    }
    if (metadata.viewCount) {
      md += `**Views:** ${formatNumber(metadata.viewCount)} views\n`;
    }
    if (metadata.videoUrl) {
      md += `**URL:** ${metadata.videoUrl}\n`;
    }

    md += '\n---\n\n';
  }

  // Video embed/thumbnail
  if (config.includeEmbed && metadata.videoId) {
    const thumbnailUrl = metadata.thumbnailUrl || `https://i.ytimg.com/vi/${metadata.videoId}/maxresdefault.jpg`;
    const videoUrl = metadata.videoUrl || `https://www.youtube.com/watch?v=${metadata.videoId}`;
    md += `[![Video Thumbnail](${thumbnailUrl})](${videoUrl})\n\n`;
    md += '---\n\n';
  }

  // Summary section
  const summaryText = formatSummary(summary);
  if (summaryText) {
    md += '## Summary\n\n' + summaryText + '\n\n---\n\n';
  }

  // Key Revelations
  if (revelations.length > 0) {
    md += '## Key Revelations\n\n';
    revelations.forEach(rev => {
      if (rev) {
        md += `> ${rev}\n\n`;
      }
    });
    md += '---\n\n';
  }

  // Takeaways
  if (takeaways.length > 0) {
    md += '## Key Takeaways\n\n';
    takeaways.forEach(t => {
      if (t) {
        md += `- ${t}\n`;
      }
    });
    md += '\n---\n\n';
  }

  // Footer
  md += `*This summary was generated using AI on ${analyzedDate}*\n`;

  return md;
}

function exportToCraft(data, settings = {}) {
  const config = { ...CRAFT_DEFAULT_SETTINGS, ...settings };
  const markdown = generateCraftMarkdown(data, config);
  const title = data.videoTitle || 'YouTube Video Summary';

  // Check content length for URI limits
  const uriLength = encodeURIComponent(markdown).length + encodeURIComponent(title).length;

  if (uriLength > 10000) {
    return { success: false, fallback: 'clipboard', markdown };
  }

  // Build Craft URI
  // craftdocs://createdocument?spaceId=<spaceId>&title=<title>&content=<content>&folderId=<folderId>
  let uri = 'craftdocs://createdocument?';

  // Add space ID (empty string uses current space)
  if (config.spaceId) {
    uri += `spaceId=${encodeURIComponent(config.spaceId)}&`;
  } else {
    uri += 'spaceId=&';
  }

  // Add title
  uri += `title=${encodeURIComponent(title)}&`;

  // Add content
  uri += `content=${encodeURIComponent(markdown)}&`;

  // Add folder ID (empty string uses root)
  if (config.folderId) {
    uri += `folderId=${encodeURIComponent(config.folderId)}`;
  } else {
    uri += 'folderId=';
  }

  // Open URI
  try {
    window.open(uri, '_blank');
    return {
      success: true,
      message: 'Opened in Craft'
    };
  } catch (error) {
    return {
      success: false,
      fallback: 'clipboard',
      markdown,
      message: 'Failed to open Craft. Copied to clipboard instead.'
    };
  }
}

// Craft export handler
exportCraftBtn.addEventListener('click', async () => {
  if (!currentAnalysisData) return;

  showButtonLoading(exportCraftBtn);

  try {
    const settings = await getCraftSettings();
    const result = exportToCraft(currentAnalysisData, settings);

    if (result.fallback === 'clipboard') {
      // Content too long, copy to clipboard instead
      const clipboardSuccess = await copyToClipboard(result.markdown);
      if (clipboardSuccess) {
        showButtonSuccess(exportCraftBtn);
        showToast('Content too long - copied to clipboard instead', 'info', 4000);
      } else {
        hideButtonLoading(exportCraftBtn);
        showToast('Export failed', 'error');
      }
    } else if (result.success) {
      showButtonSuccess(exportCraftBtn);
      showToast('Opening in Craft...', 'success');
    } else {
      hideButtonLoading(exportCraftBtn);
      showToast('Failed to open Craft', 'error');
    }
  } catch (error) {
    hideButtonLoading(exportCraftBtn);
    showToast('Craft export failed', 'error');
    console.error('Craft export failed:', error);
  }
});

// Clean up listener when popup closes
window.addEventListener('unload', () => {
  if (storageListener) {
    chrome.storage.onChanged.removeListener(storageListener);
  }
});

// Initialize on popup open
initializePopup();
