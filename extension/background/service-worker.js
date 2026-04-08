// Background service worker for YouTube Summarizer extension

// Provider configurations
const PROVIDERS = {
  anthropic: {
    name: 'Anthropic',
    endpoint: 'https://api.anthropic.com/v1/messages',
    model: 'claude-sonnet-4-5-20250929',
    supportsStreaming: true
  },
  openai: {
    name: 'OpenAI',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini',
    supportsStreaming: true
  },
  google: {
    name: 'Google',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
    model: 'gemini-2.0-flash',
    supportsStreaming: true
  }
};

// Listen for extension installation
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    chrome.tabs.create({ url: 'onboarding/onboarding.html' });
  } else if (details.reason === 'update') {
    await migrateStorageKeys();
  }
});

// Migration function for existing users
async function migrateStorageKeys() {
  try {
    const result = await chrome.storage.sync.get(['anthropicApiKey', 'apiKey', 'aiProvider']);

    if (result.anthropicApiKey && !result.apiKey) {
      await chrome.storage.sync.set({
        apiKey: result.anthropicApiKey,
        aiProvider: 'anthropic'
      });
      await chrome.storage.sync.remove(['anthropicApiKey']);
    }
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

// Store for active analysis operations
const activeAnalyses = new Map();

// Message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startAnalysis') {
    handleStartAnalysis(request.videoId, request.tabId)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }

  if (request.action === 'getAnalysisStatus') {
    getAnalysisStatus(request.videoId)
      .then(status => sendResponse(status))
      .catch(error => sendResponse({ status: 'error', error: error.message }));
    return true;
  }
});

// === Transcript fetching via webRequest capture ===
// YouTube now requires PO (Proof of Origin) tokens for timedtext/caption requests.
// The PO token is generated dynamically by YouTube's BotGuard and is included
// in the player's caption requests. We capture these authenticated URLs via
// chrome.webRequest and re-fetch them from the background service worker.

// Store captured timedtext URLs keyed by videoId
const capturedTimedtextUrls = new Map();

// Listen for timedtext requests made by YouTube's player
chrome.webRequest.onCompleted.addListener(
  (details) => {
    if (details.statusCode === 200) {
      const url = new URL(details.url);
      const videoId = url.searchParams.get('v');
      if (videoId) {
        // Store the URL, preferring English tracks
        const lang = url.searchParams.get('lang') || '';
        const existing = capturedTimedtextUrls.get(videoId);
        if (!existing || lang === 'en' || (!existing.lang?.startsWith('en') && lang.startsWith('en'))) {
          capturedTimedtextUrls.set(videoId, {
            url: details.url,
            lang,
            capturedAt: Date.now()
          });
        }
      }
    }
  },
  { urls: ['https://www.youtube.com/api/timedtext*'] }
);

// Primary method: Use captured timedtext URL from webRequest
async function fetchTranscriptViaCapturedUrl(videoId) {
  const captured = capturedTimedtextUrls.get(videoId);
  if (!captured) return null;

  // Check if URL is expired (URLs typically expire after ~6 hours)
  const age = Date.now() - captured.capturedAt;
  if (age > 5 * 60 * 60 * 1000) {
    capturedTimedtextUrls.delete(videoId);
    return null;
  }

  // Ensure we're requesting JSON format
  let captionUrl = captured.url;
  if (!captionUrl.includes('fmt=json3')) {
    captionUrl = captionUrl.replace(/&fmt=[^&]*/, '') + '&fmt=json3';
  }

  return await fetchAndParseCaptions(captionUrl);
}

// Fallback method: Ask the content script to trigger caption loading,
// then wait for the webRequest listener to capture the URL
async function fetchTranscriptByTriggeringPlayer(videoId, tabId) {
  // Ask content script to trigger caption loading via the player API
  try {
    await chrome.tabs.sendMessage(tabId, { action: 'triggerCaptions' });
  } catch (e) {
    return null;
  }

  // Wait up to 8 seconds for the webRequest listener to capture a timedtext URL
  for (let i = 0; i < 16; i++) {
    await new Promise(r => setTimeout(r, 500));
    const captured = capturedTimedtextUrls.get(videoId);
    if (captured) {
      let captionUrl = captured.url;
      if (!captionUrl.includes('fmt=json3')) {
        captionUrl = captionUrl.replace(/&fmt=[^&]*/, '') + '&fmt=json3';
      }
      return await fetchAndParseCaptions(captionUrl);
    }
  }

  return null;
}

