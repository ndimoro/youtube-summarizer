// Anthropic API utility functions

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const MODEL = 'claude-sonnet-4-20250514';

/**
 * Call the Anthropic API to analyze a transcript
 * @param {string} transcript - The video transcript to analyze
 * @param {string} apiKey - The Anthropic API key
 * @returns {Promise<Object>} Analysis results with summary, revelations, and takeaways
 */
async function analyzeTranscript(transcript, apiKey) {
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

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `API request failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // Extract text from Claude's response
  const textContent = data.content[0].text;

  // Parse JSON from response
  return parseAnalysisResponse(textContent);
}

/**
 * Parse the AI's response and extract structured data
 * @param {string} textContent - The raw text response from the AI
 * @returns {Object} Parsed analysis with summary, revelations, and takeaways
 */
function parseAnalysisResponse(textContent) {
  try {
    // Try to extract JSON from markdown code blocks if present
    let jsonText = textContent;
    const jsonMatch = textContent.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1];
    } else {
      // Try to find JSON object in the text
      const objectMatch = textContent.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        jsonText = objectMatch[0];
      }
    }

    const parsed = JSON.parse(jsonText);

    return {
      summary: parsed.summary || textContent,
      revelations: parsed.revelations || [],
      takeaways: parsed.takeaways || []
    };
  } catch (parseError) {
    console.error('Failed to parse JSON response:', parseError);
    // Fallback: return raw text as summary
    return {
      summary: textContent,
      revelations: [],
      takeaways: []
    };
  }
}

// Export functions if using modules (not needed for Chrome extension)
// export { analyzeTranscript, parseAnalysisResponse };
