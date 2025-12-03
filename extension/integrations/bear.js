/**
 * Bear Integration for YouTube Summarizer
 * Exports summaries to Bear via x-callback-url scheme
 */

/**
 * Default settings for Bear export
 */
const DEFAULT_SETTINGS = {
  defaultTags: 'youtube,video-summary',  // Comma-separated tags
  pinNotes: false,
  openNote: true,
  includeMetadata: true,
  includeEmbed: true
};

/**
 * Generate Bear-formatted markdown
 * @param {Object} data - Analysis data with metadata
 * @param {Object} settings - Bear export settings
 * @returns {string} - Bear-formatted markdown
 */
export function generateBearMarkdown(data, settings = {}) {
  const config = { ...DEFAULT_SETTINGS, ...settings };
  const { videoTitle, metadata, summary, revelations, takeaways } = data;

  // Build markdown content
  let md = '';

  // Video Information section
  if (config.includeMetadata) {
    md += '## Video Information\n\n';

    if (metadata?.channelName && metadata?.channelUrl) {
      md += `**Channel**: [${metadata.channelName}](${metadata.channelUrl})\n`;
    } else if (metadata?.channelName) {
      md += `**Channel**: ${metadata.channelName}\n`;
    }

    if (metadata?.publishDate) {
      md += `**Published**: ${formatDate(metadata.publishDate)}\n`;
    }

    if (metadata?.durationFormatted) {
      md += `**Duration**: ${metadata.durationFormatted}\n`;
    }

    if (metadata?.viewCount) {
      md += `**Views**: ${formatNumber(metadata.viewCount)}\n`;
    }

    if (metadata?.videoUrl) {
      md += `**URL**: ${metadata.videoUrl}\n`;
    }

    md += '\n---\n\n';
  }

  // Video thumbnail
  if (config.includeEmbed && metadata?.videoId) {
    const thumbnailUrl = metadata?.thumbnailUrl || `https://i.ytimg.com/vi/${metadata.videoId}/maxresdefault.jpg`;
    const videoUrl = metadata?.videoUrl || `https://www.youtube.com/watch?v=${metadata.videoId}`;
    md += `[![Video Thumbnail](${thumbnailUrl})](${videoUrl})\n\n`;
    md += '---\n\n';
  }

  // Summary section
  md += '## Summary\n\n';
  md += formatSummary(summary);
  md += '\n\n---\n\n';

  // Key Revelations section
  if (revelations && revelations.length > 0) {
    md += '## Key Revelations\n\n';
    revelations.forEach(rev => {
      if (rev) {
        md += `> ${rev}\n\n`;
      }
    });
    md += '---\n\n';
  }

  // Takeaways section
  if (takeaways && takeaways.length > 0) {
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

/**
 * Export to Bear via x-callback-url scheme
 * @param {Object} data - Analysis data
 * @param {Object} settings - Bear settings
 * @returns {Object} - Result with success status and any messages
 */
export function exportToBear(data, settings = {}) {
  const config = { ...DEFAULT_SETTINGS, ...settings };
  const markdown = generateBearMarkdown(data, config);
  const title = data.videoTitle || 'YouTube Video Summary';

  // Check content length for URI limits (Bear has similar limits as Obsidian)
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

  // Build Bear x-callback-url URI
  const uri = buildBearUri(title, markdown, config);

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

/**
 * Build the bear:// x-callback-url URI
 * @param {string} title - The note title
 * @param {string} content - The markdown content
 * @param {Object} config - Export configuration
 * @returns {string} - The bear:// URI
 */
function buildBearUri(title, content, config) {
  // Bear uses x-callback-url scheme
  // bear://x-callback-url/create?title=<title>&text=<text>&tags=<tags>&pin=<pin>&open_note=<open_note>

  let uri = 'bear://x-callback-url/create?';

  // Add title parameter
  uri += `title=${encodeURIComponent(title)}`;

  // Add text parameter (Bear uses 'text' instead of 'content')
  uri += `&text=${encodeURIComponent(content)}`;

  // Add tags parameter (comma-separated)
  if (config.defaultTags) {
    uri += `&tags=${encodeURIComponent(config.defaultTags)}`;
  }

  // Add pin parameter
  uri += `&pin=${config.pinNotes ? 'yes' : 'no'}`;

  // Add open_note parameter
  uri += `&open_note=${config.openNote ? 'yes' : 'no'}`;

  return uri;
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
export async function getBearSettings() {
  try {
    const result = await chrome.storage.sync.get(['bearSettings']);
    return { ...DEFAULT_SETTINGS, ...result.bearSettings };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/**
 * Save settings to Chrome storage
 * @param {Object} settings
 * @returns {Promise<void>}
 */
export async function saveBearSettings(settings) {
  await chrome.storage.sync.set({
    bearSettings: { ...DEFAULT_SETTINGS, ...settings }
  });
}
