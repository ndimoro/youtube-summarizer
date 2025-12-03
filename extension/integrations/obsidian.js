/**
 * Obsidian Integration for YouTube Summarizer
 * Exports summaries to Obsidian via URI scheme
 */

/**
 * Default settings for Obsidian export
 */
const DEFAULT_SETTINGS = {
  vaultName: '',  // Empty = use default vault
  folderPath: 'YouTube Summaries',
  includeEmbed: true,
  calloutType: 'tip'
};

/**
 * Generate Obsidian-formatted markdown with YAML frontmatter
 * @param {Object} data - Analysis data with metadata
 * @param {Object} settings - Obsidian export settings
 * @returns {string} - Obsidian-formatted markdown
 */
export function generateObsidianMarkdown(data, settings = {}) {
  const config = { ...DEFAULT_SETTINGS, ...settings };
  const { videoTitle, metadata, summary, revelations, takeaways } = data;
  const analyzedDate = new Date().toISOString().split('T')[0];

  // Build YAML frontmatter
  let md = '---\n';
  md += `title: "${escapeYaml(videoTitle)}"\n`;
  md += 'type: youtube-summary\n';
  md += `source: ${metadata?.videoUrl || ''}\n`;
  md += `channel: ${escapeYaml(metadata?.channelName || 'Unknown')}\n`;

  if (metadata?.channelUrl) {
    md += `channel_url: ${metadata.channelUrl}\n`;
  }

  if (metadata?.publishDate) {
    md += `published: ${metadata.publishDate}\n`;
  }

  md += `analyzed: ${analyzedDate}\n`;

  if (metadata?.viewCount) {
    md += `views: ${metadata.viewCount}\n`;
  }

  if (metadata?.durationFormatted) {
    md += `duration: "${metadata.durationFormatted}"\n`;
  }

  if (metadata?.thumbnailUrl) {
    md += `thumbnail: ${metadata.thumbnailUrl}\n`;
  }

  // Tags
  md += 'tags:\n';
  md += '  - youtube\n';
  md += '  - video-summary\n';
  if (metadata?.channelName) {
    md += `  - ${createSlug(metadata.channelName)}\n`;
  }

  md += '---\n\n';

  // Video Information
  md += '## Video Information\n\n';
  if (metadata?.channelName && metadata?.channelUrl) {
    md += `**Channel**: [${metadata.channelName}](${metadata.channelUrl})\n`;
  } else if (metadata?.channelName) {
    md += `**Channel**: ${metadata.channelName}\n`;
  }

  const infoParts = [];
  if (metadata?.publishDate) {
    infoParts.push(`**Published**: ${formatDate(metadata.publishDate)}`);
  }
  if (metadata?.durationFormatted) {
    infoParts.push(`**Duration**: ${metadata.durationFormatted}`);
  }
  if (metadata?.viewCount) {
    infoParts.push(`**Views**: ${formatNumber(metadata.viewCount)}`);
  }

  if (infoParts.length > 0) {
    md += infoParts.join(' | ') + '\n';
  }

  if (metadata?.videoUrl) {
    md += `**Link**: [Watch on YouTube](${metadata.videoUrl})\n`;
  }

  // Video thumbnail (iframes don't work in Obsidian due to YouTube restrictions)
  if (config.includeEmbed && metadata?.videoId) {
    const thumbnailUrl = metadata?.thumbnailUrl || `https://i.ytimg.com/vi/${metadata.videoId}/maxresdefault.jpg`;
    const videoUrl = metadata?.videoUrl || `https://www.youtube.com/watch?v=${metadata.videoId}`;
    md += `\n[![Video Thumbnail](${thumbnailUrl})](${videoUrl})\n`;
  }

  md += '\n---\n\n';

  // Summary
  md += '## Summary\n\n';
  md += formatSummary(summary);
  md += '\n\n---\n\n';

  // Key Revelations as callouts
  if (revelations && revelations.length > 0) {
    md += '## Key Revelations\n\n';
    revelations.forEach((rev, i) => {
      const calloutTitle = getFirstWords(rev, 5);
      md += `> [!${config.calloutType}] ${calloutTitle}\n`;
      md += `> ${rev}\n\n`;
    });
    md += '---\n\n';
  }

  // Takeaways
  if (takeaways && takeaways.length > 0) {
    md += '## Main Takeaways\n\n';
    takeaways.forEach(t => {
      md += `- ${t}\n`;
    });
    md += '\n---\n\n';
  }

  // Footer
  md += '## Notes\n\n';
  md += `*This summary was generated using AI on ${analyzedDate}*\n`;

  return md;
}

