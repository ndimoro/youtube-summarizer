/**
 * Capacities Integration for YouTube Summarizer
 * Exports summaries to Capacities via URI scheme
 *
 * Key features:
 * - YAML frontmatter for metadata
 * - Wikilinks for internal references
 * - Hashtags for categorization
 * - URI scheme-based export (capacities://x-callback-url/createNewObject)
 */

/**
 * Default settings for Capacities export
 */
const DEFAULT_SETTINGS = {
  includeMetadata: true,
  includeFrontmatter: true,
  useWikilinks: true,
  addInsightTags: true,
  customTags: 'youtube, video-summary',
  includeEmbed: true
};

/**
 * Generate Capacities-formatted markdown with frontmatter
 * @param {Object} data - Analysis data with metadata
 * @param {Object} settings - Capacities export settings
 * @returns {string} - Capacities-formatted markdown
 */
export function generateCapacitiesMarkdown(data, settings = {}) {
  const config = { ...DEFAULT_SETTINGS, ...settings };
  const { videoTitle, metadata, summary, revelations, takeaways } = data;
  let markdown = '';

  // Frontmatter
  if (config.includeFrontmatter) {
    markdown += generateFrontmatter(data, config);
    markdown += '\n';
  }

  // Metadata block
  if (config.includeMetadata) {
    markdown += formatMetadataBlock(metadata, config);
    markdown += '\n---\n\n';
  }

  // Video thumbnail
  if (config.includeEmbed && metadata?.videoId) {
    const thumbnailUrl = metadata?.thumbnailUrl || `https://i.ytimg.com/vi/${metadata.videoId}/maxresdefault.jpg`;
    const videoUrl = metadata?.videoUrl || `https://www.youtube.com/watch?v=${metadata.videoId}`;
    markdown += `[![Video Thumbnail](${thumbnailUrl})](${videoUrl})\n\n`;
    markdown += '---\n\n';
  }

  // Summary section
  if (summary) {
    markdown += '## Summary\n\n';
    const summaryText = Array.isArray(summary)
      ? summary.join('\n\n')
      : summary;
    markdown += `${summaryText}\n\n`;
  }

  // Key Revelations (with optional tags)
  if (revelations && revelations.length > 0) {
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
  if (takeaways && takeaways.length > 0) {
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

/**
 * Generate YAML frontmatter
 * @param {Object} data - Analysis data
 * @param {Object} settings - Export settings
 * @returns {string} - YAML frontmatter block
 */
function generateFrontmatter(data, settings) {
  const tags = settings.customTags
    .split(',')
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0);

  let frontmatter = '---\n';
  frontmatter += 'type: Page\n';
  frontmatter += `title: ${escapeYaml(data.videoTitle)}\n`;

  if (data.metadata.publishDate) {
    // Use video publish date if available
    frontmatter += `createdAt: ${data.metadata.publishDate}\n`;
  } else {
    // Fallback to current date
    frontmatter += `createdAt: ${getCurrentDate()}\n`;
  }

  if (tags.length > 0) {
    frontmatter += `tags: [${tags.join(', ')}]\n`;
  }

  frontmatter += '---\n';
  return frontmatter;
}

/**
 * Format metadata block
 * @param {Object} metadata - Video metadata
 * @param {Object} settings - Export settings
 * @returns {string} - Formatted metadata block
 */
function formatMetadataBlock(metadata, settings) {
  let block = '';

  if (metadata.channelName) {
    const channelText = settings.useWikilinks
      ? formatAsWikilink(metadata.channelName)
      : `[${metadata.channelName}](${metadata.channelUrl})`;
    block += `**Channel:** ${channelText}\n`;
  }

  if (metadata.publishDate) {
    block += `**Published:** ${formatDate(metadata.publishDate)}\n`;
  }

  if (metadata.durationFormatted) {
    block += `**Duration:** ${metadata.durationFormatted}\n`;
  }

  if (metadata.viewCount) {
    block += `**Views:** ${formatNumber(metadata.viewCount)} views\n`;
  }

  if (metadata.videoUrl) {
    block += `**URL:** ${metadata.videoUrl}\n`;
  }

  return block;
}

/**
 * Convert text to wikilink format
 * @param {string} text - Text to convert
 * @returns {string} - Wikilink format
 */
function formatAsWikilink(text) {
  return `[[${text}]]`;
}

/**
 * Escape special characters for YAML
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text
 */
function escapeYaml(text) {
  if (!text) return '';
  // If text contains special characters, wrap in quotes
  if (/[:#\[\]{}'"&*!|>@`]/.test(text) || text.includes('\n')) {
    return `"${text.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`;
  }
  return text;
}

/**
 * Build the capacities:// URI
 * @param {string} title - The note title
 * @param {string} content - The markdown content
 * @returns {string} - The capacities:// URI
 */
function buildCapacitiesUri(title, content) {
  // Build URI manually with encodeURIComponent to ensure spaces become %20 (not +)
  // capacities://x-callback-url/createNewObject?title=<title>&content=<content>&type=Page
  let uri = 'capacities://x-callback-url/createNewObject?';
  uri += `title=${encodeURIComponent(title)}&`;
  uri += `content=${encodeURIComponent(content)}&`;
  uri += `type=Page`;

  return uri;
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
 * Get current date in YYYY-MM-DD format
 * @returns {string}
 */
function getCurrentDate() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Export to Capacities via URI scheme
 * @param {Object} data - Analysis data
 * @param {Object} settings - Capacities settings
 * @returns {Object} - Result with success status and any messages
 */
export function exportToCapacities(data, settings = {}) {
  const config = { ...DEFAULT_SETTINGS, ...settings };
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
  const uri = buildCapacitiesUri(title, markdown);

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
      error: error.message,
      fallback: 'clipboard',
      markdown,
      message: 'Failed to open Capacities. Copied to clipboard instead.'
    };
  }
}

/**
 * Get Capacities settings from Chrome storage
 * @returns {Promise<Object>}
 */
export async function getCapacitiesSettings() {
  try {
    const result = await chrome.storage.sync.get(['capacitiesSettings']);
    return { ...DEFAULT_SETTINGS, ...result.capacitiesSettings };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/**
 * Save Capacities settings to Chrome storage
 * @param {Object} settings
 * @returns {Promise<void>}
 */
export async function saveCapacitiesSettings(settings) {
  await chrome.storage.sync.set({
    capacitiesSettings: { ...DEFAULT_SETTINGS, ...settings }
  });
}
