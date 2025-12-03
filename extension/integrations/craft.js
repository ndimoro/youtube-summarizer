/**
 * Craft Integration for YouTube Summarizer
 * Exports summaries to Craft via URI scheme
 */

/**
 * Default settings for Craft export
 */
const DEFAULT_SETTINGS = {
  spaceId: '',  // Empty = use current space
  folderId: '',  // Empty = use root
  includeMetadata: true,
  includeEmbed: true
};

/**
 * Generate Craft-formatted markdown
 * @param {Object} data - Analysis data with metadata
 * @param {Object} settings - Craft export settings
 * @returns {string} - Craft-formatted markdown
 */
export function generateCraftMarkdown(data, settings = {}) {
  const config = { ...DEFAULT_SETTINGS, ...settings };
  const { videoTitle, metadata, summary, revelations, takeaways } = data;
  const analyzedDate = new Date().toISOString().split('T')[0];

  let md = '';

  // Video Information section
  if (config.includeMetadata) {
    if (metadata?.channelName && metadata?.channelUrl) {
      md += `**Channel:** [${metadata.channelName}](${metadata.channelUrl})\n`;
    } else if (metadata?.channelName) {
      md += `**Channel:** ${metadata.channelName}\n`;
    }

    if (metadata?.publishDate) {
      md += `**Published:** ${formatDate(metadata.publishDate)}\n`;
    }

    if (metadata?.durationFormatted) {
      md += `**Duration:** ${metadata.durationFormatted}\n`;
    }

    if (metadata?.viewCount) {
      md += `**Views:** ${formatNumber(metadata.viewCount)} views\n`;
    }

    if (metadata?.videoUrl) {
      md += `**URL:** ${metadata.videoUrl}\n`;
    }

    md += '\n---\n\n';
  }

  // Video embed/thumbnail
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

  // Key Revelations
  if (revelations && revelations.length > 0) {
    md += '## Key Revelations\n\n';
    revelations.forEach((rev) => {
      if (rev) {
        md += `> ${rev}\n\n`;
      }
    });
    md += '---\n\n';
  }

  // Takeaways
  if (takeaways && takeaways.length > 0) {
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

/**
 * Export to Craft via URI scheme
 * @param {Object} data - Analysis data
 * @param {Object} settings - Craft settings
 * @returns {Object} - Result with success status and any messages
 */
export function exportToCraft(data, settings = {}) {
  const config = { ...DEFAULT_SETTINGS, ...settings };
  const markdown = generateCraftMarkdown(data, config);
  const title = data.videoTitle || 'YouTube Video Summary';

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

  // Build Craft URI
  const uri = buildCraftUri(title, markdown, config);

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
      error: error.message,
      fallback: 'clipboard',
      markdown,
      message: 'Failed to open Craft. Copied to clipboard instead.'
    };
  }
}

/**
 * Build the craftdocs:// URI
 * @param {string} title - The note title
 * @param {string} content - The markdown content
 * @param {Object} config - Export configuration
 * @returns {string} - The craftdocs:// URI
 */
function buildCraftUri(title, content, config) {
  // Build URI manually with encodeURIComponent to ensure proper encoding
  let uri = 'craftdocs://createdocument?';

  // Add space ID if provided
  if (config.spaceId) {
    uri += `spaceId=${encodeURIComponent(config.spaceId)}&`;
  } else {
    uri += 'spaceId=&';
  }

  // Add title
  uri += `title=${encodeURIComponent(title)}&`;

  // Add content
  uri += `content=${encodeURIComponent(content)}&`;

  // Add folder ID if provided
  if (config.folderId) {
    uri += `folderId=${encodeURIComponent(config.folderId)}`;
  } else {
    uri += 'folderId=';
  }

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
export async function getCraftSettings() {
  try {
    const result = await chrome.storage.sync.get(['craftSettings']);
    return { ...DEFAULT_SETTINGS, ...result.craftSettings };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/**
 * Save settings to Chrome storage
 * @param {Object} settings
 * @returns {Promise<void>}
 */
export async function saveCraftSettings(settings) {
  await chrome.storage.sync.set({
    craftSettings: { ...DEFAULT_SETTINGS, ...settings }
  });
}
