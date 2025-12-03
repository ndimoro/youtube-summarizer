// Content script for extracting YouTube transcripts

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getTranscript') {
    handleTranscriptRequest()
      .then(result => sendResponse(result))
      .catch(error => {
        sendResponse({
          success: false,
          error: error.message || 'Failed to extract transcript'
        });
      });
    return true;
  }
});

async function handleTranscriptRequest() {
  try {
    const videoTitle = getVideoTitle();
    const transcript = await getTranscript();
    const metadata = extractVideoMetadata();

    if (!transcript) {
      return {
        success: false,
        error: 'No transcript available for this video'
      };
    }

    return {
      success: true,
      transcript,
      videoTitle,
      metadata
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Failed to extract transcript'
    };
  }
}

function extractVideoMetadata() {
  const videoId = getVideoId();
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const thumbnailUrl = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;

  return {
    videoId,
    videoUrl,
    thumbnailUrl,
    channelName: extractChannelName(),
    channelUrl: extractChannelUrl(),
    publishDate: extractPublishDate(),
    viewCount: extractViewCount(),
    duration: extractDuration().seconds,
    durationFormatted: extractDuration().formatted,
    description: extractDescription(),
    extractedAt: Date.now()
  };
}

function extractChannelName() {
  const selectors = [
    '#channel-name a',
    'ytd-channel-name a',
    '#owner-name a',
    'ytd-video-owner-renderer #channel-name yt-formatted-string a',
    '#upload-info #channel-name a'
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element && element.textContent) {
      return element.textContent.trim();
    }
  }

  const metaAuthor = document.querySelector('meta[name="author"]');
  if (metaAuthor) {
    return metaAuthor.getAttribute('content') || 'Unknown Channel';
  }

  return 'Unknown Channel';
}

function extractChannelUrl() {
  const selectors = [
    '#channel-name a',
    'ytd-channel-name a',
    '#owner-name a',
    'ytd-video-owner-renderer #channel-name yt-formatted-string a',
    '#upload-info #channel-name a'
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element && element.href) {
      return element.href;
    }
  }

  return '';
}

function extractPublishDate() {
  const infoStrings = document.querySelector('#info-strings yt-formatted-string');
  if (infoStrings) {
    const text = infoStrings.textContent;
    const dateMatch = text?.match(/([A-Z][a-z]{2} \d{1,2}, \d{4})/);
    if (dateMatch) {
      try {
        const date = new Date(dateMatch[1]);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      } catch (e) {}
    }
  }

  const datePublished = document.querySelector('meta[itemprop="datePublished"]');
  if (datePublished) {
    const content = datePublished.getAttribute('content');
    if (content) return content.split('T')[0];
  }

  const ogDate = document.querySelector('meta[property="og:video:release_date"]');
  if (ogDate) {
    const content = ogDate.getAttribute('content');
    if (content) return content.split('T')[0];
  }

  return null;
}

function extractViewCount() {
  const viewCountEl = document.querySelector('ytd-video-view-count-renderer span.view-count');
  if (viewCountEl) return parseViewCount(viewCountEl.textContent);

  const infoEl = document.querySelector('#info span.view-count');
  if (infoEl) return parseViewCount(infoEl.textContent);

  const interactionCount = document.querySelector('meta[itemprop="interactionCount"]');
  if (interactionCount) {
    const content = interactionCount.getAttribute('content');
    if (content) return parseInt(content, 10) || null;
  }

  return null;
}

function parseViewCount(text) {
  if (!text) return null;
  const numMatch = text.replace(/,/g, '').match(/(\d+)/);
  return numMatch ? parseInt(numMatch[1], 10) : null;
}

function extractDuration() {
  const video = document.querySelector('video');
  if (video && video.duration && !isNaN(video.duration)) {
    const seconds = Math.floor(video.duration);
    return { seconds, formatted: formatDuration(seconds) };
  }

  const durationMeta = document.querySelector('meta[itemprop="duration"]');
  if (durationMeta) {
    const content = durationMeta.getAttribute('content');
    if (content) {
      const match = content.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      if (match) {
        const hours = parseInt(match[1] || 0, 10);
        const minutes = parseInt(match[2] || 0, 10);
        const secs = parseInt(match[3] || 0, 10);
        const totalSeconds = hours * 3600 + minutes * 60 + secs;
        return { seconds: totalSeconds, formatted: formatDuration(totalSeconds) };
      }
    }
  }

  return { seconds: null, formatted: null };
}

