/**
 * Export Utilities for YouTube Summarizer
 * Provides shared functions for formatting and exporting summaries
 */

/**
 * Generate clean, universal markdown format for Copy/Download
 * @param {Object} analysisData - The analysis data with metadata
 * @returns {string} - Formatted markdown string
 */
export function generateCopyMarkdown(analysisData) {
  const { videoTitle, metadata, summary, revelations, takeaways } = analysisData;

  // Format metadata line
  const metaParts = [];
  if (metadata?.publishDate) {
    metaParts.push(formatDate(metadata.publishDate));
  }
  if (metadata?.durationFormatted) {
    metaParts.push(metadata.durationFormatted);
  }
  if (metadata?.viewCount) {
    metaParts.push(`${formatNumber(metadata.viewCount)} views`);
  }
  const metaLine = metaParts.join(' · ');

  // Build markdown
  let md = `# ${videoTitle}\n\n`;

  // Channel info
  if (metadata?.channelName) {
    md += `**Channel**: ${metadata.channelName}\n`;
  }

  // Published metadata line
  if (metaLine) {
    md += `**Published**: ${metaLine}\n`;
  }

  // Source URL
  if (metadata?.videoUrl) {
    md += `**Source**: ${metadata.videoUrl}\n`;
  }

  md += `\n---\n\n`;

  // Summary section
  md += `## Summary\n\n${formatSummary(summary)}\n\n`;
  md += `---\n\n`;

  // Key Revelations section
  if (revelations && revelations.length > 0) {
    md += `## Key Revelations\n\n`;
    revelations.forEach((rev, i) => {
      const heading = getFirstWords(rev, 5);
      md += `### ${i + 1}. ${heading}\n\n${rev}\n\n`;
    });
    md += `---\n\n`;
  }

  // Takeaways section
  if (takeaways && takeaways.length > 0) {
    md += `## Takeaways\n\n`;
    takeaways.forEach(t => {
      md += `- ${t}\n`;
    });
  }

  return md.trim();
}

/**
 * Format summary - handles both string and array formats
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
 * Get first N words from a string for headings
 * @param {string} text
 * @param {number} count
 * @returns {string}
 */
function getFirstWords(text, count = 5) {
  if (!text) return '';
  const words = text.split(/\s+/).slice(0, count);
  let result = words.join(' ');
  // Add ellipsis if truncated
  if (text.split(/\s+/).length > count) {
    result += '...';
  }
  return result;
}

/**
 * Format a number with commas (e.g., 1234567 -> "1,234,567")
 * Also supports abbreviated format (e.g., 1.2M)
 * @param {number} num
 * @param {boolean} abbreviated - Whether to use abbreviated format
 * @returns {string}
 */
export function formatNumber(num, abbreviated = false) {
  if (num === null || num === undefined) return '';

  if (abbreviated) {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    }
    return num.toString();
  }

  return num.toLocaleString('en-US');
}

/**
 * Format a date string for display
 * @param {string} dateString - ISO date string (YYYY-MM-DD)
 * @returns {string} - Formatted date (e.g., "Nov 15, 2023")
 */
export function formatDate(dateString) {
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

/**
 * Format duration from seconds to readable format
 * @param {number} seconds
 * @returns {string} - e.g., "15:32" or "1:05:32"
 */
export function formatDuration(seconds) {
  if (!seconds) return '';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

/**
 * Sanitize a string for use as a filename
 * @param {string} filename
 * @returns {string} - Safe filename
 */
export function sanitizeFilename(filename) {
  if (!filename) return 'youtube-summary';

  return filename
    // Remove or replace unsafe characters
    .replace(/[<>:"/\\|?*]/g, '')
    // Replace multiple spaces with single space
    .replace(/\s+/g, ' ')
    // Trim whitespace
    .trim()
    // Limit length (leave room for extension)
    .substring(0, 100);
}

/**
 * Copy text to clipboard
 * @param {string} text
 * @returns {Promise<boolean>} - Success status
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    // Fallback for older browsers or restricted contexts
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
      console.error('Fallback copy also failed:', fallbackError);
      return false;
    }
  }
}

/**
 * Download text content as a file
 * @param {string} content - The content to download
 * @param {string} filename - The filename (without extension)
 * @param {string} extension - The file extension (default: 'md')
 */
export function downloadAsFile(content, filename, extension = 'md') {
  const safeFilename = sanitizeFilename(filename);
  const fullFilename = `${safeFilename}.${extension}`;

  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = fullFilename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();

  // Cleanup
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

/**
 * Get current date in YYYY-MM-DD format
 * @returns {string}
 */
export function getCurrentDate() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Create a slug from text (for tags, etc.)
 * @param {string} text
 * @returns {string}
 */
export function createSlug(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}