/**
 * Export to Obsidian via URI scheme
 * @param {Object} data - Analysis data
 * @param {Object} settings - Obsidian settings
 * @returns {Object} - Result with success status and any messages
 */
export function exportToObsidian(data, settings = {}) {
  const config = { ...DEFAULT_SETTINGS, ...settings };
  const markdown = generateObsidianMarkdown(data, config);
  const fileName = generateFileName(data.videoTitle, config);

  // Check content length for URI limits
  const uriLength = encodeURIComponent(markdown).length;

  if (uriLength > 10000) {
    // Content too long - copy to clipboard and notify
    return {
      success: false,
      fallback: 'clipboard',
      markdown,
      message: 'Content too long for URI. Copied to clipboard instead.'
    };
  }

  // Build Obsidian URI
  const uri = buildObsidianUri(fileName, markdown, config);

  // Open URI
  try {
    window.open(uri, '_blank');
    return {
      success: true,
      message: 'Opened in Obsidian'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      fallback: 'clipboard',
      markdown,
      message: 'Failed to open Obsidian. Copied to clipboard instead.'
    };
  }
}

/**
 * Build the obsidian:// URI
 * @param {string} fileName - The note file name
 * @param {string} content - The markdown content
 * @param {Object} config - Export configuration
 * @returns {string} - The obsidian:// URI
 */
function buildObsidianUri(fileName, content, config) {
  // Build file path
  let filePath = fileName;
  if (config.folderPath) {
    filePath = `${config.folderPath}/${fileName}`;
  }

  // Build URI manually with encodeURIComponent to ensure spaces become %20 (not +)
  // URLSearchParams uses application/x-www-form-urlencoded which converts spaces to +
  // but Obsidian's URI handler expects %20 for spaces
  let uri = 'obsidian://new?';
  if (config.vaultName) {
    uri += `vault=${encodeURIComponent(config.vaultName)}&`;
  }
  uri += `file=${encodeURIComponent(filePath)}&content=${encodeURIComponent(content)}`;

  return uri;
}

/**
 * Generate a safe file name for the note
 * @param {string} videoTitle - Video title
 * @param {Object} config - Export configuration
 * @returns {string} - Safe file name (without .md extension)
 */
function generateFileName(videoTitle, config) {
  const date = new Date().toISOString().split('T')[0];
  const safeTitle = sanitizeFileName(videoTitle);

  // Default format: "Video Title - YYYY-MM-DD"
  return `${safeTitle} - ${date}`;
}

/**
 * Sanitize a string for use as filename
 * @param {string} name - The original name
 * @returns {string} - Safe filename
 */
function sanitizeFileName(name) {
  if (!name) return 'YouTube Summary';
  return name
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 80);
}

/**
 * Escape special characters for YAML
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text
 */
function escapeYaml(text) {
  if (!text) return '';
  return text
    .replace(/"/g, '\\"')
    .replace(/\n/g, ' ');
}

/**
 * Create a URL-safe slug
 * @param {string} text - Text to slugify
 * @returns {string} - Slug
 */
function createSlug(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/**
 * Format summary - handles both string and array
 * @param {string|string[]} summary
 * @returns {string}
 */
function formatSummary(summary) {
  if (Array.isArray(summary)) {
    return summary.join('\n\n');
  }
  return summary || '';
}

/**
 * Get first N words for callout titles
 * @param {string} text
 * @param {number} count
 * @returns {string}
 */
function getFirstWords(text, count = 5) {
  if (!text) return 'Key Insight';
  const words = text.split(/\s+/).slice(0, count);
  let result = words.join(' ');
  if (text.split(/\s+/).length > count) {
    result += '...';
  }
  return result;
}

/**
 * Format date for display
 * @param {string} dateString - ISO date (YYYY-MM-DD)
 * @returns {string}
 */
function formatDate(dateString) {
  if (!dateString) return '';
  try {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return dateString;
  }
}

/**
 * Format number with abbreviations
 * @param {number} num
 * @returns {string}
 */
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

/**
 * Get settings from Chrome storage
 * @returns {Promise<Object>}
 */
export async function getObsidianSettings() {
  try {
    const result = await chrome.storage.sync.get(['obsidianSettings']);
    return { ...DEFAULT_SETTINGS, ...result.obsidianSettings };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/**
 * Save settings to Chrome storage
 * @param {Object} settings
 * @returns {Promise<void>}
 */
export async function saveObsidianSettings(settings) {
  await chrome.storage.sync.set({
    obsidianSettings: { ...DEFAULT_SETTINGS, ...settings }
  });
}
