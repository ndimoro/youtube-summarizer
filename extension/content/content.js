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

  if (request.action === 'ping') {
    sendResponse({ success: true });
    return;
  }

  if (request.action === 'triggerCaptions') {
    // Trigger YouTube's player to load captions, which generates an authenticated
    // timedtext request that the background service worker can capture via webRequest
    triggerCaptionLoading()
      .then(() => sendResponse({ success: true }))
      .catch(() => sendResponse({ success: false }));
    return true;
  }
});

async function triggerCaptionLoading() {
  // Inject into the page's main world to access YouTube's player API
  const script = document.createElement('script');
  script.textContent = `
    (function() {
      try {
        var player = document.getElementById('movie_player');
        if (player && player.loadModule) {
          player.loadModule('captions');
          // Try to set an English caption track
          var tracks = player.getPlayerResponse &&
            player.getPlayerResponse()?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
          if (tracks && tracks.length > 0) {
            var enTrack = tracks.find(function(t) { return t.languageCode === 'en'; }) || tracks[0];
            player.setOption('captions', 'track', { languageCode: enTrack.languageCode });
          }
        }
      } catch(e) {}
    })();
  `;
  document.documentElement.appendChild(script);
  script.remove();

  // Wait a moment for the request to be made
  await new Promise(resolve => setTimeout(resolve, 2000));
}

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

  // Method 1: Try extracting from ytInitialPlayerResponse (available in page context)
  const transcriptFromPlayerResponse = await extractFromPlayerResponse();
  if (transcriptFromPlayerResponse) return transcriptFromPlayerResponse;

  // Method 2: Try Innertube API (may fail due to PO token requirements)
  const transcriptFromApi = await fetchTranscriptViaInnertubeApi(videoId);
  if (transcriptFromApi) return transcriptFromApi;

  // Method 3: Try extracting caption URLs from page scripts
  const transcriptFromPage = await extractFromPageScripts();
  if (transcriptFromPage) return transcriptFromPage;

  return null;
}

async function extractFromPlayerResponse() {
  try {
    // Access ytInitialPlayerResponse from the page's main world
    // Content scripts run in an isolated world, so we need to inject a script
    // to read the variable and pass it back
    const captionData = await new Promise((resolve) => {
      const script = document.createElement('script');
      script.textContent = `
        (function() {
          try {
            const tracks = window.ytInitialPlayerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
            if (tracks && tracks.length > 0) {
              let track = tracks.find(t => t.languageCode === 'en' && t.kind !== 'asr');
              if (!track) track = tracks.find(t => t.languageCode === 'en');
              if (!track) track = tracks[0];
              if (track?.baseUrl) {
                document.dispatchEvent(new CustomEvent('__yt_caption_data', {
                  detail: { baseUrl: track.baseUrl }
                }));
                return;
              }
            }
          } catch(e) {}
          document.dispatchEvent(new CustomEvent('__yt_caption_data', { detail: null }));
        })();
      `;

      const handler = (event) => {
        document.removeEventListener('__yt_caption_data', handler);
        resolve(event.detail);
      };
      document.addEventListener('__yt_caption_data', handler);

      document.documentElement.appendChild(script);
      script.remove();

      // Timeout after 1 second
      setTimeout(() => {
        document.removeEventListener('__yt_caption_data', handler);
        resolve(null);
      }, 1000);
    });

    if (!captionData?.baseUrl) return null;

    return await fetchCaptionContent(captionData.baseUrl);
  } catch (error) {
    return null;
  }
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
        // Find ALL baseUrl matches and pick one that contains 'timedtext'
        const allMatches = [...text.matchAll(/"baseUrl"\s*:\s*"([^"]+)"/g)];
        for (const match of allMatches) {
          let url = match[1];
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
