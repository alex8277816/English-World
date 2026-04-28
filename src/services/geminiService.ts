// src/services/geminiService.ts

async function callAIProxy(params: { model: string, contents: string | any, config?: any }) {
  try {
    const response = await fetch("/api/ai/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      let errorMessage = "AI Request failed";
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.details || errorMessage;
        if (errorData.suggestion) errorMessage += ` (${errorData.suggestion})`;
      } catch (e) {
        errorMessage = `HTTP Error ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data;
  } catch (err: any) {
    console.error("Fetch/Proxy Error:", err);
    throw err;
  }
}

/**
 * Helper to extract and parse JSON from AI response text
 * Handles markdown code blocks if the model includes them
 */
function safeParseAIJson(text: string) {
  if (!text) return {};
  try {
    // 1. Try direct parse
    return JSON.parse(text);
  } catch (e) {
    try {
      // 2. Try removing markdown markers
      const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
      return JSON.parse(cleaned);
    } catch (e2) {
      console.error("Failed to parse AI JSON. Raw text:", text);
      return {};
    }
  }
}

export async function getWordEntries(input: string) {
  try {
    const data = await callAIProxy({
      model: "gemini-1.5-flash",
      contents: [{
        role: 'user',
        parts: [{
          text: `Analyze the following input. 
          1. If the input is a single sentence or specific word/phrase, use it EXACTLY as the 'text'. Do NOT break it down into smaller words.
          2. If the input is a list (e.g. separated by commas or lines), treat each item as a separate 'text' entry.
          3. For each entry, provide its primary meaning in Traditional Chinese (Taiwan繁體中文), 1-2 example sentences, synonyms, and antonyms if applicable.
          Input: "${input}"`
        }]
      }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            title: { type: "string" },
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  text: { type: "string" },
                  meaning: { type: "string" },
                  exampleSentences: { type: "array", items: { type: "string" } },
                  synonyms: { type: "array", items: { type: "string" } },
                  antonyms: { type: "array", items: { type: "string" } }
                },
                required: ["text", "meaning"]
              }
            }
          },
          required: ["items"]
        }
      }
    });
    return safeParseAIJson(data.text);
  } catch (e: any) {
    console.error("AI Proxy error", e);
    // Explicitly alert the user on Vercel if it fails
    if (window.location.hostname !== 'localhost') {
      console.error("CRITICAL: AI identification failed on production. Error:", e.message);
    }
    return { items: [] };
  }
}

export async function getSingleWordDetails(word: string) {
  try {
    const data = await callAIProxy({
      model: "gemini-1.5-flash",
      contents: [{
        role: 'user',
        parts: [{
          text: `Provide details for the English word/phrase: "${word}". Include meaning in Traditional Chinese (Taiwan繁體中文), 1-2 example sentences, synonyms, and antonyms.`
        }]
      }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            meaning: { type: "string" },
            exampleSentences: { type: "array", items: { type: "string" } },
            synonyms: { type: "array", items: { type: "string" } },
            antonyms: { type: "array", items: { type: "string" } }
          },
          required: ["meaning"]
        }
      }
    });
    return safeParseAIJson(data.text);
  } catch (e) {
    console.error("AI details error", e);
    return null;
  }
}

export async function analyzeArticle(content: string) {
  try {
    const data = await callAIProxy({
      model: "gemini-1.5-flash",
      contents: [{
        role: 'user',
        parts: [{
          text: `Analyze the following English article and extract useful vocabulary, phrases, and key sentences for learning.
          For each extracted item, provide:
          1. The text (English).
          2. Primary meaning in Traditional Chinese (Taiwan繁體中文).
          3. 1 example sentence from the article or a fresh one.
          
          Article Content: "${content}"`
        }]
      }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            title: { type: "string" },
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  text: { type: "string" },
                  meaning: { type: "string" },
                  exampleSentences: { type: "array", items: { type: "string" } },
                  synonyms: { type: "array", items: { type: "string" } },
                  antonyms: { type: "array", items: { type: "string" } }
                },
                required: ["text", "meaning"]
              }
            }
          },
          required: ["title", "items"]
        }
      }
    });
    return safeParseAIJson(data.text);
  } catch (e) {
    console.error("Article AI Proxy error", e);
    return { title: "英文文章閱讀", items: [] };
  }
}

export async function analyzeGrammar(content: string) {
  try {
    const data = await callAIProxy({
      model: "gemini-1.5-flash",
      contents: [{
        role: 'user',
        parts: [{
          text: `Analyze the English grammar structures in the provided content. 
          Content to analyze: "${content}"
          Instructions:
          1. Provide a professional title for this grammar analysis (in Traditional Chinese 繁體中文).
          2. Provide a thorough, educational summary of the primary grammar structures and patterns used in the text (in Traditional Chinese 繁體中文).
          3. Extract 3-5 specific sentences as 'items' that demonstrate representative or complex grammar points.
          4. For each item provide: sentence, explanation, structure, and 2 practice examples.`
        }]
      }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            title: { type: "string" },
            analysis: { type: "string" },
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  sentence: { type: "string" },
                  explanation: { type: "string" },
                  structure: { type: "string" },
                  exampleSentences: { type: "array", items: { type: "string" } }
                },
                required: ["sentence", "explanation", "structure", "exampleSentences"]
              }
            }
          },
          required: ["title", "analysis", "items"]
        }
      }
    });
    return safeParseAIJson(data.text);
  } catch (e) {
    console.error("Grammar AI Proxy error", e);
    return { title: "文法分析", analysis: "無法分析文法內容", items: [] };
  }
}
