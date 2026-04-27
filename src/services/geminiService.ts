import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function getWordEntries(input: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analyze the following input. 
    1. If the input is a single sentence or specific word/phrase, use it EXACTLY as the 'text'. Do NOT break it down into smaller words.
    2. If the input is a list (e.g. separated by commas or lines), treat each item as a separate 'text' entry.
    3. For each entry, provide its primary meaning in Traditional Chinese (Taiwan繁體中文), 1-2 example sentences, synonyms, and antonyms if applicable.
    Input: "${input}"`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "A descriptive title for this group of words (in Traditional Chinese)" },
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING, description: "The English word or phrase" },
                meaning: { type: Type.STRING, description: "Traditional Chinese (Taiwan) meaning" },
                exampleSentences: { type: Type.ARRAY, items: { type: Type.STRING } },
                synonyms: { type: Type.ARRAY, items: { type: Type.STRING } },
                antonyms: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["text", "meaning"]
            }
          }
        },
        required: ["items"]
      }
    }
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("AI parse error", e);
    return { items: [] };
  }
}

export async function getSingleWordDetails(word: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Provide details for the English word/phrase: "${word}". Include meaning in Traditional Chinese (Taiwan繁體中文), 1-2 example sentences, synonyms, and antonyms.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          meaning: { type: Type.STRING },
          exampleSentences: { type: Type.ARRAY, items: { type: Type.STRING } },
          synonyms: { type: Type.ARRAY, items: { type: Type.STRING } },
          antonyms: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["meaning"]
      }
    }
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("AI details error", e);
    return null;
  }
}

export async function analyzeArticle(content: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analyze the following English article and extract useful vocabulary, phrases, and key sentences for learning.
    For each extracted item, provide:
    1. The text (English).
    2. Primary meaning in Traditional Chinese (Taiwan繁體中文).
    3. 1 example sentence from the article or a fresh one.
    
    Article Content: "${content}"`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "A suitable title for the article (in Traditional Chinese)" },
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING, description: "The English word, phrase, or sentence" },
                meaning: { type: Type.STRING, description: "Traditional Chinese (Taiwan) meaning" },
                exampleSentences: { type: Type.ARRAY, items: { type: Type.STRING } },
                synonyms: { type: Type.ARRAY, items: { type: Type.STRING } },
                antonyms: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["text", "meaning"]
            }
          }
        },
        required: ["title", "items"]
      }
    }
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Article AI parse error", e);
    return { title: "英文文章閱讀", items: [] };
  }
}

export async function analyzeGrammar(content: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analyze the English grammar structures in the provided content. 
    Content to analyze: "${content}"
    
    Instructions:
    1. Provide a professional title for this grammar analysis (in Traditional Chinese 繁體中文).
    2. Provide a thorough, educational summary of the primary grammar structures and patterns used in the text (in Traditional Chinese 繁體中文). Focus on things like tense, clause structure, and key grammatical features.
    3. Extract 3-5 specific sentences as 'items' that demonstrate representative or complex grammar points.
    4. For each item:
       - 'sentence': The exact English sentence from the content.
       - 'explanation': A detailed explanation of why this sentence is grammatically interesting or how its structure works (in Traditional Chinese 繁體中文).
       - 'structure': The name of the primary grammar pattern (e.g., "Relative Clause", "Passive Voice", "Conditionals").
       - 'exampleSentences': 2 fresh, original example sentences using the SAME grammatical structure to help the user practice.
    
    If the content is very short, you may provide fewer items, but still provide as much analysis as possible.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          analysis: { type: Type.STRING },
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                sentence: { type: Type.STRING },
                explanation: { type: Type.STRING },
                structure: { type: Type.STRING },
                exampleSentences: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["sentence", "explanation", "structure", "exampleSentences"]
            }
          }
        },
        required: ["title", "analysis", "items"]
      }
    }
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Grammar AI parse error", e);
    return { title: "文法分析", analysis: "無法分析文法內容", items: [] };
  }
}