function formatDuration(totalSeconds) {
  if (!totalSeconds) return null;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function extractDescription() {
  const descSelectors = [
    'ytd-text-inline-expander#description',
    '#description-text',
    '#description yt-formatted-string',
    'ytd-expander#description yt-formatted-string'
  ];

  for (const selector of descSelectors) {
    const element = document.querySelector(selector);
    if (element && element.textContent) {
      const text = element.textContent.trim();
      return text.length > 500 ? text.substring(0, 500) + '...' : text;
    }
  }

  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) {
    const content = metaDesc.getAttribute('content');
    if (content) {
      return content.length > 500 ? content.substring(0, 500) + '...' : content;
    }
  }

  return null;
}

function getVideoTitle() {
  const titleSelectors = [
    'h1.ytd-watch-metadata yt-formatted-string',
    'h1.title yt-formatted-string',
    'h1 yt-formatted-string.ytd-watch-metadata',
    'ytd-watch-metadata h1',
    '#title h1 yt-formatted-string'
  ];

  for (const selector of titleSelectors) {
    const element = document.querySelector(selector);
    if (element && element.textContent) {
      return element.textContent.trim();
    }
  }

  const pageTitle = document.title;
  if (pageTitle && pageTitle.includes(' - YouTube')) {
    return pageTitle.replace(' - YouTube', '').trim();
  }

  return 'YouTube Video';
}

function getVideoId() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('v');
}

async function getTranscript() {
  const videoId = getVideoId();
  if (!videoId) return null;

  const transcriptFromApi = await fetchTranscriptViaInnertubeApi(videoId);
  if (transcriptFromApi) return transcriptFromApi;

  const transcriptFromPage = await extractFromPageScripts();
  if (transcriptFromPage) return transcriptFromPage;

  return null;
}

async function fetchTranscriptViaInnertubeApi(videoId) {
  try {
    const response = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        context: {
          client: {
            hl: 'en',
            gl: 'US',
            clientName: 'WEB',
            clientVersion: '2.20231219.04.00',
          }
        },
        videoId: videoId
      })
    });

    if (!response.ok) return null;

    const data = await response.json();
    const captionTracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

    if (!captionTracks || captionTracks.length === 0) return null;

    let track = captionTracks.find(t => t.languageCode === 'en' && t.kind !== 'asr');
    if (!track) track = captionTracks.find(t => t.languageCode === 'en');
    if (!track) track = captionTracks[0];

    if (!track?.baseUrl) return null;

    return await fetchCaptionContent(track.baseUrl);
  } catch (error) {
    return null;
  }
}

async function fetchCaptionContent(baseUrl) {
  try {
    const jsonUrl = baseUrl + '&fmt=json3';
    const response = await fetch(jsonUrl);
    if (!response.ok) return null;

    const text = await response.text();

    if (text.startsWith('{')) {
      try {
        const data = JSON.parse(text);
        if (data.events) {
          const transcript = data.events
            .filter(event => event.segs)
            .map(event => event.segs.map(seg => seg.utf8 || '').join(''))
            .join(' ')
            .replace(/\n/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          return transcript || null;
        }
      } catch (e) {}
    }

    if (text.includes('<text')) {
      const matches = text.match(/<text[^>]*>([^<]*)<\/text>/g);
      if (matches) {
        const transcript = matches
          .map(match => {
            const content = match.replace(/<text[^>]*>/, '').replace(/<\/text>/, '');
            return decodeHtmlEntities(content);
          })
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
        return transcript || null;
      }
    }

    const defaultResponse = await fetch(baseUrl);
    if (defaultResponse.ok) {
      const xmlText = await defaultResponse.text();
      if (xmlText.includes('<text')) {
        const matches = xmlText.match(/<text[^>]*>([^<]*)<\/text>/g);
        if (matches) {
          const transcript = matches
            .map(match => {
              const content = match.replace(/<text[^>]*>/, '').replace(/<\/text>/, '');
              return decodeHtmlEntities(content);
            })
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();
          return transcript || null;
        }
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}

function decodeHtmlEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/\n/g, ' ');
}

async function extractFromPageScripts() {
  try {
    const scripts = document.getElementsByTagName('script');

    for (const script of scripts) {
      const text = script.textContent || '';

      if (text.includes('captionTracks')) {
        const baseUrlMatch = text.match(/"baseUrl"\s*:\s*"([^"]+)"/);
        if (baseUrlMatch) {
          let url = baseUrlMatch[1];
          url = url.replace(/\\u0026/g, '&').replace(/\\\//g, '/');

          if (url.includes('timedtext')) {
            return await fetchCaptionContent(url);
          }
        }
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}