// Fallback method: Fetch transcript by scraping the watch page HTML anonymously
async function fetchTranscriptFromHtml(videoId) {
  const pageResponse = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    credentials: 'omit',
    headers: { 'Accept-Language': 'en-US,en;q=0.9' }
  });

  if (!pageResponse.ok) return null;

  const html = await pageResponse.text();
  if (html.includes('consent.youtube.com')) return null;

  // Extract ytInitialPlayerResponse using brace-matching
  const marker = 'var ytInitialPlayerResponse = ';
  const startIdx = html.indexOf(marker);
  if (startIdx === -1) return null;

  const jsonStart = startIdx + marker.length;
  let braceCount = 0;
  let jsonEnd = jsonStart;
  for (let i = jsonStart; i < html.length; i++) {
    if (html[i] === '{') braceCount++;
    else if (html[i] === '}') braceCount--;
    if (braceCount === 0) { jsonEnd = i + 1; break; }
  }

  let playerResponse;
  try { playerResponse = JSON.parse(html.substring(jsonStart, jsonEnd)); }
  catch (e) { return null; }

  if (playerResponse?.playabilityStatus?.status !== 'OK') return null;

  const captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
  if (!captionTracks || captionTracks.length === 0) return null;

  let track = captionTracks.find(t => t.languageCode === 'en' && t.kind !== 'asr');
  if (!track) track = captionTracks.find(t => t.languageCode === 'en');
  if (!track) track = captionTracks[0];
  if (!track?.baseUrl) return null;

  // Try fetching caption content (may fail if PO token required)
  const result = await fetchAndParseCaptions(track.baseUrl + '&fmt=json3');
  if (result) return result;

  // Try XML format as fallback
  return await fetchAndParseCaptions(track.baseUrl);
}

// Combined transcript fetching: tries all methods in order
async function fetchTranscriptInBackground(videoId, tabId) {
  // Method 1: Use already-captured timedtext URL (fastest)
  let transcript = await fetchTranscriptViaCapturedUrl(videoId);
  if (transcript) return transcript;

  // Method 2: Trigger player to load captions, then capture the URL
  if (tabId) {
    transcript = await fetchTranscriptByTriggeringPlayer(videoId, tabId);
    if (transcript) return transcript;
  }

  // Method 3: Anonymous HTML scraping fallback
  transcript = await fetchTranscriptFromHtml(videoId);
  if (transcript) return transcript;

  return null;
}

// Fetch a caption URL and parse the response into plain text
async function fetchAndParseCaptions(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const text = await response.text();
    if (!text || text.length === 0) return null;

    // Try JSON format (json3)
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
          if (transcript) return transcript;
        }
      } catch (e) { /* fall through */ }
    }

    // Try XML format
    if (text.includes('<text')) {
      const matches = text.match(/<text[^>]*>([^<]*)<\/text>/g);
      if (matches) {
        const transcript = matches
          .map(match => {
            const content = match.replace(/<text[^>]*>/, '').replace(/<\/text>/, '');
            return content
              .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
              .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
              .replace(/\n/g, ' ');
          })
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
        if (transcript) return transcript;
      }
    }

    return null;
  } catch (e) {
    return null;
  }
}

async function handleStartAnalysis(videoId, tabId) {
  // Check if already analyzing this video
  if (activeAnalyses.has(videoId)) {
    return { success: true, status: 'already_running' };
  }

  // Mark as in progress
  activeAnalyses.set(videoId, { status: 'running', startedAt: Date.now() });
  await updateAnalysisState(videoId, { status: 'running', progress: 'Starting analysis...' });

  // Run analysis in background (don't await - let it run independently)
  runAnalysis(videoId, tabId);

  return { success: true, status: 'started' };
}

