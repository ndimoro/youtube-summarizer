/**
 * Logseq Integration for YouTube Summarizer
 * Exports summaries in Logseq's block-based markdown format
 *
 * Key differences from standard markdown:
 * - Every block starts with "- " (hyphen + space)
 * - Hierarchy is created through indentation
 * - Properties use "property:: value" syntax
 * - Uses [[wikilinks]] for page references
 */

/**
 * Default settings for Logseq export
 */
const DEFAULT_SETTINGS = {
  graphFolder: '',  // Empty = manual copy
  pageName: 'YouTube Summaries',  // Parent page for namespacing
  includeProperties: true,
  includeThumbnail: true
};

/**
 * Generate Logseq-formatted markdown with block-based structure
 * @param {Object} data - Analysis data with metadata
 * @param {Object} settings - Logseq export settings
 * @returns {string} - Logseq-formatted markdown
 */
export function generateLogseqMarkdown(data, settings = {}) {
  const config = { ...DEFAULT_SETTINGS, ...settings };
  const { videoTitle, metadata, summary, revelations, takeaways } = data;
  const analyzedDate = new Date().toISOString().split('T')[0];

  let md = '';

  // Page properties block (Logseq uses property:: value syntax)
  if (config.includeProperties) {
    md += '- type:: [[YouTube Summary]]\n';
    md += `  source:: ${metadata?.videoUrl || ''}\n`;
    md += `  channel:: [[${escapeLogseqLink(metadata?.channelName || 'Unknown')}]]\n`;

    if (metadata?.publishDate) {
      md += `  published:: [[${metadata.publishDate}]]\n`;
    }

    md += `  analyzed:: [[${analyzedDate}]]\n`;

    if (metadata?.viewCount) {
      md += `  views:: ${metadata.viewCount}\n`;
    }

    if (metadata?.durationFormatted) {
      md += `  duration:: ${metadata.durationFormatted}\n`;
    }

    md += `  tags:: #youtube #video-summary\n`;
    md += '\n';
  }

  // Title as top-level block
  md += `- # ${videoTitle}\n`;

  // Video Information section
  md += `- ## Video Information\n`;

  if (metadata?.channelName && metadata?.channelUrl) {
    md += `  - **Channel**: [${metadata.channelName}](${metadata.channelUrl})\n`;
  } else if (metadata?.channelName) {
    md += `  - **Channel**: ${metadata.channelName}\n`;
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
    md += `  - ${infoParts.join(' | ')}\n`;
  }

  if (metadata?.videoUrl) {
    md += `  - **Link**: [Watch on YouTube](${metadata.videoUrl})\n`;
  }

  // Video thumbnail
  if (config.includeThumbnail && metadata?.videoId) {
    const thumbnailUrl = metadata?.thumbnailUrl || `https://i.ytimg.com/vi/${metadata.videoId}/maxresdefault.jpg`;
    const videoUrl = metadata?.videoUrl || `https://www.youtube.com/watch?v=${metadata.videoId}`;
    md += `  - [![Video Thumbnail](${thumbnailUrl})](${videoUrl})\n`;
  }

  // Summary section
  const summaryText = formatSummary(summary);
  if (summaryText) {
    md += `- ## Summary\n`;
    // Split summary into paragraphs and make each a block
    const paragraphs = summaryText.split('\n\n').filter(p => p.trim());
    paragraphs.forEach(para => {
      md += `  - ${para.trim()}\n`;
    });
  }

  // Key Revelations section
  if (revelations && revelations.length > 0) {
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
  if (takeaways && takeaways.length > 0) {
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

/**
 * Export to Logseq by copying to clipboard
 * Logseq doesn't have a URI scheme like Obsidian, so we copy formatted content
 * @param {Object} data - Analysis data
 * @param {Object} settings - Logseq settings
 * @returns {Object} - Result with success status and markdown content
 */
export function exportToLogseq(data, settings = {}) {
  const config = { ...DEFAULT_SETTINGS, ...settings };
  const markdown = generateLogseqMarkdown(data, config);
  const fileName = generateFileName(data.videoTitle);

  return {
    success: true,
    method: 'clipboard',
    markdown,
    fileName,
    message: 'Ready to paste into Logseq'
  };
}

/**
 * Generate a safe file name for the page
 * @param {string} videoTitle - Video title
 * @returns {string} - Safe file name
 */
function generateFileName(videoTitle) {
  const date = new Date().toISOString().split('T')[0];
  const safeTitle = sanitizeFileName(videoTitle);
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
 * Escape special characters for Logseq wikilinks
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text
 */
function escapeLogseqLink(text) {
  if (!text) return '';
  // Remove characters that break wikilinks
  return text
    .replace(/\[\[/g, '')
    .replace(/\]\]/g, '')
    .replace(/\n/g, ' ')
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
export async function getLogseqSettings() {
  try {
    const result = await chrome.storage.sync.get(['logseqSettings']);
    return { ...DEFAULT_SETTINGS, ...result.logseqSettings };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/**
 * Save settings to Chrome storage
 * @param {Object} settings
 * @returns {Promise<void>}
 */
export async function saveLogseqSettings(settings) {
  await chrome.storage.sync.set({
    logseqSettings: { ...DEFAULT_SETTINGS, ...settings }
  });
}