async function runAnalysis(videoId, tabId) {
  try {
    // Update progress
    await updateAnalysisState(videoId, { status: 'running', progress: 'Fetching transcript...' });

    // Get provider and API key
    const { aiProvider, apiKey } = await chrome.storage.sync.get(['aiProvider', 'apiKey']);
    const provider = aiProvider || 'anthropic';

    if (!apiKey) {
      throw new Error('No API key configured');
    }

    const providerConfig = PROVIDERS[provider];
    if (!providerConfig) {
      throw new Error(`Unknown provider: ${provider}`);
    }

    // Ensure content script is injected
    try {
      await chrome.tabs.sendMessage(tabId, { action: 'ping' });
    } catch (connectionError) {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content/content.js']
      });
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Fetch transcript via background (captures YouTube's authenticated caption URLs)
    let transcript = null;
    try {
      transcript = await fetchTranscriptInBackground(videoId, tabId);
    } catch (bgError) {
      console.log('Background transcript fetch failed:', bgError.message);
    }

    // Get metadata and fallback transcript from content script
    let contentResponse;
    try {
      contentResponse = await chrome.tabs.sendMessage(tabId, { action: 'getTranscript' });
    } catch (e) {
      contentResponse = { success: false };
    }

    // Fall back to content script transcript if background fetch failed
    if (!transcript && contentResponse?.success && contentResponse.transcript) {
      transcript = contentResponse.transcript;
    }

    if (!transcript || transcript.trim().length === 0) {
      throw new Error(contentResponse?.error || 'No transcript available for this video');
    }

    const videoTitle = contentResponse?.videoTitle || 'YouTube Video';
    const metadata = contentResponse?.metadata || {};

    // Update progress
    await updateAnalysisState(videoId, {
      status: 'running',
      progress: `Analyzing with ${providerConfig.name}...`,
      videoTitle,
      metadata
    });

    // Call AI API with streaming
    const analysis = await analyzeTranscriptStreaming(videoId, transcript, apiKey, provider, providerConfig);

    // Save completed analysis with metadata
    const finalResult = {
      status: 'completed',
      videoTitle,
      videoId,
      metadata: metadata || {},
      summary: analysis.summary,
      revelations: analysis.revelations,
      takeaways: analysis.takeaways,
      completedAt: Date.now()
    };

    await saveAnalysis(videoId, finalResult);
    activeAnalyses.delete(videoId);

  } catch (error) {
    console.error('Analysis error:', error);
    await updateAnalysisState(videoId, {
      status: 'error',
      error: error.message
    });
    activeAnalyses.delete(videoId);
  }
}

async function analyzeTranscriptStreaming(videoId, transcript, apiKey, provider, providerConfig) {
  const prompt = `You are analyzing a YouTube video transcript to extract the most valuable insights. Please provide:

1. A concise summary (2-3 paragraphs) explaining what the video is about and its main thesis
2. Key Revelations - the most important, surprising, or actionable insights that viewers shouldn't miss. These are the transformative gems that make the video worth watching
3. Main Takeaways - 3-5 bullet points for quick reference

Transcript:
${transcript}

Please respond with a JSON object in this exact format:
{
  "summary": "A 2-3 paragraph summary...",
  "revelations": [
    "First key revelation...",
    "Second key revelation...",
    "Third key revelation..."
  ],
  "takeaways": [
    "First takeaway...",
    "Second takeaway...",
    "Third takeaway..."
  ]
}`;

  let response;
  let fullText = '';

  if (provider === 'anthropic') {
    fullText = await streamAnthropic(videoId, prompt, apiKey, providerConfig);
  } else if (provider === 'openai') {
    fullText = await streamOpenAI(videoId, prompt, apiKey, providerConfig);
  } else if (provider === 'google') {
    fullText = await streamGoogle(videoId, prompt, apiKey, providerConfig);
  } else {
    throw new Error(`Unsupported provider: ${provider}`);
  }

  // Final streaming text update
  await updateAnalysisState(videoId, {
    status: 'running',
    progress: 'Finalizing...',
    streamingText: cleanStreamingText(fullText)
  });

  return parseAnalysisResponse(fullText);
}

// Request timeout (5 minutes)
const REQUEST_TIMEOUT_MS = 300000;

// Anthropic Claude API streaming
async function streamAnthropic(videoId, prompt, apiKey, config) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: 2048,
        stream: true,
        messages: [{ role: 'user', content: prompt }]
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Anthropic API request failed: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';
    let lastUpdate = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const event = JSON.parse(data);
            if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
              fullText += event.delta.text;

              const now = Date.now();
              if (now - lastUpdate > 500) {
                lastUpdate = now;
                await updateAnalysisState(videoId, {
                  status: 'running',
                  progress: 'Generating analysis...',
                  streamingText: cleanStreamingText(fullText)
                });
              }
            }
          } catch (e) {
            // Skip malformed JSON
          }
        }
      }
    }

    return fullText;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

// OpenAI GPT API streaming
async function streamOpenAI(videoId, prompt, apiKey, config) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: 2048,
        stream: true,
        messages: [{ role: 'user', content: prompt }]
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `OpenAI API request failed: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';
    let lastUpdate = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const event = JSON.parse(data);
            const content = event.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;

              const now = Date.now();
              if (now - lastUpdate > 500) {
                lastUpdate = now;
                await updateAnalysisState(videoId, {
                  status: 'running',
                  progress: 'Generating analysis...',
                  streamingText: cleanStreamingText(fullText)
                });
              }
            }
          } catch (e) {
            // Skip malformed JSON
          }
        }
      }
    }

    return fullText;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Google Gemini API streaming
async function streamGoogle(videoId, prompt, apiKey, config) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const url = `${config.endpoint}/${config.model}:streamGenerateContent?key=${apiKey}&alt=sse`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          maxOutputTokens: 2048
        }
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Google API request failed: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';
    let lastUpdate = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);

          try {
            const event = JSON.parse(data);
            const text = event.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              fullText += text;

              const now = Date.now();
              if (now - lastUpdate > 500) {
                lastUpdate = now;
                await updateAnalysisState(videoId, {
                  status: 'running',
                  progress: 'Generating analysis...',
                  streamingText: cleanStreamingText(fullText)
                });
              }
            }
          } catch (e) {
            // Skip malformed JSON
          }
        }
      }
    }

    return fullText;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Clean streaming text to remove JSON structure for display
function cleanStreamingText(rawText) {
  if (!rawText || rawText.trim().length === 0) {
    return '';
  }

  let cleaned = rawText;

  // Remove markdown code block markers
  cleaned = cleaned.replace(/```json\s*/g, '');
  cleaned = cleaned.replace(/```\s*/g, '');

  // Remove opening brace and initial JSON structure
  cleaned = cleaned.replace(/^\s*\{\s*/, '');

  // Remove JSON keys (e.g., "summary":, "revelations":, "takeaways":)
  cleaned = cleaned.replace(/"(summary|revelations|takeaways)"\s*:\s*/gi, '\n');

  // Remove array brackets
  cleaned = cleaned.replace(/\[\s*/g, '');
  cleaned = cleaned.replace(/\s*\]/g, '');

  // Remove trailing commas and braces
  cleaned = cleaned.replace(/,\s*$/g, '');
  cleaned = cleaned.replace(/\}\s*$/g, '');

  // Handle quoted strings - remove surrounding quotes but keep content
  // Match complete quoted strings and extract content
  cleaned = cleaned.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/g, '$1');

  // Unescape common escape sequences
  cleaned = cleaned.replace(/\\n/g, '\n');
  cleaned = cleaned.replace(/\\"/g, '"');
  cleaned = cleaned.replace(/\\\\/g, '\\');

  // Clean up excessive whitespace and commas between items
  cleaned = cleaned.replace(/,\s*,/g, ',');
  cleaned = cleaned.replace(/\n\s*,\s*/g, '\n');
  cleaned = cleaned.replace(/,\s*\n/g, '\n');

  // Clean up multiple newlines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  // Trim whitespace
  cleaned = cleaned.trim();

  return cleaned;
}

function parseAnalysisResponse(textContent) {
  // First, try standard JSON parsing
  try {
    let jsonText = textContent;
    const jsonMatch = textContent.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1];
    } else {
      const objectMatch = textContent.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        jsonText = objectMatch[0];
      }
    }

    const parsed = JSON.parse(jsonText);

    return {
      summary: parsed.summary || '',
      revelations: Array.isArray(parsed.revelations) ? parsed.revelations : [],
      takeaways: Array.isArray(parsed.takeaways) ? parsed.takeaways : []
    };
  } catch (parseError) {
    return extractFieldsWithRegex(textContent);
  }
}

/**
 * Extract summary, revelations, and takeaways using regex when JSON parsing fails
 */
function extractFieldsWithRegex(text) {
  const result = {
    summary: '',
    revelations: [],
    takeaways: []
  };

  try {
    // Extract summary - look for "summary": "..." pattern
    const summaryMatch = text.match(/"summary"\s*:\s*"((?:[^"\\]|\\.)*)"/s);
    if (summaryMatch) {
      result.summary = unescapeJsonString(summaryMatch[1]);
    }

    // Extract revelations array
    const revelationsMatch = text.match(/"revelations"\s*:\s*\[([\s\S]*?)\]/);
    if (revelationsMatch) {
      const revelationsContent = revelationsMatch[1];
      const items = revelationsContent.match(/"((?:[^"\\]|\\.)*)"/g);
      if (items) {
        result.revelations = items.map(item => unescapeJsonString(item.slice(1, -1)));
      }
    }

    // Extract takeaways array
    const takeawaysMatch = text.match(/"takeaways"\s*:\s*\[([\s\S]*?)\]/);
    if (takeawaysMatch) {
      const takeawaysContent = takeawaysMatch[1];
      const items = takeawaysContent.match(/"((?:[^"\\]|\\.)*)"/g);
      if (items) {
        result.takeaways = items.map(item => unescapeJsonString(item.slice(1, -1)));
      }
    }

    if (!result.summary) {
      result.summary = cleanRawText(text);
    }
  } catch (regexError) {
    result.summary = cleanRawText(text);
  }

  return result;
}

/**
 * Unescape JSON string escape sequences
 */
function unescapeJsonString(str) {
  if (!str) return '';
  return str
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');
}

/**
 * Clean raw text for display when all parsing fails
 */
function cleanRawText(text) {
  return text
    .replace(/```json\s*/g, '')
    .replace(/```\s*/g, '')
    .replace(/^\s*\{\s*/, '')
    .replace(/\s*\}\s*$/, '')
    .replace(/"(summary|revelations|takeaways)"\s*:\s*/gi, '\n')
    .replace(/[\[\]]/g, '')
    .replace(/",\s*"/g, '\n')
    .replace(/^"|"$/g, '')
    .replace(/\\n/g, '\n')
    .replace(/\\"/g, '"')
    .trim();
}

async function updateAnalysisState(videoId, state) {
  const key = `analysis_state_${videoId}`;
  await chrome.storage.local.set({ [key]: { ...state, updatedAt: Date.now() } });
}

async function saveAnalysis(videoId, analysis) {
  const stateKey = `analysis_state_${videoId}`;
  const cacheKey = `analysis_${videoId}`;

  await chrome.storage.local.set({
    [stateKey]: { status: 'completed', updatedAt: Date.now() },
    [cacheKey]: { ...analysis, cachedAt: Date.now() }
  });
}

async function getAnalysisStatus(videoId) {
  const stateKey = `analysis_state_${videoId}`;
  const cacheKey = `analysis_${videoId}`;

  const result = await chrome.storage.local.get([stateKey, cacheKey]);
  const state = result[stateKey];
  const cached = result[cacheKey];

  if (cached && cached.status === 'completed') {
    return { status: 'completed', data: cached };
  }

  if (state) {
    return state;
  }

  return { status: 'none' };
}
